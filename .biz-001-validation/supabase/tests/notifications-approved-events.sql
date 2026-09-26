begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

\ir fixtures/foundation.inc
\ir fixtures/notifications.inc

-- ── 1. Comment on post → notify post author ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000011',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Assert: no notifications yet.
select is_empty(
  'select 1 from public.notifications',
  'no notifications exist before any action'
);

-- actor-11 comments on post by recipient-10.
select lives_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000011',
      'Excelente post!'
    )
  $$,
  'comment insert succeeds'
);

-- Query as postgres to bypass RLS (notification is for recipient-10, not the actor).
reset role;

-- Verify: exactly 1 notification for post author (recipient-10), type=comment.
select results_eq(
  $$
    select type::text, action, target_type
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
  $$,
  $$ values ('comment'::text, 'created'::text, 'post'::text) $$,
  'comment creates exactly one notification for the post author'
);

-- Verify: actor is correctly set.
select results_eq(
  $$
    select actor_user_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'comment'
  $$,
  $$ values ('10000000-0000-4000-8000-000000000011'::uuid) $$,
  'notification actor is the commenter'
);

-- Verify: target references the correct post.
select results_eq(
  $$
    select target_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'comment'
  $$,
  $$ values ('40000000-0000-4000-8000-000000000001'::uuid) $$,
  'notification target references the post'
);

-- ── 2. Group admission approved → notify approved user ────────────────────────

-- Switch back to authenticated actor for the trigger action.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000011',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- actor-11 (group owner) approves recipient-10's pending membership.
select lives_ok(
  $$
    select public.approve_group_member(
      '40000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000010'
    )
  $$,
  'group admission approval succeeds'
);

reset role;

-- Verify: notification created for the approved user.
select results_eq(
  $$
    select type::text, action, target_type, target_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'group_admission'
  $$,
  $$ values (
    'group_admission'::text,
    'approved'::text,
    'group'::text,
    '40000000-0000-4000-8000-000000000002'::uuid
  ) $$,
  'group admission creates notification for the approved user'
);

-- Verify: actor is the moderator who approved.
select results_eq(
  $$
    select actor_user_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'group_admission'
  $$,
  $$ values ('10000000-0000-4000-8000-000000000011'::uuid) $$,
  'group admission notification actor is the moderator'
);

-- ── 3. Family invitation accepted → notify inviter ────────────────────────────

-- Accept invitation as service_role (authenticated cannot access private schema).
reset role;
set local role service_role;

select lives_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('ef', 32), 'hex'),
      '10000000-0000-4000-8000-000000000011'
    )
  $$,
  'invitation acceptance succeeds'
);

-- Verify: notification for the inviter (recipient-10).
select results_eq(
  $$
    select type::text, action, target_type
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'invitation_accepted'
  $$,
  $$ values ('invitation_accepted'::text, 'accepted'::text, 'family_invitation'::text) $$,
  'invitation accepted creates notification for the inviter'
);

-- Verify: actor is the person who accepted.
select results_eq(
  $$
    select actor_user_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'invitation_accepted'
  $$,
  $$ values ('10000000-0000-4000-8000-000000000011'::uuid) $$,
  'invitation notification actor is the accepter'
);

-- ── 4. Event RSVP → notify event organizer ───────────────────────────────────

-- actor-11 RSVPs to an event organized by member-one.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000011',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '40000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000011',
      'going'
    )
  $$,
  'event RSVP insert succeeds'
);

reset role;

-- Verify: notification for the organizer (member-one).
select results_eq(
  $$
    select type::text, action, target_type
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
  $$,
  $$ values ('event_rsvp'::text, 'going'::text, 'event'::text) $$,
  'event RSVP creates notification for the organizer'
);

-- Verify: actor is the RSVP'er.
select results_eq(
  $$
    select actor_user_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
  $$,
  $$ values ('10000000-0000-4000-8000-000000000011'::uuid) $$,
  'event RSVP notification actor is the attendee'
);

-- ── 5. Event change → notify RSVP'd users ────────────────────────────────────

-- Organizer (member-one) updates event title and start time.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.events
    set title = 'Evento de Notificacao (atualizado)',
        starts_at = '2026-09-01 11:00:00+00'
    where id = '40000000-0000-4000-8000-000000000003'
  $$,
  'event update succeeds'
);

reset role;

-- Verify: notification for the RSVP'd user (actor-11) about the event change.
select results_eq(
  $$
    select type::text, action, target_type, target_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000011'
      and type = 'event_change'
  $$,
  $$ values (
    'event_change'::text,
    'updated'::text,
    'event'::text,
    '40000000-0000-4000-8000-000000000003'::uuid
  ) $$,
  'event change creates notification for RSVPd users'
);

-- Verify: actor is the organizer.
select results_eq(
  $$
    select actor_user_id
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000011'
      and type = 'event_change'
  $$,
  $$ values ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'event change notification actor is the organizer'
);

-- Verify: organizer does NOT get a self-notification for the event change.
select is_empty(
  $$
    select 1 from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_change'
  $$,
  'event organizer does not self-notify for event change'
);

-- ── 6. RLS: recipient can see their own notifications ─────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000010',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*)::integer from public.notifications',
  array[3::integer],
  'recipient-10 sees exactly 3 notifications addressed to them'
);

-- ── 7. RLS: recipient can mark notification as read ───────────────────────────

select lives_ok(
  $$
    update public.notifications
    set read_at = now()
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'comment'
  $$,
  'recipient can mark their notification as read'
);

select results_eq(
  $$
    select count(*)::integer
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'comment'
      and read_at is not null
  $$,
  array[1::integer],
  'notification read_at is set after update'
);

select * from finish();
rollback;
