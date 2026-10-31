-- Operator authorization — the first per-user authorization primitive in the
-- schema. Pre-requisite (MAP.md §10.1 Onda 0) for Onda 1 (moderação) and
-- Onda 3 (convite familiar self-service). Without a per-user operator concept,
-- every privileged action currently attributed to "service_role" is unattributable
-- to a person: same key, no audit trail. This fixes that.
--
-- Design:
--   - public.operators is a flat allowlist of auth.users.id rows.
--   - private.is_operator() reads auth.uid() against the table — for RLS.
--   - private.is_operator(uuid) takes a target — for queries and audit.
--   - private.promote_operator_by_email is service_role only — the only
--     sanctioned mutation path. When called from service_role, granted_by is
--     null (no JWT, no identity).
--   - Revocation is a direct UPDATE on the row (set revoked_at, revoked_by).
--     No revoke RPC: the only path that needs to call it before Onda 1 ships
--     is the Onda 1 admin route handler, which uses service_role.
--   - All functions set search_path = '' to prevent search-path injection.
--   - public.operators is metadata, not PII — lives in public.

-- ── table ────────────────────────────────────────────────────────────────────

create table public.operators (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id),
  notes text
);

create index operators_active_idx
  on public.operators (auth_user_id) where revoked_at is null;

alter table public.operators enable row level security;
alter table public.operators force row level security;

revoke all on table public.operators from anon, authenticated;

grant select on table public.operators to authenticated;
grant select, insert, update, delete on table public.operators to service_role;

-- ── helper: current user (auth.uid()) ───────────────────────────────────────

create function private.is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operators
    where auth_user_id = (select auth.uid())
      and revoked_at is null
  );
$$;

revoke all on function private.is_operator() from public;
revoke all on function private.is_operator() from anon;
revoke all on function private.is_operator() from authenticated;
grant execute on function private.is_operator() to authenticated;

-- ── helper: target user ─────────────────────────────────────────────────────

create function private.is_operator(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operators
    where auth_user_id = target_user_id
      and revoked_at is null
  );
$$;

revoke all on function private.is_operator(uuid) from public;
revoke all on function private.is_operator(uuid) from anon;
revoke all on function private.is_operator(uuid) from authenticated;
grant execute on function private.is_operator(uuid) to authenticated;

-- ── bootstrap RPC: promote by email, idempotent on existing row ─────────────

create function private.promote_operator_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where email = target_email;

  if target_id is null then
    raise exception 'no auth.users row with email %', target_email;
  end if;

  insert into public.operators (auth_user_id, granted_by, notes)
  values (
    target_id,
    (select auth.uid()),
    'promoted by private.promote_operator_by_email'
  )
  on conflict (auth_user_id) do nothing;

  return target_id;
end;
$$;

revoke all on function private.promote_operator_by_email(text) from public;
revoke all on function private.promote_operator_by_email(text) from anon;
revoke all on function private.promote_operator_by_email(text) from authenticated;
grant execute on function private.promote_operator_by_email(text) to service_role;

-- ── RLS: transparency (anyone authenticated can see who the operators are) ──

create policy operators_select_authenticated
on public.operators
for select
to authenticated
using (true);

-- No INSERT / UPDATE / DELETE policy for authenticated. All mutation is via
-- service_role (this RPC, and direct UPDATE for revocation in Onda 1).
