-- Onda F Task 3 — event invitation fan-out + scope guard.
--
-- Tests: organizer invites -> rows born; non-organizer denied; inviting
-- someone who can't reach the event is denied; duplicate invite -> no second row.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

reset role;

insert into public.events (
  id, organizer_id, locality_id, title, starts_at, status
) values (
  '60000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Evento de teste de convite',
  now() + interval '7 days',
  'upcoming'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '60000000-0000-4000-8000-000000000010'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'F3+: event organizer invites an eligible locality member'
);

select is(
  (
    select count(*) from public.event_invites
    where event_id = '60000000-0000-4000-8000-000000000010'::uuid
      and invitee_user_id = '10000000-0000-4000-8000-000000000002'::uuid
  ),
  1::bigint,
  'F3+: the invite row is born'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '60000000-0000-4000-8000-000000000010'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  '42501',
  null,
  'F3-: a non-organizer inviting is denied'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '60000000-0000-4000-8000-000000000010'::uuid,
      '10000000-0000-4000-8000-000000000003'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  '42501',
  null,
  'F3-: inviting someone who cannot reach the event is denied (scope guard)'
);

select lives_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '60000000-0000-4000-8000-000000000010'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'F3+: duplicate insert is a no-op (unique constraint)'
);

select is(
  (
    select count(*) from public.event_invites
    where event_id = '60000000-0000-4000-8000-000000000010'::uuid
      and invitee_user_id = '10000000-0000-4000-8000-000000000002'::uuid
  ),
  1::bigint,
  'F3+: exactly one invite row remains after the duplicate attempt'
);

select is(
  private.can_receive_invite_to_event(
    '60000000-0000-4000-8000-000000000010'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid
  ),
  true,
  'F3+: locality member (member-two) can receive invite to locality event'
);

select is(
  private.can_receive_invite_to_event(
    '60000000-0000-4000-8000-000000000010'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid
  ),
  false,
  'F3-: other-locality member (member-three) cannot receive invite to locality-1 event'
);

select * from finish();
rollback;