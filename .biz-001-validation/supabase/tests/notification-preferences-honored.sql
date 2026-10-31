begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/notifications.inc

-- ── 1. Comment: default (no preference row) → notify the author ──────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000011',
      'Comentario positivo'
    )
  $$,
  'comment insert succeeds with default preference'
);

reset role;

select results_eq(
  $$
    select type::text from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'comment'
  $$,
  $$ values ('comment'::text) $$,
  'comment with no preference row notifies the post author'
);

-- ── 2. Comment: comments=false → do not notify ───────────────────────────────

reset role;

insert into public.notification_preferences (user_id, comments)
values ('10000000-0000-4000-8000-000000000010', false)
on conflict (user_id) do update set comments = excluded.comments;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000011',
      'Comentario negativo'
    )
  $$,
  'comment insert succeeds with comments disabled'
);

reset role;

select results_eq(
  $$
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000010'
      and type = 'comment'
  $$,
  array[1::integer],
  'comment with comments=false does not add a notification'
);

-- ── 3. Event RSVP: default (no preference row) → notify the organizer ───────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000011', true);
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
  'event RSVP insert succeeds with default preference'
);

reset role;

select results_eq(
  $$
    select type::text from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
  $$,
  $$ values ('event_rsvp'::text) $$,
  'event RSVP with no preference row notifies the organizer'
);

-- ── 4. Event RSVP: events=false → do not notify ──────────────────────────────

reset role;

insert into public.notification_preferences (user_id, events)
values ('10000000-0000-4000-8000-000000000001', false)
on conflict (user_id) do update set events = excluded.events;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000010', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '40000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000010',
      'going'
    )
  $$,
  'event RSVP insert succeeds with events disabled'
);

reset role;

select results_eq(
  $$
    select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
  $$,
  array[1::integer],
  'event RSVP with events=false does not add a notification'
);

select * from finish();
rollback;
