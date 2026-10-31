-- Reports fixtures: extends foundation.inc with reportable content and
-- report test data. Must be included AFTER foundation.inc inside a
-- transaction. Uses example.invalid identities and fixed UUIDs. Never real data.

-- foundation.inc already provides:
--   member-one   (001): verified active_federal_military, Manaus member
--   member-two   (002): Manaus member
--   other-locality (003): verified military_pensioner, test-other-locality member
--   hidden-member (004): Manaus member, not verified
--   non-member   (005): authenticated, no membership, no verification

-- Create a post by member-one for testing
insert into public.posts (id, locality_id, user_id, post_type, content, created_at)
values (
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'Post para teste de denuncia',
  '2026-08-02 15:00:00+00'
);

-- Create a comment by member-two on that post
insert into public.comments (id, post_id, user_id, content, created_at)
values (
  '70000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Comentario para teste de denuncia',
  '2026-08-02 15:05:00+00'
);

-- Create a group by member-one for testing
insert into public.groups (id, name, visibility, locality_id, created_by, owner_user_id)
values (
  '80000000-0000-4000-8000-000000000001',
  'Grupo Teste Denuncia',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.group_memberships (group_id, user_id, role, status)
values (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'owner',
  'approved'
);
