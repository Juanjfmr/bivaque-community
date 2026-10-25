-- Fixtures do redesenho da Comunidade (RED-003). Esquema novo, sem a vila.
-- Deve ser incluído DEPOIS de foundation.inc, dentro da transação do teste.
-- Identidades example.invalid e UUIDs fixos. Nunca dado real.
--
-- foundation.inc traz: member-one (…001, verificado, cidade A=…001),
-- member-two (…002, cidade A), other-locality (…003, cidade EX=…002),
-- hidden-member (…004, cidade A) e non-member (…005, sem cidade).
--
-- Grupos (cidade A = 00000000-0000-4000-8000-000000000001):
--   810…001 Aberto/ativo (dono 001)
--   810…002 Fechado/ativo (dono 001, moderador 002)
--   810…003 Encerrado (dono 001, participante 001)
--   810…004 Aberto/ativo de outra cidade (dono 003)
-- member-four (004) é membro da cidade A e NÃO participa de grupo nenhum.

insert into public.groups (id, name, description, rules, visibility, status, locality_id, created_by, owner_user_id)
values
  (
    '81000000-0000-4000-8000-000000000001',
    'Grupo Aberto',
    'Grupo de que qualquer membro da cidade participa',
    'Seja gentil',
    'open',
    'active',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    'Grupo Fechado',
    'Grupo de que se entra por pedido',
    null,
    'closed',
    'active',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '81000000-0000-4000-8000-000000000003',
    'Grupo Encerrado',
    'Grupo que foi encerrado pelo dono',
    null,
    'open',
    'archived',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '81000000-0000-4000-8000-000000000004',
    'Grupo de Outra Cidade',
    'Grupo aberto de outra cidade',
    null,
    'open',
    'active',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003'
  );

insert into public.group_memberships (group_id, user_id, role, status, notify_level)
values
  ('81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'approved', 'all'),
  ('81000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'owner', 'approved', 'highlights'),
  ('81000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'moderator', 'approved', 'all'),
  ('81000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'owner', 'approved', 'all'),
  ('81000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'owner', 'approved', 'all');

insert into public.posts (id, locality_id, user_id, group_id, post_type, content)
values
  (
    '91000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    'text',
    'Publicação no grupo aberto'
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000002',
    'text',
    'Publicação no grupo fechado'
  ),
  (
    '91000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000003',
    'text',
    'Publicação no grupo encerrado'
  );