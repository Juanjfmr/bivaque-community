-- Community entity fixtures: extends foundation.inc with two communities in
-- the same Manaus locality, plus the actor memberships that the scope test
-- pivots on. Must be included AFTER foundation.inc inside a transaction.
-- Uses example.invalid identities and fixed UUIDs. Never real data.

-- foundation.inc already provides:
--   member-one   (001): verified active_federal_military, Manaus member, locality_members
--   member-two   (002): Manaus member, locality_members
--   other-locality (003): verified military_pensioner, test-other-locality member
--   hidden-member (004): Manaus member, hidden visibility
--   non-member   (005): authenticated, no membership, no verification

insert into public.communities (
  id, locality_id, name, description, created_by, owner_user_id
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Vila Ajuricaba',
    'Moradores da vila',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Vila Vizinha',
    'Outra vila da mesma cidade',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.community_memberships (community_id, user_id, role, status)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'member', 'approved'),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'member', 'pending'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'member', 'approved');

-- Internal groups of the Ajuricaba community (community A):
--   001 = public   "Vendas da vila" -001 owned
--   002 = private  "Sindicos"      -001 owned
--   003 = public   "Jardinagem"    -004 owned (transferred on 004's removal)
insert into public.groups (
  id, name, description, visibility, locality_id, community_id, created_by, owner_user_id
)
values
  (
    '80000000-0000-4000-8000-000000000001',
    'Vendas da vila',
    'Repasses entre moradores',
    'public',
    '00000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    'Sindicos',
    'Coordenacao interna',
    'private',
    '00000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.groups (
  id, name, description, visibility, locality_id, community_id, created_by, owner_user_id
)
values (
  '80000000-0000-4000-8000-000000000003',
  'Jardinagem',
  'Grupo criado por um morador comum',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000004'
);

insert into public.group_memberships (group_id, user_id, role, status)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'owner', 'approved');

insert into public.posts (
  id, locality_id, user_id, community_id, post_type, content, created_at
)
values (
  '90000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'text',
  'Caiu a agua na quadra 3',
  '2026-08-04 09:00:00+00'
);

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
