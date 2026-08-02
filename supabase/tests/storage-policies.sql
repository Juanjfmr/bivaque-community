begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

\ir fixtures/foundation.inc
\ir fixtures/storage.inc

-- ── Anon access ──────────────────────────────────────────────────────────

set local role anon;

select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'avatars' $$,
  'anon cannot list avatars'
);

select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'event-photos' $$,
  'anon cannot list event photos'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('avatars', 'anon.jpg', null) $$,
  42501,
  null,
  'anon cannot insert into avatars bucket'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('event-photos', 'anon.jpg', null) $$,
  42501,
  null,
  'anon cannot insert into event-photos bucket'
);

-- ── Member One (Manaus locality) ─────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'avatars' and owner = '10000000-0000-4000-8000-000000000001'::uuid $$,
  'member can see their own avatar'
);

select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'avatars' and owner = '10000000-0000-4000-8000-000000000002'::uuid $$,
  'member can view another member avatar'
);

select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'event-photos' $$,
  'locality member can view event photos'
);

-- The Storage API forbids direct DELETE from storage tables (protect_delete
-- trigger), so the delete paths are proven at the policy level instead.
select isnt_empty(
  $$ select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_delete_own' $$,
  'avatar delete policy exists for the owning user'
);

select is_empty(
  $$ select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE' and policyname not in ('avatars_delete_own', 'event_photos_delete_own') $$,
  'no permissive delete policy exists on storage.objects'
);

-- ── Non-member user ──────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'avatars' $$,
  'non-member can still view avatars'
);

select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'event-photos' $$,
  'non-member cannot view event photos'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'event-photos',
      'intruder.jpg',
      '10000000-0000-4000-8000-000000000005',
      '{"mimetype":"image/jpeg","size":100}'
    )
    returning 1
  $$,
  42501,
  null,
  'non-member cannot insert into event-photos bucket'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'avatars',
      '10000000-0000-4000-8000-000000000001/hijack.jpg',
      '10000000-0000-4000-8000-000000000005',
      '{"mimetype":"image/jpeg","size":100}'
    )
    returning 1
  $$,
  42501,
  null,
  'non-member cannot insert into another user avatar folder'
);

select * from finish();
rollback;
