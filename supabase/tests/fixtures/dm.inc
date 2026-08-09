-- DM module fixtures: extends foundation.inc. Must be included AFTER
-- foundation.inc inside a transaction.
-- Uses example.invalid identities and fixed UUIDs. Never real data.

-- Additional users for DM testing (all verified Manaus members).
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000008', 'member-dm-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000009', 'member-dm-b@example.invalid'),
  ('10000000-0000-4000-8000-000000000010', 'member-dm-c@example.invalid');

insert into public.locality_memberships (user_id, locality_id)
values
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001');

insert into public.profiles (user_id, locality_id, display_name, visibility)
values
  (
    '10000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000001',
    'DM User A',
    'locality_members'
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000001',
    'DM User B',
    'locality_members'
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    'DM User C',
    'locality_members'
  );

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  (
    '10000000-0000-4000-8000-000000000008',
    'verified',
    'active_federal_military',
    '2026-08-02 12:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    'verified',
    'veteran',
    '2026-08-02 12:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    'verified',
    'veteran',
    '2026-08-02 12:00:00+00'
  );

-- ── shared group: DM User A (008) and DM User B (009) ────────────────────────

insert into public.groups (
  id,
  name,
  visibility,
  locality_id,
  created_by,
  owner_user_id
)
values (
  '40000000-0000-4000-8000-000000000001',
  'Grupo de Teste DM',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000008'
);

insert into public.group_memberships (group_id, user_id, role, status)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000008',
    'owner',
    'approved'
  ),
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000009',
    'member',
    'approved'
  );

-- ── shared event: DM User A (008) and DM User B (009) both RSVP ─────────────

insert into public.events (
  id,
  organizer_id,
  locality_id,
  title,
  starts_at
)
values (
  '40000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Evento DM Compartilhado',
  '2026-09-10 10:00:00+00'
);

insert into public.event_rsvps (event_id, user_id, status)
values
  (
    '40000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000008',
    'going'
  ),
  (
    '40000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000009',
    'interested'
  );

-- ── shared recommendation: 008 creates request, 009 replies ──────────────────

insert into public.recommendation_requests (
  id,
  author_id,
  locality_id,
  title,
  body,
  category
)
values (
  '40000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000001',
  'Recomendacao de teste DM',
  'Preciso de uma recomendacao para testar o sistema de mensagens.',
  'outros'
);

insert into public.recommendation_replies (request_id, author_id, body)
values (
  '40000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000009',
  'Aqui esta uma recomendacao para o teste de DM.'
);

-- ── family link: DM User A (008) invites and DM User B (009) accepts ─────────

insert into private.family_invitations (
  id,
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  status,
  accepted_by_user_id,
  accepted_at,
  expires_at
)
values (
  '40000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000008',
  decode(repeat('d0', 32), 'hex'),
  decode(repeat('e0', 32), 'hex'),
  'accepted',
  '10000000-0000-4000-8000-000000000009',
  '2026-08-03 12:00:00+00',
  now() + interval '7 days'
);

insert into private.family_account_links (
  invitation_id,
  holder_user_id,
  family_user_id
)
values (
  '40000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000009'
);

-- ── block: DM User A (008) blocks DM User C (010) ────────────────────────────

insert into public.dm_blocks (blocker_user_id, blocked_user_id)
values (
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000010'
);
