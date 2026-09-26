-- Notifications test fixtures: extends foundation.inc (must be included AFTER
-- foundation.inc inside a transaction).
-- Uses example.invalid identities and fixed UUIDs. Never real data.

-- Additional users for notification testing.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000010', 'notify-recipient@example.invalid'),
  ('10000000-0000-4000-8000-000000000011', 'notify-actor@example.invalid');

-- Both are verified Manaus members.
insert into public.locality_memberships (user_id, locality_id)
values
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001');

insert into public.profiles (user_id, display_name, visibility)
values
  (
    '10000000-0000-4000-8000-000000000010',
    'Notify Recipient',
    'locality_members'
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    'Notify Actor',
    'locality_members'
  );

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  (
    '10000000-0000-4000-8000-000000000010',
    'verified',
    'veteran',
    '2026-08-02 12:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    'verified',
    'veteran',
    '2026-08-02 12:00:00+00'
  );

-- Post for comment-notification testing (author = recipient-user-10).
insert into public.posts (
  id,
  locality_id,
  user_id,
  post_type,
  content
)
values (
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000010',
  'text',
  'Post para teste de notificacao'
);

-- Group for admission-notification testing (created by actor-user-11).
insert into public.groups (
  id,
  name,
  visibility,
  locality_id,
  created_by,
  owner_user_id
)
values (
  '40000000-0000-4000-8000-000000000002',
  'Grupo de Notificacao',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000011'
);

-- Group owner membership (actor-user-11).
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000011',
  'owner',
  'approved'
);

-- Pending membership for recipient-user-10 (to be approved).
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000010',
  'member',
  'pending'
);

-- Event for RSVP/change notification testing (organizer = member-one from foundation).
insert into public.events (
  id,
  organizer_id,
  locality_id,
  title,
  starts_at,
  status
)
values (
  '40000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Evento de Notificacao',
  '2026-09-01 10:00:00+00',
  'upcoming'
);

-- Family invitation for invitation-accepted notification testing.
insert into private.family_invitations (
  id,
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  expires_at
)
values (
  '40000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000010',
  decode(repeat('ef', 32), 'hex'),
  digest('notify-actor@example.invalid', 'sha256'),
  now() + interval '7 days'
);
