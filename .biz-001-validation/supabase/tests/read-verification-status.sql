begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc

-- ── Positive: service_role reads the row for the requested user ────────────

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-00000000000a', 'op-status@example.invalid');

insert into private.verification_outcomes (
  user_id,
  status,
  eligibility_class,
  checked_at,
  updated_at
)
values (
  '10000000-0000-4000-8000-00000000000a',
  'verified',
  'veteran',
  '2026-08-06 12:00:00+00',
  '2026-08-06 12:00:00+00'
);

reset role;

select results_eq(
  $$
    select status, eligibility_class, checked_at::text
    from public.read_verification_status('10000000-0000-4000-8000-00000000000a')
  $$,
  $$ values ('verified'::text, 'veteran'::text, '2026-08-06 12:00:00+00'::text) $$,
  'service_role reads the verification row for the requested user'
);

-- ── Negative: anonymous and authenticated cannot execute the RPC ───────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    select public.read_verification_status('10000000-0000-4000-8000-00000000000a')
  $$,
  '42501',
  null,
  'authenticated cannot execute read_verification_status (insufficient_privilege)'
);

set local role anon;

select throws_ok(
  $$
    select public.read_verification_status('10000000-0000-4000-8000-00000000000a')
  $$,
  '42501',
  null,
  'anon cannot execute read_verification_status (insufficient_privilege)'
);

-- ── Negative: a user with no row returns zero rows ──────────────────────────

reset role;

select is_empty(
  $$
    select 1
    from public.read_verification_status('10000000-0000-4000-8000-000000000005')
  $$,
  'a user_id with no verification_outcomes row returns zero rows'
);

select * from finish();
rollback;