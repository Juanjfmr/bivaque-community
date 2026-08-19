begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

reset role;

-- Add a moderator (non-owner) and an operator without community membership.
insert into public.community_memberships (community_id, user_id, role, status)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'moderator', 'approved');

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-00000000000b', 'op-no-community@example.invalid');

insert into public.operators (auth_user_id, notes)
values ('10000000-0000-4000-8000-00000000000b', 'fixture: operator without community membership');

-- 1. The owner of community A is a moderator.
select is(
  public.is_current_user_community_moderator(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  true,
  'owner of community A is a moderator'
);

-- 2. A dedicated moderator (non-owner) is a moderator.
select is(
  public.is_current_user_community_moderator(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005'
  ),
  true,
  'a dedicated moderator is a moderator'
);

-- 3. A plain member is NOT a moderator.
select is(
  public.is_current_user_community_moderator(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004'
  ),
  false,
  'a plain approved member is not a moderator'
);

-- 4. A pending member is NOT a moderator.
select is(
  public.is_current_user_community_moderator(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  ),
  false,
  'a pending member is not a moderator'
);

-- 5. Operator status does NOT grant moderator role on a community.
-- An operator without any community_memberships row must not be seen as a
-- moderator of any community — operator and owner/moderator are independent
-- authorizations (D2 Task 9 Step 3).
select is(
  public.is_current_user_community_moderator(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-00000000000b'
  ),
  false,
  'an operator without community membership is not a moderator'
);

-- 6. The owner of community A is NOT a moderator of community B
-- (the cross-community negative — the one the plan calls out).
select is(
  public.is_current_user_community_moderator(
    '70000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000005'
  ),
  false,
  'a moderator of community A is not a moderator of community B'
);

-- 7. An unknown user returns false (no exception).
select is(
  public.is_current_user_community_moderator(
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000999'
  ),
  false,
  'an unknown user_id returns false (no exception)'
);

-- 8. authenticated cannot execute the helper.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.is_current_user_community_moderator(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001'
     ) $$,
  '42501',
  null,
  'authenticated cannot execute the helper'
);

-- 9. anon cannot execute the helper either.
set local role anon;
select throws_ok(
  $$ select public.is_current_user_community_moderator(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001'
     ) $$,
  '42501',
  null,
  'anon cannot execute the helper'
);

select * from finish();
rollback;
