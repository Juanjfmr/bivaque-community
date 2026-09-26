-- Regression tests for the event_rsvps scope leak.
--
-- Migration 017 scoped events.select to group membership but left event_rsvps
-- gating on private.is_event_locality_member alone.
--
-- The SELECT side turned out to be safe already, but only by accident: its
-- policy nests "select 1 from public.events", and that subquery is subject to
-- the events RLS that 017 tightened. Making it explicit here costs nothing and
-- removes the dependency on that coincidence.
--
-- The INSERT side was the real leak. is_event_locality_member is security
-- definer, so it bypasses RLS and saw only locality membership: any Manaus
-- member could RSVP to a PRIVATE group's event. The payoff is the notification
-- path — notify_event_change notifies every RSVP'd user, so an outsider who
-- RSVP'd then receives the private event's title, venue and schedule.
--
-- Every denial has a matching positive so the fix cannot pass by denying
-- everyone: locality-wide events and public-group events must keep working
-- exactly as before.

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc
\ir fixtures/events.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- Extra fixtures. Seeded as the migration role so RLS does not interfere.
--   40000000-…-0001 = PUBLIC group  "Grupo de Corrida"
--   40000000-…-0002 = PRIVATE group "Clube do Livro"
-- member-one   (001) owns both groups
-- member-two   (002) approved in public, PENDING in private
-- hidden-member (004) Manaus member, in no group
-- member-three (007) added below as approved member of the PRIVATE group
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000007',
  'member',
  'approved'
);

insert into public.events (
  id, organizer_id, locality_id, group_id, title, description, starts_at, venue, status
)
values (
  '31000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  'Encontro do clube',
  'Discussao do mes',
  '2026-09-01 19:00:00+00',
  'Sala de reunioes',
  'upcoming'
);

insert into public.events (
  id, organizer_id, locality_id, group_id, title, description, starts_at, venue, status
)
values (
  '31000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'Treino aberto',
  'Treino da manha',
  '2026-09-02 06:00:00+00',
  'Parque Municipal',
  'upcoming'
);

insert into public.event_rsvps (event_id, user_id, status)
values (
  '31000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  'going'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: member-two has only a PENDING request in the private group.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.event_rsvps
    where event_id = '31000000-0000-4000-8000-000000000001'
  $$,
  'pending member cannot read the attendee list of a private-group event'
);

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '31000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'going'
    )
  $$,
  42501,
  null,
  'pending member cannot RSVP to a private-group event'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: hidden-member is a Manaus member but belongs to no group.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.event_rsvps
    where event_id = '31000000-0000-4000-8000-000000000001'
  $$,
  'locality member outside the group cannot read its event attendee list'
);

-- positive counterweights: the same actor keeps every access they should have

select lives_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004',
      'going'
    )
  $$,
  'locality member can still RSVP to a locality-wide event'
);

select lives_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '31000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000004',
      'going'
    )
  $$,
  'locality member can still RSVP to a public-group event'
);

select isnt_empty(
  $$
    select 1 from public.event_rsvps
    where event_id = '30000000-0000-4000-8000-000000000001'
  $$,
  'locality member can still read a locality-wide event attendee list'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ALLOWED: member-three is an approved member of the private group.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000007',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$
    select 1 from public.event_rsvps
    where event_id = '31000000-0000-4000-8000-000000000001'
  $$,
  'approved group member reads the attendee list of their group event'
);

select * from finish();
rollback;
