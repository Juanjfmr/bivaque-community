begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

-- Onda D2 Task 1 Step 4: pgTAP for my_verification_status.

\ir fixtures/foundation.inc

-- 1. The function exists, is security definer, takes no input parameter.
-- The OUT columns of returns table(...) appear as output columns, so the
-- no-parameter check must look at proargtypes (input args), not proargnames.
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'my_verification_status'
      and p.prosecdef = true
      and p.proargtypes = ''::oidvector
  ),
  'public.my_verification_status exists, is security definer, takes no input argument'
);

-- The foundation fixture already marks member-one 'verified'. Add member-two as
-- 'pending' so the function has a second, distinct row to distinguish from.
insert into private.verification_outcomes (user_id, status, eligibility_class)
values ('10000000-0000-4000-8000-000000000002'::uuid, 'pending', null);

-- 2. With auth.uid() = member-one, the function returns member-one's own
-- verified row (fixture state) and only that row.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select status::text
    from public.my_verification_status()
  ),
  'verified',
  'the function returns the callers own status (member-one is verified)'
);

select is(
  (select count(*)::integer from public.my_verification_status()),
  1,
  'the function returns exactly one row: the callers own'
);

-- 3. The negative: member-two carries the only 'pending' row in the table.
-- Acting as member-one, the function must never surface it.
select is_empty(
  $$
    select 1
    from public.my_verification_status()
    where status::text = 'pending'
  $$,
  'member-one never sees member-twos pending status'
);

-- 4. anon cannot execute. The migration revokes all and grants only to
-- authenticated; anon must not be able to call this at all.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$
    select * from public.my_verification_status()
  $$,
  '42501',
  null,
  'anon cannot call my_verification_status (no grant)'
);

select * from finish();
rollback;
