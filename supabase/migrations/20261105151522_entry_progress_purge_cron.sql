-- RUN-004 rodada 2, item 7 (M5 / auditoria M2) — o rascunho abandonado expira
-- de verdade, por job, não só na leitura.
--
-- O GET já descartava linha com mais de 30 dias, mas quem nunca volta ao app
-- deixava o dado parado. O job diário apaga a linha vencida; a leitura mantém a
-- mesma regra como defesa e agora falha com 503 se o delete da limpeza falhar.

begin;

create or replace function private.purge_abandoned_entry_progress()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with removidas as (
    delete from public.entry_progress
     where updated_at < now() - interval '30 days'
    returning 1
  )
  select count(*) from removidas;
$$;

comment on function private.purge_abandoned_entry_progress() is
  'Apaga rascunhos da entrada parados há mais de 30 dias. Chamada pelo job diário do pg_cron; service_role pode executar para prova manual.';

revoke all on function private.purge_abandoned_entry_progress() from public, anon, authenticated;
grant execute on function private.purge_abandoned_entry_progress() to service_role;

-- Reagendar de forma idempotente: uma migration reaplicada não cria job duplicado.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'bivaque-entry-progress-purge') then
    perform cron.unschedule('bivaque-entry-progress-purge');
  end if;
end
$$;

select cron.schedule(
  'bivaque-entry-progress-purge',
  '17 3 * * *',
  'select private.purge_abandoned_entry_progress()'
);

commit;
