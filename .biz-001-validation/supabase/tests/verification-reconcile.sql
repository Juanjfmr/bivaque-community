begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

-- Onda D2 Task 2 Step 5: pgTAP for the pending reconciliation job (CPF-free
-- slice). The Portal re-verification itself is owner-blocked (no CPF is ever
-- persisted — AGENTS.md); the job bounds the wait, caps the retries, hands the
-- row to the operator manual queue and notifies the person.

\ir fixtures/foundation.inc

reset role;

-- 1. The job exists and is scheduled on the 15-minute cadence.
select results_eq(
  $$ select count(*)::integer from cron.job where jobname = 'bivaque-verification-reconcile' $$,
  array[1::integer],
  'the verification reconcile job exists'
);

-- The base fixture marks member-one (…001) verified. We shape the rest by
-- INSERT (the updated_at trigger is BEFORE UPDATE only, so an explicit
-- updated_at survives a fresh row):
--   member-two (…002)   pending, 45 minutes old, 0 attempts  -> candidate
--   member-three (…003) temporary_error, 40 minutes old, 0 attempts -> candidate
--   member-four (…004)  pending, 40 minutes old, 5 attempts  -> capped
--   member-five (…005)  pending, 2 minutes old, 0 attempts   -> too fresh
insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at, updated_at, reconcile_attempts)
values
  ('10000000-0000-4000-8000-000000000002', 'pending', null, null, now() - interval '45 minutes', 0),
  ('10000000-0000-4000-8000-000000000003', 'temporary_error', null, null, now() - interval '40 minutes', 0),
  ('10000000-0000-4000-8000-000000000004', 'pending', null, null, now() - interval '40 minutes', 5),
  ('10000000-0000-4000-8000-000000000005', 'pending', null, null, now() - interval '2 minutes', 0);

-- 2. An old pending row is a candidate: member-two (45 min) appears in the set.
select is(
  (select count(*)::integer from private.verification_reconcile_candidates(10)
     where user_id = '10000000-0000-4000-8000-000000000002'),
  1,
  'an old pending row is a candidate'
);

-- 3. A two-minute-old pending row is NOT a candidate (the user may be typing).
select is_empty(
  $$ select user_id from private.verification_reconcile_candidates(10)
     where user_id = '10000000-0000-4000-8000-000000000005' $$,
  'a two-minute-old pending row is not a candidate'
);

-- 4. temporary_error rows are candidates too: member-two (pending) and
-- member-three (temporary_error) are both due.
select results_eq(
  $$ select user_id::text from private.verification_reconcile_candidates(10) order by user_id $$,
  $$ values
       ('10000000-0000-4000-8000-000000000002'::text),
       ('10000000-0000-4000-8000-000000000003'::text)
  $$,
  'pending and temporary_error rows are both candidates'
);

-- 5. A row at the attempt cap is not re-eligible.
select is_empty(
  $$ select user_id from private.verification_reconcile_candidates(10)
     where user_id = '10000000-0000-4000-8000-000000000004' $$,
  'a row at the attempt cap is not re-eligible'
);

-- 6. Below the cap the step defers and leaves the row pending. member-five
-- (…005) is a fresh pending row, below the cap — the step lifts nothing.
select is(
  public.verification_reconcile_step('10000000-0000-4000-8000-000000000005'),
  'deferred',
  'below the cap the step defers'
);

select is(
  (select status::text from private.verification_outcomes where user_id = '10000000-0000-4000-8000-000000000005'),
  'pending',
  'a deferred row stays pending'
);

-- 7. At the cap the step rejects the row into the manual queue.
update private.verification_outcomes
set reconcile_attempts = 5
where user_id = '10000000-0000-4000-8000-000000000002';

select is(
  public.verification_reconcile_step('10000000-0000-4000-8000-000000000002'),
  'rejected',
  'at the cap the step rejects'
);

select is(
  (select status::text from private.verification_outcomes where user_id = '10000000-0000-4000-8000-000000000002'),
  'rejected',
  'the rejected row lands in the manual queue'
);

-- 8. The rejection enqueues exactly one notification email through the outbox.
select results_eq(
  $$ select count(*)::integer from public.outbox where type = 'verification_resolved' and recipient = 'member-two@example.invalid' $$,
  array[1::integer],
  'the rejection enqueues exactly one notification email'
);

-- 9. A verified row resolves without touching state or enqueuing.
select is(
  public.verification_reconcile_step('10000000-0000-4000-8000-000000000001'),
  'resolved',
  'a verified row resolves without enqueuing'
);

select results_eq(
  $$ select count(*)::integer from public.outbox where type = 'verification_resolved' and recipient = 'member-one@example.invalid' $$,
  array[0::integer],
  'a resolved row enqueues nothing'
);

-- 10. anon cannot execute the reconcile step at all.
set local role anon;
select throws_ok(
  $$ select * from public.verification_reconcile_step('10000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'anon cannot run the reconcile step'
);

select * from finish();
rollback;
