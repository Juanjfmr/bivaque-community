-- Onda T Task 1: the leaving link.
--
-- Executes the schema base of the transfer (ADR-20260816-transferencia-e-pertencimento):
-- a person has ONE current locality and, at most, ONE leaving locality. The P0
-- delivered the multi-membership PK; this migration delivers the kind/leaving_at/access
-- columns that distinguish the two.
--
-- The enum value 'current'/'leaving' is encoded in a column called `kind`,
-- not `role`: plpgsql treats `role` as a variable name and the SQL parser
-- raises "role is not a known variable" (SQLSTATE 42601). Same name was
-- avoided in production migrations for the same reason.
--
-- Constraint, not convention:
--   * UNIQUE (user_id) WHERE kind = 'current'  -> one current per user
--   * UNIQUE (user_id) WHERE kind = 'leaving' -> at most one leaving per user
-- A convention in the application turns into two leaving rows the first time
-- someone forgets the check. The constraint makes the bug impossible.
--
-- leaving_at is REQUIRED for a leaving row (the check constraint says so). It
-- is NULL for a current row, by the same constraint. Two reasons:
--   1. The T1 Step 4 negative test ("declarar duas vezes não cria duas linhas
--      de saída") depends on it: a leaving row has a date, and the helper
--      refuses to convert without one.
--   2. The T3 degradation job reads leaving_at to know when to flip the
--      access from 'active' to 'read_only'. NULL means "no deadline yet" —
--      and that is the case T3 will fill with a default, not here.
--
-- The declaration of transfer is not verifiable, and the comment says why:
--   The Portal attests the person is military, not where they serve. Locality
--   has always been self-declared (BIVAQUE.md §4.1: each fact is attested by
--   whoever can attest it; the State will never know that someone is from
--   Ajuricaba). A declared transfer is no weaker than a declared locality,
--   and the vila owner's approval remains the check that matters.
--   Do not try to "reinforce" the transfer with CEP or DDD in three months
--   from now; the P0 records why both are prohibited.
--
-- No policy added: the existing locality_memberships_select_self is sufficient
-- (a user can see all of their memberships). Insert/update/delete of membership
-- rows happens through SECURITY DEFINER RPCs only; the rls-or-column-regression
-- guard at supabase/tests/rls-or-column-regression.test.sql:519 enforces
-- "exactly 1 policy on locality_memberships" and adding one would break it.
--
-- ── provisioning is the same shape as declaring a transfer ──────────────────
-- provisionMember in the P0 used to upsert directly into locality_memberships.
-- With the constraint added here, that path fails for users who already hold
-- a current membership in another city (the partial unique index rejects the
-- second row). The fix is the same mechanism the transfer uses: the existing
-- current becomes leaving (with a 30-day default deadline — the user has not
-- declared one yet, but T3 will set a reminder off this column) and the new
-- locality becomes current. The rule 6 of §12 (scope column and the policies
-- that read it land in the same migration) applies: the constraint, the helper,
-- and the upsert site change together here, not in three commits.

create type public.locality_membership_kind as enum (
  'current',
  'leaving'
);

create type public.locality_membership_access as enum (
  'active',
  'read_only'
);

alter table public.locality_memberships
  add column kind public.locality_membership_kind not null default 'current',
  add column leaving_at date,
  add column access public.locality_membership_access not null default 'active';

alter table public.locality_memberships
  add constraint locality_memberships_leaving_at_kind_check
    check (
      (kind = 'leaving' and leaving_at is not null)
      or (kind = 'current' and leaving_at is null)
    );

create unique index locality_memberships_one_current_per_user_idx
  on public.locality_memberships (user_id)
  where kind = 'current';

create unique index locality_memberships_one_leaving_per_user_idx
  on public.locality_memberships (user_id)
  where kind = 'leaving';

-- ── declare_locality_transfer ────────────────────────────────────────────────
-- Atomic: convert the current row to leaving AND create the destination as
-- current. The two together or neither. Two currents or no current is worse
-- than the bug we are fixing — the plan says so and the test will prove it.
--
-- SECURITY DEFINER because the client must NOT write to locality_memberships
-- directly (no insert/update policy exists). The helper does it.
create function public.declare_locality_transfer(
  p_destination_locality_id uuid,
  p_term_date date
)
returns table (
  current_locality_id uuid,
  leaving_locality_id uuid,
  leaving_at date
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid := auth.uid();
  v_current_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.localities where id = p_destination_locality_id
  ) then
    raise exception 'destination not in catalog' using errcode = '23514';
  end if;

  select locality_id into v_current_id
    from public.locality_memberships
    where user_id = v_user_id and kind = 'current'
    limit 1;

  if v_current_id is null then
    raise exception 'no current locality to leave' using errcode = '23514';
  end if;

  if v_current_id = p_destination_locality_id then
    raise exception 'destination equals current' using errcode = '23514';
  end if;

  update public.locality_memberships
    set kind = 'leaving', leaving_at = p_term_date, access = 'active'
    where user_id = v_user_id and kind = 'current';

  insert into public.locality_memberships (user_id, locality_id, kind, access)
    values (v_user_id, p_destination_locality_id, 'current', 'active');

  return query
    select
      p_destination_locality_id,
      v_current_id,
      p_term_date;
end;
$func$;

revoke all on function public.declare_locality_transfer(uuid, date) from public;
revoke all on function public.declare_locality_transfer(uuid, date) from anon;
revoke all on function public.declare_locality_transfer(uuid, date) from authenticated;
grant execute on function public.declare_locality_transfer(uuid, date) to authenticated;

-- ── provision_member_locality ──────────────────────────────────────────────
-- Replaces the P0 upsert. service_role only: the route handler /api/onboarding
-- is the only caller, and it has already verified eligibility before getting
-- here (lib/onboarding/verifyAndProvision.ts).
--
-- Atomic. If the user already holds a current membership in another city,
-- that row is converted to leaving with a 30-day default deadline — the user
-- has not declared a transfer date yet, but T3 will surface the deadline via
-- a reminder and degrade to read_only after it. If no current exists, the
-- destination simply becomes current.
create function public.provision_member_locality(
  p_user_id uuid,
  p_locality_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_term_date date := current_date + interval '30 days';
begin
  if not exists (
    select 1 from public.localities where id = p_locality_id
  ) then
    raise exception 'locality not in catalog' using errcode = '23514';
  end if;

  update public.locality_memberships
    set kind = 'leaving', leaving_at = v_term_date, access = 'active'
    where user_id = p_user_id and kind = 'current';

  insert into public.locality_memberships (user_id, locality_id, kind, access)
    values (p_user_id, p_locality_id, 'current', 'active')
    on conflict (user_id, locality_id) do nothing;
end;
$func$;

revoke all on function public.provision_member_locality(uuid, uuid) from public;
revoke all on function public.provision_member_locality(uuid, uuid) from anon;
revoke all on function public.provision_member_locality(uuid, uuid) from authenticated;
grant execute on function public.provision_member_locality(uuid, uuid) to service_role;
