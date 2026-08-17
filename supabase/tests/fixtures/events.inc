-- Events + RSVP fixtures: extends foundation.inc (must be included AFTER
-- foundation.inc inside a transaction).
-- Uses example.invalid identities and fixed UUIDs. Never real data.

-- Additional user for RSVP testing (verified Manaus member).
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000007', 'member-three@example.invalid');

insert into public.locality_memberships (user_id, locality_id)
values ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001');

insert into public.profiles (user_id, display_name, visibility)
values (
  '10000000-0000-4000-8000-000000000007',
  'Member Three',
  'locality_members'
);

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values (
  '10000000-0000-4000-8000-000000000007',
  'verified',
  'veteran',
  '2026-08-02 12:00:00+00'
);

-- Locality-wide event (organizer = member-one).
insert into public.events (
  id,
  organizer_id,
  locality_id,
  title,
  description,
  starts_at,
  ends_at,
  venue,
  status
)
values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Encontro no Parque',
  'Encontro mensal da comunidade no Parque Municipal.',
  '2026-08-15 09:00:00+00',
  '2026-08-15 12:00:00+00',
  'Parque Municipal',
  'upcoming'
);

-- Cancelled locality event (organizer = member-one).
insert into public.events (
  id,
  organizer_id,
  locality_id,
  title,
  starts_at,
  status
)
values (
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Evento Cancelado',
  '2026-08-20 10:00:00+00',
  'cancelled'
);

-- Existing RSVP (member-two is interested in event 001).
insert into public.event_rsvps (event_id, user_id, status)
values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'interested'
);
