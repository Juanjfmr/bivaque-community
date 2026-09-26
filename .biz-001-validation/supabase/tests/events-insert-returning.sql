begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

-- Found during manual browser QA of onda F Task 4 — see the comment in
-- 20260820060533_fix_events_insert_returning_rls.sql for the full
-- diagnosis. Every other pgTAP fixture that inserts into events does a
-- plain INSERT with no RETURNING, so none of them exercised this: a
-- STABLE function that re-queries the SAME table it is a policy for, by
-- the row's own id, cannot see that row within the same statement — the
-- function's snapshot is fixed before the INSERT runs. This is exactly
-- what `insert ... returning *` needs, since RETURNING re-checks the
-- table's SELECT policy against the row it just wrote, in the same
-- statement. A real client asking PostgREST for the created row back
-- (Prefer: return=representation, e.g. `.insert(...).select()`) hits this
-- every time; a plain `.insert(...)` (return=minimal) never does, which is
-- why the app never surfaced it before.

\ir fixtures/foundation.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Positive: an ordinary, verified, active locality member can create an
-- event AND have PostgREST-style RETURNING see it in the same statement.
select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento com RETURNING',
      '2026-09-20 18:00:00+00'
    )
    returning id
  $$,
  'insert ... returning succeeds for a verified, active locality member'
);

-- Negative: someone with no membership in the target locality is still
-- denied under RETURNING, the same as without it — the fix must not widen
-- access, only stop it from wrongly narrowing it to nothing.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000001',
      'Evento de quem nao e membro',
      '2026-09-21 18:00:00+00'
    )
    returning id
  $$,
  '42501',
  null,
  'a non-member is still denied under RETURNING (negative)'
);

select * from finish();
rollback;
