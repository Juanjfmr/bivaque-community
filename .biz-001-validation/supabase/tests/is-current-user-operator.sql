begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc

-- Two operator fixtures: one active, one revoked.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-00000000000b', 'op-active@example.invalid'),
  ('10000000-0000-4000-8000-00000000000c', 'op-revoked@example.invalid');

insert into public.operators (auth_user_id, notes)
values
  ('10000000-0000-4000-8000-00000000000b', 'fixture: active operator'),
  ('10000000-0000-4000-8000-00000000000c', 'fixture: revoked operator');

reset role;

update public.operators
set revoked_at = now(),
    revoked_by = '10000000-0000-4000-8000-00000000000b'
where auth_user_id = '10000000-0000-4000-8000-00000000000c';

-- ── Positive: an active operator returns true ─────────────────────────────

select is(
  public.is_current_user_operator('10000000-0000-4000-8000-00000000000b'),
  true,
  'active operator returns true'
);

-- ── Negative: a revoked operator returns false ───────────────────────────

select is(
  public.is_current_user_operator('10000000-0000-4000-8000-00000000000c'),
  false,
  'revoked operator returns false'
);

-- ── Negative: a non-operator returns false ───────────────────────────────

select is(
  public.is_current_user_operator('10000000-0000-4000-8000-000000000001'),
  false,
  'a verified locality member without an operator row returns false'
);

-- ── Negative: an unknown user returns false (no exception) ──────────────

select is(
  public.is_current_user_operator('00000000-0000-4000-8000-000000000999'),
  false,
  'an unknown user_id returns false (no exception)'
);

select * from finish();
rollback;