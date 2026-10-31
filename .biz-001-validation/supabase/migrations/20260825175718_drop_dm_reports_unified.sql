-- Onda H — Task 1: elimina a fila de denuncias de DM sem consumidor.
-- As linhas legadas entram na fila unificada antes do drop, na mesma
-- transacao, e a conta de prestador ganha somente a denuncia de mensagem
-- prevista no ADR-20260820-conta-de-prestador.

begin;

insert into public.reports (
  reporter_user_id,
  target_type,
  target_id,
  reason,
  status,
  created_at
)
select
  r.reporter_user_id,
  'message',
  r.message_id,
  r.reason,
  'open',
  r.created_at
from public.dm_reports r
on conflict do nothing;

-- Destrutivo e deliberado: se a copia acima falhar, a transacao impede o drop.
drop table public.dm_reports;

drop policy reports_insert_authenticated on public.reports;

create policy reports_insert_authenticated
on public.reports
for insert
to authenticated
with check (
  reporter_user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.locality_memberships
      where user_id = (select auth.uid())
    )
    or (
      private.is_provider_account((select auth.uid()))
      and target_type = 'message'
    )
  )
);

commit;
