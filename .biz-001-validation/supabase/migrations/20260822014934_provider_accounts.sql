-- Onda G — Task 1: a fronteira do prestador nasce antes da ficha
-- (docs/superpowers/plans/2026-08-20-onda-g-vitrine.md §Task 1)
--
-- Decisões executadas:
--   D17: prestador entra por indicação de membro aprovado da comunidade
--   D20: vitrine entra no piloto
--   D37: prestador é usuário do Auth com papel, sem membership
--        "sem membership nenhuma policy de conteúdo casa:
--         falha fechado por construção"
--   ADR-20260820-conta-de-prestador (accepted, critic_verdict: PASS)
--
-- Por que community_id e locality_id são NOT NULL: a comunidade é quem
-- atesta "é bom prestador" (§4.1); sem comunidade vinculada não há
-- atestador. A locality_id fica aqui também (em vez de só na community)
-- porque toda policy de leitura deste schema pergunta por
-- locality_memberships, e o prestador não tem — então a única forma de
-- resolver "este prestador é desta cidade" sem membership é carregar a
-- locality no próprio prestador.

create table public.provider_accounts (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete restrict,
  community_id uuid not null references public.communities (id) on delete cascade,
  locality_id uuid not null references public.localities (id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id)
);

create index provider_accounts_active_idx
  on public.provider_accounts (auth_user_id) where revoked_at is null;

create index provider_accounts_community_idx
  on public.provider_accounts (community_id) where revoked_at is null;

alter table public.provider_accounts enable row level security;
alter table public.provider_accounts force row level security;

revoke all on table public.provider_accounts from anon, authenticated;
grant select on table public.provider_accounts to authenticated;
grant select, insert, update on table public.provider_accounts to service_role;

-- O prestador enxerga a própria linha. Ninguém mais lê a lista: o roster
-- de prestadores de uma vila é informação de operação, não de membro —
-- mesmo motivo do 20260806100231_restrict_operator_roster.sql.
create policy provider_accounts_select_self
on public.provider_accounts
for select
to authenticated
using (auth_user_id = (select auth.uid()));

-- Espelha is_current_user_operator (20260806111744_is_current_user_operator.sql):
-- o chamador roda como service_role (que bypassa RLS), então auth.uid() é
-- NULL dentro da função e o id vem explícito.
create function public.is_provider_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_accounts
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;

revoke all on function public.is_provider_account(uuid) from public, anon, authenticated;
grant execute on function public.is_provider_account(uuid) to service_role;

-- O mesmo predicado, alcançável de dentro de uma policy. A decisão 5 do
-- ADR da conta de prestador manda a policy de insert de `reports`
-- perguntar se quem escreve é prestador, e policy é avaliada como
-- authenticated — que não tem EXECUTE na função acima e nunca vai ter.
-- O par public/private é o mesmo desenho de private.is_locality_member
-- (20260802000300).
create function private.is_provider_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_accounts
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;

revoke all on function private.is_provider_account(uuid) from public, anon;
grant execute on function private.is_provider_account(uuid) to authenticated, service_role;

-- O middleware roda com o cliente anônimo do usuário, não com
-- service_role. Por isso este segundo helper escopa por auth.uid() e NÃO
-- aceita parâmetro — mesmo desenho de public.my_verification_status
-- (20260820000002).
create function public.my_account_kind()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.locality_memberships where user_id = (select auth.uid())
    ) then 'member'
    when exists (
      select 1 from public.provider_accounts
      where auth_user_id = (select auth.uid()) and revoked_at is null
    ) then 'provider'
    else null
  end;
$$;

revoke all on function public.my_account_kind() from public, anon;
grant execute on function public.my_account_kind() to authenticated, service_role;