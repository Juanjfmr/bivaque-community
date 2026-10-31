-- Onboarding fixtures: extends foundation.inc with consent, waitlist,
-- and onboarding verification scenarios. Must be included AFTER foundation.inc
-- inside a transaction. Uses example.invalid identities and fixed UUIDs.
-- Never real data.

-- verified holder member-one already has consent (foundation.inc created profile before
-- consent columns existed — this fixture updates them)
update public.profiles
set consent_version = 1, consented_at = '2026-08-02 12:00:00+00'
where user_id = '10000000-0000-4000-8000-000000000001';

update public.profiles
set consent_version = 1, consented_at = '2026-08-02 12:00:00+00'
where user_id = '10000000-0000-4000-8000-000000000002';

-- unverified user (pending) for consent-gating tests
insert into auth.users (id, email)
values ('60000000-0000-4000-8000-000000000001', 'unverified@example.invalid');

insert into private.verification_outcomes (user_id, status)
values ('60000000-0000-4000-8000-000000000001', 'pending');

-- rejected user for denial tests
insert into auth.users (id, email)
values ('60000000-0000-4000-8000-000000000002', 'rejected@example.invalid');

insert into private.verification_outcomes (user_id, status)
values ('60000000-0000-4000-8000-000000000002', 'rejected');

-- waitlist entries for outside-city users
insert into public.waitlist (id, email, locality_id, city_name, state_code)
values (
  '70000000-0000-4000-8000-000000000001',
  'outsider@example.invalid',
  null,
  'Brasília',
  'DF'
),
(
  '70000000-0000-4000-8000-000000000002',
  'another-city@example.invalid',
  null,
  'Belém',
  'PA'
);
