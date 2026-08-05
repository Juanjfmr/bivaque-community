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
