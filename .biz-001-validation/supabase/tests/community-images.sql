-- RECON-034 — community banner/thumbnail media contract.
--
-- Covers both sides of the boundary the ADR demands:
--   read  — derived from reaching the community; only the object the community
--           references today is reachable, and clearing the path revokes it;
--   write — owner only, proven both through the storage policy and through a
--           direct RPC call with the caller id passed explicitly.
--
-- Runs inside foundation.inc + communities.inc; auto-rollback.
begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- ── anon ──────────────────────────────────────────────────────────────────
set local role anon;

select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'community-images' $$,
  'anon cannot list community images'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('community-images', '70000000-0000-4000-8000-000000000001/banner', null) $$,
  '42501',
  null,
  'anon cannot insert into the community-images bucket'
);

-- ── Owner (member-one owns Vila Ajuricaba) ────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values (
       'community-images',
       '70000000-0000-4000-8000-000000000001/banner',
       '10000000-0000-4000-8000-000000000001'::uuid
     ) $$,
  'the owner can upload a banner inside the community folder'
);

-- ── Common member (member-four belongs to the community but is not owner) ──
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values (
       'community-images',
       '70000000-0000-4000-8000-000000000001/thumbnail',
       '10000000-0000-4000-8000-000000000004'::uuid
     ) $$,
  '42501',
  null,
  'a common member cannot upload a community image'
);

-- ── Account with no community reach (member-five has no locality) ─────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values (
       'community-images',
       '70000000-0000-4000-8000-000000000001/intruder',
       '10000000-0000-4000-8000-000000000005'::uuid
     ) $$,
  '42501',
  null,
  'an account outside the community cannot upload to its folder'
);

-- ── Point the community at the banner, then read as a locality member ─────
reset role;
update public.communities
set banner_path = '70000000-0000-4000-8000-000000000001/banner'
where id = '70000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from storage.objects
     where bucket_id = 'community-images'
       and name = '70000000-0000-4000-8000-000000000001/banner' $$,
  'a member of the community locality can read the current banner'
);

-- ── Account outside the locality cannot read it (negative for read) ───────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'community-images' $$,
  'an account outside the locality cannot read the community image'
);

-- ── An unreferenced object is not reachable even to a locality member ─────
reset role;
insert into storage.objects (bucket_id, name, owner)
values (
  'community-images',
  '70000000-0000-4000-8000-000000000001/orphan',
  '10000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from storage.objects
     where bucket_id = 'community-images'
       and name = '70000000-0000-4000-8000-000000000001/orphan' $$,
  'an object no community references is unreachable, orphan or not'
);

-- ── Clearing the path revokes the object in the same operation ────────────
reset role;
update public.communities
set banner_path = null
where id = '70000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from storage.objects
     where bucket_id = 'community-images'
       and name = '70000000-0000-4000-8000-000000000001/banner' $$,
  'removing the image pointer makes the old object unreachable'
);

-- ── The pointer RPC: not executable by a member, owner-only when invoked
--    directly (the service_role path resolves the caller and passes it) ────
select throws_ok(
  $$ select public.set_community_image(
       '70000000-0000-4000-8000-000000000001',
       'banner',
       '70000000-0000-4000-8000-000000000001/banner',
       '10000000-0000-4000-8000-000000000004'
     ) $$,
  '42501',
  null,
  'a common member cannot execute the image pointer RPC directly'
);

reset role;

select lives_ok(
  $$ select public.set_community_image(
       '70000000-0000-4000-8000-000000000001',
       'thumbnail',
       '70000000-0000-4000-8000-000000000001/thumbnail',
       '10000000-0000-4000-8000-000000000001'
     ) $$,
  'the owner pointer update succeeds through the RPC'
);

select throws_ok(
  $$ select public.set_community_image(
       '70000000-0000-4000-8000-000000000001',
       'banner',
       '70000000-0000-4000-8000-000000000001/banner',
       '10000000-0000-4000-8000-000000000004'
     ) $$,
  '42501',
  null,
  'the RPC refuses a non-owner caller even through the privileged path'
);

select * from finish();
rollback;
