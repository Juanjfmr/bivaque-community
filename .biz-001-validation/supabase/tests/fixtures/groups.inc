-- Groups module fixtures: extends foundation.inc with groups, memberships,
-- and moderation scenarios. Must be included AFTER foundation.inc inside a
-- transaction. Uses example.invalid identities and fixed UUIDs. Never real data.

-- Public group created by member-one (verified holder)
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
)
values (
  '40000000-0000-4000-8000-000000000001',
  'Grupo de Corrida',
  'Corridas matinais no parque',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

-- Private group created by member-one
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
)
values (
  '40000000-0000-4000-8000-000000000002',
  'Clube do Livro',
  'Discussões mensais sobre literatura brasileira',
  'private',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

-- Owner membership (member-one → public group)
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'owner',
  'approved'
);

-- Owner membership (member-one → private group)
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'owner',
  'approved'
);

-- Approved member in the public group (member-two)
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'member',
  'approved'
);

-- Pending request in the private group (member-two)
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'member',
  'pending'
);
