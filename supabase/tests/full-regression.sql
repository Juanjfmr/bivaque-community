begin;

create extension if not exists pgtap with schema extensions;
select plan(83);

\ir fixtures/foundation.inc
\ir fixtures/regression.inc

-- ═══════════════════════════════════════════════════════════════════════════════
-- SCHEMA: all tables exist
-- ═══════════════════════════════════════════════════════════════════════════════

select has_table('public', 'localities', 'localities');
select has_table('public', 'locality_memberships', 'locality_memberships');
select has_table('public', 'profiles', 'profiles');
select has_table('public', 'waitlist', 'waitlist');
select has_table('public', 'posts', 'posts');
select has_table('public', 'comments', 'comments');
select has_table('public', 'groups', 'groups');
select has_table('public', 'group_memberships', 'group_memberships');
select has_table('public', 'recommendation_requests', 'recommendation_requests');
select has_table('public', 'recommendation_replies', 'recommendation_replies');
select has_table('public', 'recommendation_saves', 'recommendation_saves');
select has_table('public', 'events', 'events');
select has_table('public', 'event_rsvps', 'event_rsvps');
select has_table('public', 'notifications', 'notifications');
select has_table('public', 'dm_conversations', 'dm_conversations');
select has_table('public', 'dm_messages', 'dm_messages');
select has_table('public', 'dm_blocks', 'dm_blocks');
select has_table('public', 'dm_reports', 'dm_reports');
select has_table('public', 'reports', 'reports');
select has_table('private', 'verification_outcomes', 'verification_outcomes');
select has_table('private', 'family_invitations', 'family_invitations');
select has_table('private', 'family_account_links', 'family_account_links');

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS: enabled + forced on all application tables
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private')
      and c.relname in (
        'localities', 'locality_memberships', 'profiles', 'waitlist',
        'posts', 'comments', 'groups', 'group_memberships',
        'recommendation_requests', 'recommendation_replies', 'recommendation_saves',
        'events', 'event_rsvps', 'notifications',
        'dm_conversations', 'dm_messages', 'dm_blocks', 'dm_reports',
        'reports',
        'verification_outcomes', 'family_invitations', 'family_account_links'
      )
      and c.relrowsecurity
      and c.relforcerowsecurity
  $$,
  array[22::bigint],
  'RLS enabled and forced on all 22 application tables'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRIVATE SCHEMA: zero Data API privileges
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'private'
      and grantee in ('anon', 'authenticated')
  $$,
  array[0::bigint],
  'anon and authenticated have zero private table privileges'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- POLICY EXISTENCE: key policies present
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'localities'
      and policyname = 'localities_select_same_membership'
  $$,
  array[1::bigint],
  'localities_select_same_membership policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_select_visible_in_locality'
  $$,
  array[1::bigint],
  'profiles_select_visible_in_locality policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_insert_self'
  $$,
  array[1::bigint],
  'profiles_insert_self policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_update_self'
  $$,
  array[1::bigint],
  'profiles_update_self policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'posts'
      and policyname = 'posts_select_locality_member'
  $$,
  array[1::bigint],
  'posts_select_locality_member policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname = 'notifications_select_recipient'
  $$,
  array[1::bigint],
  'notifications_select_recipient policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'dm_conversations'
      and policyname = 'dm_conversations_select_participant'
  $$,
  array[1::bigint],
  'dm_conversations_select_participant policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'reports'
      and policyname = 'reports_select_reporter_only'
  $$,
  array[1::bigint],
  'reports_select_reporter_only policy exists'
);

select results_eq(
  $$
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'reports'
      and policyname = 'reports_insert_authenticated'
  $$,
  array[1::bigint],
  'reports_insert_authenticated policy exists'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- POSITIVE: verified member (001) reads their locality data
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select slug from public.localities order by slug',
  $$ values ('manaus-am'::text) $$,
  'verified member reads Manaus'
);

select results_eq(
  'select display_name from public.profiles order by display_name',
  $$ values ('Hidden Member'::text), ('Member One'::text), ('Member Two'::text) $$,
  'verified member sees visible profiles in their locality'
);

select results_eq(
  'select count(*) from public.locality_memberships',
  array[1::bigint],
  'verified member sees only their own membership'
);

-- ── Community feed ────────────────────────────────────────────────────────────

select results_eq(
  $$
    select content from public.posts
    where id = 'e0000000-0000-4000-8000-000000000010'
  $$,
  $$ values ('Post de regressao do Bivaque!'::text) $$,
  'verified member can read regression post'
);

select results_eq(
  $$
    select content from public.comments
    where id = 'e0000000-0000-4000-8000-000000000011'
  $$,
  $$ values ('Comentario de regressao!'::text) $$,
  'verified member can read regression comment'
);

-- ── Groups ────────────────────────────────────────────────────────────────────

select results_eq(
  $$
    select count(*) from public.groups
    where locality_id = '00000000-0000-4000-8000-000000000001'
  $$,
  array[3::bigint],
  'verified member sees regression groups in their locality'
);

select results_eq(
  $$
    select count(*) from public.group_memberships
    where group_id = 'e0000000-0000-4000-8000-000000000020'
  $$,
  array[2::bigint],
  'public group member list is visible'
);

select results_eq(
  $$
    select count(*) from public.group_memberships
    where group_id = 'e0000000-0000-4000-8000-000000000021'
  $$,
  array[2::bigint],
  'owner sees pending and approved private group memberships'
);

-- ── Events ────────────────────────────────────────────────────────────────────

select results_eq(
  $$
    select count(*) from public.events
    where locality_id = '00000000-0000-4000-8000-000000000001'
  $$,
  array[2::bigint],
  'verified member sees regression events'
);

select results_eq(
  $$
    select status::text from public.event_rsvps
    where event_id = 'e0000000-0000-4000-8000-000000000030'
  $$,
  $$ values ('going'::text) $$,
  'verified member sees RSVPs for regression event'
);

-- ── Recommendations ───────────────────────────────────────────────────────────

select results_eq(
  $$
    select title from public.recommendation_requests
    where id = 'e0000000-0000-4000-8000-000000000040'
  $$,
  $$ values ('Algum mecanico de confianca em Manaus?'::text) $$,
  'verified member reads regression recommendation'
);

select results_eq(
  $$
    select count(*) from public.recommendation_replies
    where request_id = 'e0000000-0000-4000-8000-000000000040'
  $$,
  array[1::bigint],
  'verified member sees recommendation replies'
);

-- ── DM ────────────────────────────────────────────────────────────────────────

select results_eq(
  $$
    select count(*) from public.dm_conversations
    where participant_a = '10000000-0000-4000-8000-000000000001'
       or participant_b = '10000000-0000-4000-8000-000000000001'
  $$,
  array[1::bigint],
  'member-one sees their DM conversation'
);

select results_eq(
  $$
    select count(*) from public.dm_messages
    where conversation_id = 'e0000000-0000-4000-8000-000000000050'
  $$,
  array[3::bigint],
  'member-one sees all 3 messages in their conversation'
);

-- ── Notifications ─────────────────────────────────────────────────────────────

select results_eq(
  $$
    select count(*) from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  array[6::bigint],
  'member-one sees their notifications (seeded + trigger-generated)'
);

-- ── Reports ───────────────────────────────────────────────────────────────────

select results_eq(
  $$
    select count(*) from public.reports
    where reporter_user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  array[1::bigint],
  'member-one sees their own report'
);

-- ── Storage ───────────────────────────────────────────────────────────────────

select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'avatars' and owner = '10000000-0000-4000-8000-000000000001'::uuid $$,
  'locality member can see own avatar'
);

select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'event-photos' $$,
  'locality member can view event photos'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- POSITIVE: member-two (002) sees their own saves
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select count(*) from public.recommendation_saves
  $$,
  array[1::bigint],
  'member-two sees only their own save'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: nonmember (005) sees nothing
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.localities',
  'nonmember sees no localities'
);

select is_empty(
  'select 1 from public.profiles',
  'nonmember sees no profiles'
);

select is_empty(
  'select 1 from public.posts',
  'nonmember sees no posts'
);

select is_empty(
  'select 1 from public.groups',
  'nonmember sees no groups'
);

select is_empty(
  'select 1 from public.events',
  'nonmember sees no events'
);

select is_empty(
  'select 1 from public.recommendation_requests',
  'nonmember sees no recommendation requests'
);

select is_empty(
  'select 1 from public.dm_conversations',
  'nonmember sees no DM conversations'
);

select is_empty(
  'select 1 from public.notifications',
  'nonmember sees no notifications'
);

select is_empty(
  'select 1 from public.reports',
  'nonmember sees no reports'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: waitlist user (006, pending) sees nothing
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.localities',
  'waitlist user sees no localities'
);

select is_empty(
  'select 1 from public.profiles',
  'waitlist user sees no profiles'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: private schema access denied to authenticated
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  'select 1 from private.verification_outcomes',
  42501, null,
  'authenticated cannot read verification_outcomes'
);

select throws_ok(
  'select 1 from private.family_invitations',
  42501, null,
  'authenticated cannot read family_invitations'
);

select throws_ok(
  'select 1 from private.family_account_links',
  42501, null,
  'authenticated cannot read family_account_links'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: cross-user mutation denied
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    update public.profiles
    set display_name = 'Hacked'
    where user_id = '10000000-0000-4000-8000-000000000001'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'member-two cannot update member-one profile'
);

select results_eq(
  $$
    update public.posts
    set content = 'Hacked'
    where id = 'e0000000-0000-4000-8000-000000000010'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'member-two cannot update member-one post'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: member-one sees only their own reports (not member-two's)
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select count(*) from public.reports
  $$,
  array[1::bigint],
  'member-one sees only their own reports'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: member-one sees only their own notifications
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*) from public.notifications
  $$,
  array[6::bigint],
  'member-one sees only their own notifications (not member-twos)'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: anon cannot execute authorization helpers
-- ═══════════════════════════════════════════════════════════════════════════════

set local role anon;

select throws_ok(
  'select private.is_verified_locality_member(''00000000-0000-4000-8000-000000000001'')',
  null, null,
  'anon cannot execute is_verified_locality_member'
);

select throws_ok(
  'select private.is_verified_holder(''10000000-0000-4000-8000-000000000001'')',
  null, null,
  'anon cannot execute is_verified_holder'
);

select throws_ok(
  'select private.can_dm_between(''10000000-0000-4000-8000-000000000001'', ''10000000-0000-4000-8000-000000000002'')',
  null, null,
  'anon cannot execute can_dm_between'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: forbidden content CHECK constraints
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'Meu CPF e 123456')
  $$,
  '23514', null,
  'CPF in post content rejected'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'Minha patente militar')
  $$,
  '23514', null,
  'patente in post content rejected'
);

select throws_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values ('e0000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'Meu endereco residencial fica na rua X')
  $$,
  '23514', null,
  'endereco residencial in comment content rejected'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: self-report blocked by trigger
-- ═══════════════════════════════════════════════════════════════════════════════

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values ('10000000-0000-4000-8000-000000000001', 'post', 'e0000000-0000-4000-8000-000000000010', 'Reporting my own post')
  $$,
  null, 'cannot report your own content',
  'member-one cannot report their own post'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEGATIVE: organizer cannot RSVP to own event
-- ═══════════════════════════════════════════════════════════════════════════════

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values ('e0000000-0000-4000-8000-000000000030', '10000000-0000-4000-8000-000000000001', 'going')
  $$,
  null, 'organizer cannot RSVP to their own event',
  'organizer blocked from RSVP to own event'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- POSITIVE: service_role access to private tables
-- ═══════════════════════════════════════════════════════════════════════════════

reset role;

select lives_ok(
  'select count(*) from private.verification_outcomes',
  'postgres can read verification_outcomes'
);

select lives_ok(
  'select count(*) from private.family_invitations',
  'postgres can read family_invitations'
);

select lives_ok(
  'select count(*) from private.family_account_links',
  'postgres can read family_account_links'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- POSITIVE: service_role sees all reports including resolved
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)::integer from public.reports where status = 'open'
  $$,
  $$ values (1::integer) $$,
  'service_role sees open reports'
);

select results_eq(
  $$
    select count(*)::integer from public.reports where status = 'resolved'
  $$,
  $$ values (1::integer) $$,
  'service_role sees resolved reports'
);

select * from finish();
rollback;
