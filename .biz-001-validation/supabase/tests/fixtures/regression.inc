-- Regression fixtures: extends foundation.inc with comprehensive seed data
-- covering the full pilot model: all family invitation states, DM
-- conversations + messages, reports in open/resolved states, posts, comments,
-- groups, events, RSVPs, recommendations, notifications, and storage objects.
-- Must be included AFTER foundation.inc (and optionally trust.inc, authz.inc)
-- inside a transaction. Uses example.invalid identities and fixed UUIDs.
-- All IDs use the e0000000 prefix to avoid collisions with existing fixtures.
-- Never real data.

\ir trust.inc
\ir authz.inc

-- ═══════════════════════════════════════════════════════════════════════════════
-- FAMILY INVITATIONS: revoked and expired states
-- ═══════════════════════════════════════════════════════════════════════════════

insert into private.family_invitations (
  id, inviter_user_id, token_digest, invitee_email_digest,
  status, expires_at, created_at
)
values (
  'e0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('af', 32), 'hex'),
  decode(repeat('bf', 32), 'hex'),
  'revoked',
  now() + interval '7 days',
  '2026-08-02 10:00:00+00'
);

insert into private.family_invitations (
  id, inviter_user_id, token_digest, invitee_email_digest,
  status, expires_at, created_at
)
values (
  'e0000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('cf', 32), 'hex'),
  decode(repeat('df', 32), 'hex'),
  'expired',
  '2026-07-26 12:00:00+00',
  '2026-07-19 12:00:00+00'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMUNITY FEED: posts and comments
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.posts (
  id, locality_id, user_id, post_type, content, created_at
)
values (
  'e0000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'Post de regressao do Bivaque!',
  '2026-08-02 14:00:00+00'
);

insert into public.comments (
  id, post_id, user_id, content, created_at
)
values (
  'e0000000-0000-4000-8000-000000000011',
  'e0000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000002',
  'Comentario de regressao!',
  '2026-08-02 14:05:00+00'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GROUPS: public and private
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
)
values (
  'e0000000-0000-4000-8000-000000000020',
  'Grupo de Regressao Publico',
  'Grupo publico para testes de regressao',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
)
values (
  'e0000000-0000-4000-8000-000000000021',
  'Grupo de Regressao Privado',
  'Grupo privado para testes de regressao',
  'private',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.group_memberships (group_id, user_id, role, status)
values
  ('e0000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('e0000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000002', 'member', 'approved'),
  ('e0000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('e0000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000002', 'member', 'pending');

-- ═══════════════════════════════════════════════════════════════════════════════
-- EVENTS and RSVPs
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.events (
  id, organizer_id, locality_id, title, description,
  starts_at, ends_at, venue, status
)
values (
  'e0000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Encontro de Regressao',
  'Evento para testes de regressao da comunidade.',
  '2026-08-15 09:00:00+00',
  '2026-08-15 12:00:00+00',
  'Parque Municipal de Manaus',
  'upcoming'
);

insert into public.events (
  id, organizer_id, locality_id, title, starts_at, status
)
values (
  'e0000000-0000-4000-8000-000000000031',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Evento Cancelado Regressao',
  '2026-08-20 10:00:00+00',
  'cancelled'
);

insert into public.event_rsvps (event_id, user_id, status)
values
  ('e0000000-0000-4000-8000-000000000030', '10000000-0000-4000-8000-000000000002', 'going');

-- ═══════════════════════════════════════════════════════════════════════════════
-- RECOMMENDATIONS: request, reply, and save
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.recommendation_requests (
  id, author_id, locality_id, title, body, category, created_at
)
values (
  'e0000000-0000-4000-8000-000000000040',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Algum mecanico de confianca em Manaus?',
  'Estou procurando um mecanico honesto na zona sul de Manaus.',
  'transporte',
  '2026-08-02 14:00:00+00'
);

insert into public.recommendation_replies (
  id, request_id, author_id, body, created_at
)
values (
  'e0000000-0000-4000-8000-000000000041',
  'e0000000-0000-4000-8000-000000000040',
  '10000000-0000-4000-8000-000000000002',
  'Recomendo a oficina do Joao na zona sul. Muito confiavel.',
  '2026-08-02 15:00:00+00'
);

insert into public.recommendation_saves (user_id, request_id, saved_at)
values (
  '10000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000040',
  '2026-08-02 16:00:00+00'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DM: conversation + messages (member-one ↔ member-two, family context)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.dm_conversations (
  id, participant_a, participant_b, context_type, context_id
)
values (
  'e0000000-0000-4000-8000-000000000050',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'accepted_family',
  '20000000-0000-4000-8000-000000000001'
);

insert into public.dm_messages (
  id, conversation_id, sender_id, content, created_at
)
values
  ('e0000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-000000000050', '10000000-0000-4000-8000-000000000001', 'Ola! Bem-vindo a familia!', '2026-08-02 15:00:00+00'),
  ('e0000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000050', '10000000-0000-4000-8000-000000000002', 'Obrigado! Muito feliz.', '2026-08-02 15:05:00+00'),
  ('e0000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-000000000050', '10000000-0000-4000-8000-000000000001', 'Qualquer duvida pode me chamar!', '2026-08-02 15:10:00+00');

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORTS: open and resolved
-- ═══════════════════════════════════════════════════════════════════════════════

-- Post for member-two to report
insert into public.posts (
  id, locality_id, user_id, post_type, content, created_at
)
values (
  'e0000000-0000-4000-8000-000000000060',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'Post para teste de denuncia de regressao',
  '2026-08-02 16:00:00+00'
);

-- Comment for member-one to report
insert into public.comments (
  id, post_id, user_id, content, created_at
)
values (
  'e0000000-0000-4000-8000-000000000061',
  'e0000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000002',
  'Comentario para denuncia de regressao',
  '2026-08-02 16:05:00+00'
);

-- Group for member-two to report (member-one's group)
insert into public.groups (
  id, name, visibility, locality_id, created_by, owner_user_id
)
values (
  'e0000000-0000-4000-8000-000000000070',
  'Grupo para Denuncia',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.group_memberships (group_id, user_id, role, status)
values (
  'e0000000-0000-4000-8000-000000000070',
  '10000000-0000-4000-8000-000000000001',
  'owner',
  'approved'
);

-- Open report: member-one reports member-two's comment
insert into public.reports (
  id, reporter_user_id, target_type, target_id, reason, status
)
values (
  'e0000000-0000-4000-8000-000000000080',
  '10000000-0000-4000-8000-000000000001',
  'comment',
  'e0000000-0000-4000-8000-000000000061',
  'Comentario com conteudo suspeito para revisao pela equipe',
  'open'
);

-- Resolved report: member-two reports member-one's post
insert into public.reports (
  id, reporter_user_id, target_type, target_id, reason, status, resolved_at
)
values (
  'e0000000-0000-4000-8000-000000000081',
  '10000000-0000-4000-8000-000000000002',
  'post',
  'e0000000-0000-4000-8000-000000000060',
  'Post verificado e resolvido pelo operador da plataforma',
  'resolved',
  '2026-08-02 17:00:00+00'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS: seeded by service_role for read-back testing
-- ═══════════════════════════════════════════════════════════════════════════════

reset role;

insert into public.notifications (
  id, recipient_user_id, actor_user_id, type, action, target_type, target_id, created_at
)
values
  ('e0000000-0000-4000-8000-000000000090', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'comment', 'created', 'post', 'e0000000-0000-4000-8000-000000000010', '2026-08-02 16:00:00+00'),
  ('e0000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'event_rsvp', 'rsvped', 'event', 'e0000000-0000-4000-8000-000000000030', '2026-08-02 16:30:00+00'),
  ('e0000000-0000-4000-8000-000000000092', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'invitation_accepted', 'accepted', 'family_invitation', '20000000-0000-4000-8000-000000000001', '2026-08-03 12:00:00+00');

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORAGE: avatars and event photos
-- ═══════════════════════════════════════════════════════════════════════════════

insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'avatars',
  '10000000-0000-4000-8000-000000000001/photo.jpg',
  '10000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/jpeg","size":100000}'
);

insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'event-photos',
  'regression/group.jpg',
  '10000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/jpeg","size":500000}'
);

-- The scoped read policy (event_photos_select_scoped) exposes a photo only
-- through a post in the viewer's locality referencing it via photo_path.
-- This post makes the regression "locality member can view event photos"
-- assertion test the policy, not the fixture setup.
insert into public.posts (locality_id, user_id, post_type, content, photo_path)
values (
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'photo',
  'Foto de regressao',
  'regression/group.jpg'
);
