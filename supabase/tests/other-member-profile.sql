-- Onda E Task 7 Step 1 — profile_posts_for visibility (server-side, not client).
-- A post of vila A must NOT appear in the target user's profile for a viewer
-- who is not approved in A. The query must return only what the viewer can see.

begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Add a post in community -001 by member-one, and a post in community -002 by
-- member-one (the target's posts).
insert into public.posts (
  id, locality_id, user_id, community_id, post_type, content, created_at
) values
  (
    '90000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'text',
    'Post da Ajuricaba pelo member-one',
    '2026-08-04 12:00:00+00'
  ),
  (
    '90000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000002',
    'text',
    'Post da Vizinha pelo member-one',
    '2026-08-04 13:00:00+00'
  );

-- Add member-two as APPROVED in community -002 (they already are per fixture),
-- and ensure they are NOT approved in -001 (they are PENDING in -001).
-- This is exactly the cross-vila scenario: same locality, different community.

-- ── POSITIVE: member-two sees the -002 post of member-one (their vila) ────
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid
    )
    where id = '90000000-0000-4000-8000-000000000021'::uuid
  $$,
  'E7+: member-two (approved in -002) sees member-one posts in -002 (their vila)'
);

-- ── NEGATIVE: member-two does NOT see the -001 post of member-one ────────
select is_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid
    )
    where id = '90000000-0000-4000-8000-000000000020'::uuid
  $$,
  'E7-: a pending member of -001 does NOT see posts from -001 of member-one (cross-vila denial)'
);

-- ── NEGATIVE: other-locality user sees nothing of member-one's profile ──
-- other-locality (member-three) is in locality 2 only, no overlap with
-- member-one's locality 1.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select id from public.profile_posts_for(
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'E7-: a member of another locality sees no posts from member-one at all'
);

-- ── NEGATIVE: profile_is_visible_to_viewer denies cross-locality ────────
select is(
  public.profile_is_visible_to_viewer('10000000-0000-4000-8000-000000000001'::uuid),
  false,
  'E7-: profile_is_visible_to_viewer is false for a member of another locality'
);

select * from finish();
rollback;