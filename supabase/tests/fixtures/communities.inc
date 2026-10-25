-- RED-003: a vila saiu. Este arquivo vira a fixture de GRUPOS da cidade de
-- Manaus, mantendo os UUIDs de grupo (800…001..003) e de publicação
-- (900…002/003) que os testes já usavam, agora no esquema novo.
-- Deve ser incluído DEPOIS de foundation.inc, dentro da transação do teste.

-- Grupos:
--   800…001 Aberto  "Vendas"    -001 dono
--   800…002 Fechado "Sindicos"  -001 dono
--   800…003 Aberto  "Jardinagem" -004 dono (morador comum)
insert into public.groups (
  id, name, description, visibility, status, locality_id, created_by, owner_user_id
)
values
  (
    '80000000-0000-4000-8000-000000000001',
    'Vendas da cidade',
    'Repasses entre moradores',
    'open',
    'active',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    'Sindicos',
    'Coordenacao interna',
    'closed',
    'active',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '80000000-0000-4000-8000-000000000003',
    'Jardinagem',
    'Grupo criado por um morador comum',
    'open',
    'active',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004'
  );

insert into public.group_memberships (group_id, user_id, role, status, notify_level)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'approved', 'all'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'owner', 'approved', 'highlights'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'owner', 'approved', 'all');

insert into public.posts (
  id, locality_id, user_id, group_id, post_type, content, created_at
)
values
  (
    '90000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001',
    'text',
    'Passo a geladeira em marco',
    '2026-08-04 10:00:00+00'
  ),
  (
    '90000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000002',
    'text',
    'Reuniao de coordenacao quinta',
    '2026-08-04 11:00:00+00'
  );