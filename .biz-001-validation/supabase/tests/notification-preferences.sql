begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc

reset role;

-- ── notification_preferences: RLS own-row ──────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.notification_preferences (user_id)
    values ('10000000-0000-4000-8000-000000000001')
  $$,
  'authenticated inserts their own notification_preferences row'
);

select is(
  (select messages from public.notification_preferences
   where user_id = '10000000-0000-4000-8000-000000000001'),
  true,
  'authenticated reads back their own preferences row with defaults'
);

select lives_ok(
  $$
    update public.notification_preferences
    set events = false
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'authenticated updates their own row'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$
    select 1 from public.notification_preferences
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'another authenticated user cannot read someone else row'
);

select is(
  (select count(*) from public.notification_preferences
   where user_id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'another user has no row (update on other row is a silent 0-row no-op)'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select events from public.notification_preferences
   where user_id = '10000000-0000-4000-8000-000000000001'),
  false,
  'owner sees their own updated row after other-user denial'
);

-- ── avatars bucket exists (baseline 005) ───────────────────────────────────

reset role;

select isnt_empty(
  $$ select 1 from storage.buckets where id = 'avatars' $$,
  'avatars storage bucket exists'
);

select * from finish();
rollback;