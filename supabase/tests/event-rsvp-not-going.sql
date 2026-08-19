-- Onda F Task 2 — RSVP completo: o terceiro estado 'not_going' + o
-- organizador é avisado da mudança (com debouncing e preference).

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc

-- Reset role so we can call the service_role wrappers as the database owner.
reset role;

-- An event organized by member-one (verified). Locality 1 (Manaus).
insert into public.events (
  id, organizer_id, locality_id, title, starts_at, status
) values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Churrasco de teste',
  now() + interval '7 days',
  'upcoming'
);

-- member-two (verified per locality_memberships but NOT verified per
-- private.verification_outcomes — we'll insert a verified row to enable
-- RSVP). Actually foundation.inc does NOT mark member-two as verified.
-- For RSVP we just need locality membership + auth.uid() — the trigger
-- for organizer notification requires organizer_id to exist, which it does.

-- ── POSITIVE 1: member-two RSVPs 'going' → organizer notified ─────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.event_rsvps (event_id, user_id, status) values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'going'
);

select is(
  (
    select count(*) from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
      and target_id = '60000000-0000-4000-8000-000000000001'::uuid
      and action = 'going'
  ),
  1::bigint,
  'F2+: going RSVP notifies the organizer with action=going'
);

-- ── POSITIVE 2: changing to 'not_going' notifies again (debouncing: status changed) ──
update public.event_rsvps
set status = 'not_going'
where event_id = '60000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

select is(
  (
    select count(*) from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
      and target_id = '60000000-0000-4000-8000-000000000001'::uuid
      and action = 'not_going'
  ),
  1::bigint,
  'F2+: transition to not_going notifies the organizer with action=not_going'
);

-- ── NEGATIVE: debouncing — no notification if status didn't change ────────
update public.event_rsvps
set updated_at = now()
where event_id = '60000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

select is(
  (
    select count(*) from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
      and target_id = '60000000-0000-4000-8000-000000000001'::uuid
  ),
  2::bigint,
  'F2-: debouncing — updating updated_at without changing status does not enqueue another notification'
);

-- ── NEGATIVE: preference off → no notification ─────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'service_role', true);

-- Disable events preference for member-one (the organizer).
insert into public.notification_preferences (user_id, events)
values ('10000000-0000-4000-8000-000000000001', false)
on conflict (user_id) do update set events = excluded.events;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- A status change (going -> interested) — the organizer prefers not to
-- receive event RSVP notifications, so nothing new should be enqueued.
update public.event_rsvps
set status = 'interested'
where event_id = '60000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

select is(
  (
    select count(*) from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'
      and target_id = '60000000-0000-4000-8000-000000000001'::uuid
      and action = 'interested'
  ),
  0::bigint,
  'F2-: notification_preferences.events=false suppresses notifications on status change'
);

-- ── NEGATIVE: organizer cannot self-notify (actor == recipient) ─────────
-- The event_rsvps_block_self_trigger blocks this case at write time, so
-- we verify the block instead.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status) values (
      '60000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'going'
    )
  $$,
  'P0001',
  null,
  'F2-: organizer cannot RSVP to own event (event_rsvps_block_self_trigger)'
);

select * from finish();
rollback;