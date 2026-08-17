insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'member-one@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'member-two@example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'other-locality@example.invalid'),
  ('10000000-0000-4000-8000-000000000004', 'hidden-member@example.invalid'),
  ('10000000-0000-4000-8000-000000000005', 'non-member@example.invalid');

insert into public.localities (id, slug, city_name, state_code, country_code, ibge_code)
values (
  '00000000-0000-4000-8000-000000000002',
  'test-other-locality',
  'Fixture City',
  'EX',
  'BR',
  '9999999'  -- fora do catálogo IBGE real (P0 Task 1: ibge_code é NOT NULL)
);

insert into public.locality_memberships (user_id, locality_id)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001');

insert into public.profiles (user_id, display_name, visibility)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Member One',
    'locality_members'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Member Two',
    'locality_members'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Other Locality',
    'locality_members'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Hidden Member',
    'locality_members'
  );

insert into private.verification_outcomes (
  user_id,
  status,
  eligibility_class,
  checked_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  'verified',
  'active_federal_military',
  '2026-08-02 12:00:00+00'
);

insert into private.family_invitations (
  id,
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  expires_at
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('ab', 32), 'hex'),
  decode(repeat('cd', 32), 'hex'),
  now() + interval '7 days'
);
