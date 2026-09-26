begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

\ir fixtures/foundation.inc
\ir fixtures/notifications.inc

-- ── 1. Self-comment → no notification (actor must not self-notify) ────────────

-- Post author (recipient-10) comments on their own post.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000010',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000010',
      'Respondendo meu proprio post'
    )
  $$,
  'self-comment insert succeeds'
);

-- Verify: no notification was created (actor = recipient, guard blocks).
select is_empty(
  $$
    select 1 from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'comment'
      and actor_user_id = '10000000-0000-4000-8000-000000000010'
  $$,
  'self-comment does NOT create a notification'
);

-- Verify: no notifications at all from this action.
select is_empty(
  'select 1 from public.notifications',
  'self-comment creates zero notifications total'
);

-- ── 2. Self-approve group membership → no notification ────────────────────────

-- User 011 is group owner (already approved). Attempting to re-approve their
-- own membership is blocked by the moderator function (no pending membership).
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000011',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.approve_group_member(
      '40000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000011'
    )
  $$,
  'P0001',
  null,
  'self-approve group membership is blocked (already approved)'
);

-- Verify: no notification was leaked from the blocked self-approve.
select is_empty(
  $$
    select 1 from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000011'
      and type = 'group_admission'
  $$,
  'self-approve group membership does NOT create a notification'
);

-- ── 3. Organizer cannot self-notify for RSVP ──────────────────────────────────

-- Organizer (member-one) cannot RSVP to their own event (blocked by existing
-- trigger), and no notification is created.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '40000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000001',
      'going'
    )
  $$,
  'P0001',
  null,
  'organizer cannot RSVP to own event (existing trigger blocks)'
);

-- Double-check: no leaked notification from the blocked insert.
select is_empty(
  'select 1 from public.notifications',
  'no notification leaked from failed self-RSVP'
);

-- ── 4. Cross-user RLS: cannot read another user's notifications ──────────────

-- First, create a legitimate notification for recipient-10.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000011',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.comments (post_id, user_id, content)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000011',
  'Comentario para gerar notificacao'
);

-- Capture the notification ID for cross-user RLS tests.
reset role;
select id as dmn_notif_id
from public.notifications
where recipient_user_id = '10000000-0000-4000-8000-000000000010'
  and type = 'comment'
\gset

-- Verify: notification exists for recipient-10 (query as postgres to bypass RLS).
select results_eq(
  'select count(*)::integer from public.notifications where recipient_user_id = ''10000000-0000-4000-8000-000000000010''',
  array[1::integer],
  'one notification exists for cross-user RLS test'
);

-- Now switch to another user (member-two) and try to read.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.notifications',
  'cross-user cannot read another users notifications'
);

-- ── 5. Cross-user RLS: cannot update another user's notification ─────────────

select is_empty(
  format(
    'update public.notifications set read_at = now() where id = %L returning id',
    :'dmn_notif_id'
  ),
  'cross-user cannot update another users notification (RLS filters to 0 rows)'
);

-- ── 6. Cross-user RLS: recipient CAN read their own ──────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000010',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*)::integer from public.notifications',
  array[1::integer],
  'recipient can read their own notifications'
);

-- ── 7. RLS: authenticated can update own notification ────────────────────────

select lives_ok(
  $$
    update public.notifications
    set read_at = now()
    where type = 'comment'
  $$,
  'recipient can update own notification read_at'
);

-- ── 8. Meaningless event update → no notification ────────────────────────────

-- Organizer updates event without changing any meaningful field.
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
    set title = 'Evento de Notificacao'
    where id = '40000000-0000-4000-8000-000000000003'
  $$,
  'meaningless event update succeeds (no field changed)'
);

-- Verify: no new notification was created.
-- Only the existing comment notification from earlier should exist.
select results_eq(
  'select count(*)::integer from public.notifications where type <> ''comment''',
  array[0::integer],
  'meaningless event update creates no notification'
);

-- ── 9. anon role cannot access notifications table ────────────────────────────

set local role anon;

select throws_ok(
  'select 1 from public.notifications',
  '42501',
  null,
  'anon cannot access notifications table'
);

-- ── 10. Notification payload carries no PII patterns ─────────────────────────

-- Verify notification columns are only structural references.
select columns_are(
  'public',
  'notifications',
  array[
    'id',
    'recipient_user_id',
    'actor_user_id',
    'type',
    'action',
    'target_type',
    'target_id',
    'read_at',
    'created_at'
  ],
  'notifications table has only structural reference columns — no PII columns'
);

-- Verify: notification content (type/action/target_type) values are limited
-- pre-defined labels, not free-form text that could carry PII.
reset role;
select is_empty(
  $$
    select 1
    from public.notifications
    where action !~ '^[a-z_]{1,50}$'
       or target_type !~ '^[a-z_]{1,50}$'
  $$,
  'notification payload values are pre-defined labels — no PII'
);

select * from finish();
rollback;
