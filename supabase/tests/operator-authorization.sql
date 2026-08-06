begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc

-- Operator fixture: a separate auth.users row so the test does not collide
-- with anything foundation.inc provisions. Auto-rolled back at the end.
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000007', 'op-one@example.invalid');

insert into public.operators (auth_user_id, granted_by, notes)
values (
  '10000000-0000-4000-8000-000000000007',
  null,
  'test fixture operator'
);

-- ── Positive: current user recognized as operator ───────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000007', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  private.is_operator(),
  true,
  'is_operator() returns true when auth.uid() matches an active operator row'
);

select is(
  private.is_operator('10000000-0000-4000-8000-000000000007'),
  true,
  'is_operator(uuid) returns true when the target is an active operator'
);

-- ── Negative: non-operator rejected ─────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  private.is_operator(),
  false,
  'is_operator() returns false for a verified locality member without an operator row'
);

select is(
  private.is_operator('10000000-0000-4000-8000-000000000001'),
  false,
  'is_operator(uuid) returns false when the target has no operator row'
);

-- ── Negative: revocation actually revokes ───────────────────────────────────

reset role;
update public.operators
set revoked_at = now(), revoked_by = '10000000-0000-4000-8000-000000000007'
where auth_user_id = '10000000-0000-4000-8000-000000000007';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000007', true);

select is(
  private.is_operator(),
  false,
  'is_operator() returns false when revoked_at is set on the operator row'
);

-- ── Policy: SELECT visible to authenticated, INSERT blocked ────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select results_eq(
  'select count(*)::int from public.operators',
  $$ values (1::int) $$,
  'authenticated can SELECT from public.operators (transparency)'
);

select throws_ok(
  $$
    insert into public.operators (auth_user_id, notes)
    values ('10000000-0000-4000-8000-000000000008', 'forbidden')
  $$,
  '42501',
  null,
  'authenticated cannot INSERT into public.operators (RLS denies)'
);

-- ── RPC: promote_operator_by_email is service_role only ─────────────────────

select throws_ok(
  $$
    select private.promote_operator_by_email('op-one@example.invalid')
  $$,
  '42501',
  null,
  'authenticated cannot execute promote_operator_by_email (insufficient_privilege)'
);

reset role;

select lives_ok(
  $$
    select private.promote_operator_by_email('op-one@example.invalid')
  $$,
  'service_role can call promote_operator_by_email; idempotent on existing row'
);

select throws_ok(
  $$
    select private.promote_operator_by_email('nonexistent@example.invalid')
  $$,
  'P0001',
  null,
  'promote_operator_by_email raises when email is not in auth.users'
);

select * from finish();
rollback;
