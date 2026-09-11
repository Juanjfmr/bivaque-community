-- R3-1: o estado de suspensão sai da exposição do Data API.
--
-- Card BLOCK-SUSPENSION-EXPOSURE (Launch blocker, sourceRevision 15a884d).
-- is_suspended vivia em public.profiles, cuja policy de SELECT libera a LINHA
-- INTEIRA a quem compartilha localidade ou comunidade. RLS é por linha, não por
-- coluna: qualquer membro autenticado lia o status de suspensão de terceiros
-- pela Data API — GET /rest/v1/profiles?select=user_id,is_suspended devolvia
-- {"is_suspended":true}. Medido em 10/09/2026 no stack local.
--
-- Decisão do dono (2026-09-10), ADR-20260910-suspensao-fora-da-exposicao:
-- tabela própria com RLS owner-only, no padrão de public.profile_affiliations.
-- A coluna sai de profiles; o veto de publicação é preservado porque as cinco
-- policies de INSERT chamam public.is_account_suspended(auth.uid()) por nome e
-- o contrato da função não muda (mesma assinatura, mesma autoleitura).
--
-- As policies de INSERT NÃO são recriadas aqui de propósito: elas referenciam a
-- função, não a coluna. Reescrevê-las à mão duplicaria o resultado de
-- 20260905152703_fix_posts_insert_write_scope (que corrigiu o escopo de escrita
-- dos posts) e reintroduziria o risco que aquele commit fechou. O veto é
-- provado no pgTAP profile-suspensions.sql.

-- 1) Tabela própria. Linha presente = conta suspensa.
create table public.profile_suspensions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.profile_suspensions enable row level security;
alter table public.profile_suspensions force row level security;

-- Ninguém escreve o próprio estado de suspensão: conceder INSERT/UPDATE ao
-- authenticated permitiria à conta suspensa se reabilitar. Escrita é só
-- service_role (operação); o dono apenas lê a sua linha.
revoke all on table public.profile_suspensions from anon, authenticated;
grant select on table public.profile_suspensions to authenticated;
grant select, insert, update, delete on table public.profile_suspensions to service_role;

create policy profile_suspensions_select_own
on public.profile_suspensions
for select
to authenticated
using (user_id = (select auth.uid()));

-- 2) Migra o dado existente ANTES de derrubar a coluna.
insert into public.profile_suspensions (user_id)
select user_id from public.profiles where is_suspended = true
on conflict (user_id) do nothing;

-- 3) O helper passa a ler a tabela nova. Interface idêntica; a guarda de
-- autoleitura (anti-enumeração §4.3, de 3acaadd) é preservada: terceiro recebe
-- false, nunca a verdade.
create or replace function public.is_account_suspended(p_user_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select p_user_id = (select auth.uid())
     and exists (
       select 1 from public.profile_suspensions where user_id = p_user_id
     );
$$;

-- Grants incondicionais e idempotentes. O bloco condicional antigo nunca rodava
-- (a função já existia naquele ponto), deixando o EXECUTE default para PUBLIC —
-- anon enumerava o status sem autenticar. Não repetir o erro.
revoke all on function public.is_account_suspended(uuid) from public;
grant execute on function public.is_account_suspended(uuid) to authenticated;

-- 4) Fecha a exposição: índice e coluna saem de public.profiles.
drop index if exists public.profiles_suspended_true_idx;
alter table public.profiles drop column if exists is_suspended;
