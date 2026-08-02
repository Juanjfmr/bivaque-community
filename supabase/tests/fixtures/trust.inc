-- Trust module fixtures: extends foundation.inc with additional verification
-- and invitation scenarios. Must be included AFTER foundation.inc inside a
-- transaction. Uses example.invalid identities and fixed UUIDs. Never real data.

-- additional verified holders for multi-holder scenarios
insert into private.verification_outcomes (
  user_id,
  status,
  eligibility_class,
  checked_at
)
values (
  '10000000-0000-4000-8000-000000000002',
  'verified',
  'veteran',
  '2026-08-02 12:00:00+00'
),
(
  '10000000-0000-4000-8000-000000000003',
  'verified',
  'military_pensioner',
  '2026-08-02 12:00:00+00'
);

-- holder with exactly 5 active invitations (for max-limit tests)
-- these invitations all belong to member-one (already verified active_federal_military from foundation.inc)
insert into private.family_invitations (
  id,
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  expires_at
)
values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('01', 32), 'hex'),
  decode(repeat('e1', 32), 'hex'),
  '2026-08-09 12:00:00+00'
),
(
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('02', 32), 'hex'),
  decode(repeat('e2', 32), 'hex'),
  '2026-08-09 12:00:00+00'
),
(
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('03', 32), 'hex'),
  decode(repeat('e3', 32), 'hex'),
  '2026-08-09 12:00:00+00'
),
(
  '30000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('04', 32), 'hex'),
  decode(repeat('e4', 32), 'hex'),
  '2026-08-09 12:00:00+00'
),
(
  '30000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('05', 32), 'hex'),
  decode(repeat('e5', 32), 'hex'),
  '2026-08-09 12:00:00+00'
);
