begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc

-- event fixture (member-one as organizer)
insert into public.events (id, locality_id, organizer_id, title, starts_at)
values (
  '80000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Churrasco de confraternizacao',
  '2026-08-20 12:00:00+00'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '80000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'organizer can invite a member to their event'
);

select is(
  (select count(*) from public.event_invites
   where event_id = '80000000-0000-4000-8000-000000000001'),
  1::bigint,
  'organizer sees the invitation they created'
);

select throws_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '80000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23505',
  null,
  'duplicate (event_id, invitee_user_id) is rejected'
);

-- invitee sees their own invitation and can respond
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select isnt_empty(
  $$
    select 1 from public.event_invites
    where event_id = '80000000-0000-4000-8000-000000000001'
      and invitee_user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  'invitee sees their own invitation'
);

select lives_ok(
  $$
    update public.event_invites
    set status = 'accepted', responded_at = now()
    where event_id = '80000000-0000-4000-8000-000000000001'
      and invitee_user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  'invitee can accept the invitation'
);

-- non-participant cannot see or mutate
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select is_empty(
  $$
    select 1 from public.event_invites
    where event_id = '80000000-0000-4000-8000-000000000001'
  $$,
  'a non-participant sees no event invitations'
);

select * from finish();
rollback;