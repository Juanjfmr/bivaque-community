-- PORT-004 (lote 4, frente B): a preferência "Avise-me quando liberar" da
-- análise pendente de elegibilidade.
--
-- Uma linha por pessoa, do próprio dono. O pedido NÃO dispara envio nenhum: a
-- decisão da análise já avisa e manda e-mail; esta tabela só registra que a
-- pessoa quer ser avisada quando liberar. `requested_at` é o primeiro pedido —
-- pedir de novo não sobrescreve (o upsert da aplicação ignora o conflito).
--
-- RLS habilitada e forçada, grants mínimos, e as três policies de dono
-- (select/insert/update). Nenhum outro membro lê a linha, e nem o operador: é
-- preferência pessoal, não fila de trabalho. O cliente de serviço só entra
-- para leitura eventual de operação — a escrita da tela usa a sessão da pessoa,
-- que é o caminho provado em supabase/tests/onboarding-release-notices.sql.

create table public.onboarding_release_notices (
  user_id uuid primary key references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now()
);

alter table public.onboarding_release_notices enable row level security;
alter table public.onboarding_release_notices force row level security;

revoke all on table public.onboarding_release_notices from anon, authenticated;

grant select, insert, update on table public.onboarding_release_notices to authenticated;
grant select, insert, update, delete on table public.onboarding_release_notices to service_role;

create policy onboarding_release_notices_select_own
on public.onboarding_release_notices
for select
to authenticated
using (user_id = (select auth.uid()));

create policy onboarding_release_notices_insert_own
on public.onboarding_release_notices
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy onboarding_release_notices_update_own
on public.onboarding_release_notices
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
