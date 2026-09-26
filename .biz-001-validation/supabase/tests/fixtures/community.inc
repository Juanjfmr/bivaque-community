-- Community feed fixtures: extends foundation.inc with post/comment
-- test data. Must be included AFTER foundation.inc inside a transaction.
-- Uses example.invalid identities and fixed UUIDs. Never real data.

-- foundation.inc already provides:
--   member-one   (001): verified active_federal_military, Manaus member
--   member-two   (002): Manaus member (verified veteran via trust.inc)
--   other-locality (003): verified military_pensioner, test-other-locality member
--   hidden-member (004): Manaus member, not verified
--   non-member   (005): authenticated, no membership, no verification

-- seed a text post by member-one for read-back tests
insert into public.posts (id, locality_id, user_id, post_type, content, created_at)
values (
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'Bem-vindos ao Bivaque Manaus!',
  '2026-08-02 14:00:00+00'
);

-- seed a comment on that post by member-two
insert into public.comments (id, post_id, user_id, content, created_at)
values (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Que legal!',
  '2026-08-02 14:05:00+00'
);
