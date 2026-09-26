-- Onda F Task 9 — event photos storage policies.

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc
\ir fixtures/storage.inc

-- ── Anon cannot access event-photos ────────────────────────────────────────
set local role anon;

select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'event-photos' $$,
  'anon cannot list event photos'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('event-photos', 'anon.jpg', null) $$,
  '42501',
  null,
  'anon cannot insert into event-photos bucket'
);

-- ── Member can upload their own photo ───────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner)
    values ('event-photos', 'test-member-one.jpg', '10000000-0000-4000-8000-000000000001'::uuid)
  $$,
  'F9+: member can insert their own event photo'
);

-- The scoped read policy exposes the photo only through a post in the
-- viewer's locality that references it via photo_path. Create that post as
-- member-one so the visibility assertion below is about the policy, not the
-- fixture setup.
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content, photo_path)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'photo',
      'Foto do evento',
      'test-member-one.jpg'
    )
  $$,
  'F9+: post referencing the photo exists in member-one locality'
);

-- ── Member cannot see another member's photo unless post is visible ─────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- member-two is in the same locality as member-one, so they CAN see posts
-- and therefore photos linked to those posts. This tests that the scoped
-- policy works: photos are accessible when the underlying post is visible.
select isnt_empty(
  $$
    select 1 from storage.objects
    where bucket_id = 'event-photos'
      and name = 'test-member-one.jpg'
  $$,
  'F9+: member in same locality can see another member event photo (via post scope)'
);

select * from finish();
rollback;