-- RUN-004 rodada 2, item 7 — o prazo de 30 dias do rascunho é aplicado por job.
--
-- O GET também descarta a linha vencida, mas quem nunca volta ao app precisa que
-- o job a apague. O teste prova o positivo (31 dias sai), o negativo (29 dias
-- fica) e o agendamento diário.

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc

insert into public.entry_progress (user_id, versao, etapa, estado, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 2, 'cidade', '{}'::jsonb, now() - interval '31 days'),
  ('10000000-0000-4000-8000-000000000002', 2, 'cidade', '{}'::jsonb, now() - interval '29 days');

select is(
  (select count(*) from public.entry_progress where user_id = '10000000-0000-4000-8000-000000000001'),
  1::bigint,
  'o rascunho de 31 dias existe antes da limpeza'
);

select is(
  private.purge_abandoned_entry_progress(),
  1::bigint,
  'a limpeza apaga só o rascunho vencido'
);

select is(
  (select count(*) from public.entry_progress where user_id = '10000000-0000-4000-8000-000000000001'),
  0::bigint,
  'o rascunho de 31 dias saiu'
);

select is(
  (select count(*) from public.entry_progress where user_id = '10000000-0000-4000-8000-000000000002'),
  1::bigint,
  'o rascunho de 29 dias ficou'
);

select ok(
  exists (
    select 1 from cron.job
     where jobname = 'bivaque-entry-progress-purge'
       and command like '%purge_abandoned_entry_progress%'
  ),
  'o job diário do rascunho abandonado está agendado'
);

select * from finish();
rollback;
