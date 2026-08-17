begin;

create extension if not exists pgtap with schema extensions;
select plan(70);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 1: anon/authenticated have ZERO privileges on private.* tables
-- If this fails, someone leaked the private schema to the Data API.
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'private'
      and grantee in ('anon', 'authenticated')
  $$,
  array[0::bigint],
  'GUARD: zero private.* table privileges for anon/authenticated'
);

select results_eq(
  $$
    select count(*)
    from information_schema.role_usage_grants
    where object_type = 'SCHEMA'
      and object_name = 'private'
      and grantee in ('anon')
  $$,
  array[0::bigint],
  'GUARD: anon has no USAGE on private schema'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 2: FORBIDDEN column names MUST NOT exist on ANY public table
-- These columns hold PII and must never be persisted in the public schema.
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and column_name in (
        'cpf', 'documento', 'rank', 'patente', 'endereco', 'address',
        'om', 'portal_payload', 'nome_completo', 'rg', 'passaporte',
        'data_nascimento', 'nome_mae', 'telefone', 'celular'
      )
  $$,
  array[0::bigint],
  'GUARD: no PII columns (cpf/rank/address/om/portal_payload/etc) exist in public schema'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 3: profiles table exposes ONLY coarse social columns
-- ═══════════════════════════════════════════════════════════════════════════════

select columns_are(
  'public',
  'profiles',
  array[
    'user_id',
    'display_name',
    'visibility',
    'consent_version',
    'consented_at',
    'created_at',
    'updated_at'
  ],
  'GUARD: profiles exposes only coarse social + consent columns (locality lives in the membership, P0 Task 3)'
);

select hasnt_column('public', 'profiles', 'cpf', 'GUARD: profiles has no cpf column');
select hasnt_column('public', 'profiles', 'rank', 'GUARD: profiles has no rank column');
select hasnt_column('public', 'profiles', 'address', 'GUARD: profiles has no address column');
select hasnt_column('public', 'profiles', 'om', 'GUARD: profiles has no om column');
select hasnt_column('public', 'profiles', 'portal_payload', 'GUARD: profiles has no portal_payload column');

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 4: waitlist table has no PII columns
-- ═══════════════════════════════════════════════════════════════════════════════

select hasnt_column('public', 'waitlist', 'cpf', 'GUARD: waitlist has no cpf column');
select hasnt_column('public', 'waitlist', 'payload', 'GUARD: waitlist has no payload column');
select hasnt_column('public', 'waitlist', 'rank', 'GUARD: waitlist has no rank column');
select hasnt_column('public', 'waitlist', 'address', 'GUARD: waitlist has no address column');
select hasnt_column('public', 'waitlist', 'om', 'GUARD: waitlist has no om column');

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 5: verification_outcomes has ONLY the 9 authorized columns
-- ═══════════════════════════════════════════════════════════════════════════════

select columns_are(
  'private',
  'verification_outcomes',
  array[
    'user_id',
    'status',
    'eligibility_class',
    'checked_at',
    'created_at',
    'updated_at',
    'attempt_count',
    'first_attempt_at',
    'last_attempt_at'
  ],
  'GUARD: verification_outcomes columns match authorized set'
);

select hasnt_column('private', 'verification_outcomes', 'portal_payload', 'GUARD: verification_outcomes has no portal_payload');
select hasnt_column('private', 'verification_outcomes', 'cpf', 'GUARD: verification_outcomes has no cpf');
select hasnt_column('private', 'verification_outcomes', 'documento', 'GUARD: verification_outcomes has no documento');

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 6: family_invitations columns match authorized set
-- ═══════════════════════════════════════════════════════════════════════════════

select columns_are(
  'private',
  'family_invitations',
  array[
    'id', 'inviter_user_id', 'token_digest', 'invitee_email_digest',
    'status', 'expires_at', 'accepted_by_user_id', 'accepted_at', 'created_at'
  ],
  'GUARD: family_invitations columns match authorized set'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 7: NO permissive ("using (true)") policies on sensitive tables
-- Policy names with broad guards are a security regression.
-- The only allowed broad policy is waitlist_service_role_all (service_role only).
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'localities', 'locality_memberships', 'profiles',
        'posts', 'comments', 'groups', 'group_memberships',
        'recommendation_requests', 'recommendation_replies', 'recommendation_saves',
        'events', 'event_rsvps', 'notifications',
        'dm_conversations', 'dm_messages', 'dm_blocks', 'dm_reports',
        'arrival_guide_entries',
        'reports'
      )
      and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE', 'SELECT')
      and qual is null
      and with_check is null
  $$,
  array[0::bigint],
  'GUARD: no permissive (null-qualified) policies on sensitive public tables'
);

-- Verify the waitlist_service_role_all policy is the ONLY service_role ALL policy
select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'waitlist'
      and roles = '{service_role}'
      and cmd = 'ALL'
      and policyname = 'waitlist_service_role_all'
  $$,
  array[1::bigint],
  'GUARD: waitlist_service_role_all policy exists and is service_role only'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 8: expected RLS policies exist with correct names
-- A missing policy = regression; a renamed policy = likely regression.
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'localities'
      and policyname = 'localities_select_same_membership'
      and cmd = 'SELECT'
  $$,
  array[1::bigint],
  'GUARD: localities_select_same_membership policy intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'locality_memberships'
      and policyname = 'locality_memberships_select_self'
      and cmd = 'SELECT'
  $$,
  array[1::bigint],
  'GUARD: locality_memberships_select_self policy intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_visible_in_locality'
      and cmd = 'SELECT'
  $$,
  array[1::bigint],
  'GUARD: profiles_select_visible_in_locality policy intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_self'
      and cmd = 'INSERT'
  $$,
  array[1::bigint],
  'GUARD: profiles_insert_self policy intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_self'
      and cmd = 'UPDATE'
  $$,
  array[1::bigint],
  'GUARD: profiles_update_self policy intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and policyname in (
        'posts_select_locality_member',
        'posts_insert_locality_member',
        'posts_update_own',
        'posts_delete_own'
      )
  $$,
  array[4::bigint],
  'GUARD: all 4 posts policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname in (
        'comments_select_via_post',
        'comments_insert_member',
        'comments_update_own',
        'comments_delete_own'
      )
  $$,
  array[4::bigint],
  'GUARD: all 4 comments policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'groups'
      and policyname in (
        'groups_select_locality_member',
        'groups_insert_verified_member',
        'groups_update_owner',
        'groups_delete_owner'
      )
  $$,
  array[4::bigint],
  'GUARD: all 4 groups policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_memberships'
      and policyname in (
        'group_memberships_select',
        'group_memberships_insert_self',
        'group_memberships_update_moderator',
        'group_memberships_delete_self',
        'group_memberships_delete_moderator'
      )
  $$,
  array[5::bigint],
  'GUARD: all 5 group_memberships policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname in (
        'events_select_locality_member',
        'events_insert_verified_member',
        'events_update_organizer'
      )
  $$,
  array[3::bigint],
  'GUARD: all 3 events policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_rsvps'
      and policyname in (
        'event_rsvps_select_locality_member',
        'event_rsvps_insert_self',
        'event_rsvps_update_self'
      )
  $$,
  array[3::bigint],
  'GUARD: all 3 event_rsvps policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('recommendation_requests', 'recommendation_replies', 'recommendation_saves')
      and policyname in (
        'recommendation_requests_select_locality',
        'recommendation_requests_insert_locality',
        'recommendation_requests_update_own',
        'recommendation_requests_delete_own',
        'recommendation_replies_select',
        'recommendation_replies_insert',
        'recommendation_replies_update_own',
        'recommendation_replies_delete_own',
        'recommendation_saves_select_own',
        'recommendation_saves_insert_own',
        'recommendation_saves_delete_own'
      )
  $$,
  array[11::bigint],
  'GUARD: all 11 recommendation policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname in (
        'notifications_select_recipient',
        'notifications_update_recipient'
      )
  $$,
  array[2::bigint],
  'GUARD: all 2 notifications policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_conversations'
      and policyname in (
        'dm_conversations_select_participant',
        'dm_conversations_insert_context_gated'
      )
  $$,
  array[2::bigint],
  'GUARD: all 2 dm_conversations policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_messages'
      and policyname in (
        'dm_messages_select_participant',
        'dm_messages_insert_sender'
      )
  $$,
  array[2::bigint],
  'GUARD: all 2 dm_messages policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_blocks'
      and policyname in (
        'dm_blocks_select_self',
        'dm_blocks_insert_self',
        'dm_blocks_delete_self'
      )
  $$,
  array[3::bigint],
  'GUARD: all 3 dm_blocks policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_reports'
      and policyname in (
        'dm_reports_select_own',
        'dm_reports_insert_own'
      )
  $$,
  array[2::bigint],
  'GUARD: all 2 dm_reports policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname in (
        'reports_select_reporter_only',
        'reports_insert_authenticated'
      )
  $$,
  array[2::bigint],
  'GUARD: all 2 reports policies intact'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'arrival_guide_entries'
      and policyname = 'arrival_guide_select_approved_locality_member'
      and cmd = 'SELECT'
  $$,
  array[1::bigint],
  'GUARD: arrival_guide_select_approved_locality_member policy intact'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 9: storage policies exist with correct names
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'avatars_insert_own_folder',
        'avatars_select_authenticated',
        'avatars_update_own',
        'avatars_delete_own',
        'event_photos_insert_member',
        'event_photos_select_member',
        'event_photos_update_own',
        'event_photos_delete_own'
      )
  $$,
  array[8::bigint],
  'GUARD: all 8 storage policies intact'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 10: no extra policies beyond expected count (catch-all for drift)
-- Count total policies per table; if someone adds a broad policy, this catches it.
-- ═══════════════════════════════════════════════════════════════════════════════

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'localities'
  $$,
  array[1::bigint],
  'GUARD: localities has exactly 1 policy'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'locality_memberships'
  $$,
  array[1::bigint],
  'GUARD: locality_memberships has exactly 1 policy'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  $$,
  array[4::bigint],
  'GUARD: profiles has exactly 4 policies (visible_in_locality, insert_self, update_self, community_comember)'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'waitlist'
  $$,
  array[1::bigint],
  'GUARD: waitlist has exactly 1 policy (service_role only)'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
  $$,
  array[4::bigint],
  'GUARD: posts has exactly 4 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
  $$,
  array[4::bigint],
  'GUARD: comments has exactly 4 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'groups'
  $$,
  array[4::bigint],
  'GUARD: groups has exactly 4 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_memberships'
  $$,
  array[5::bigint],
  'GUARD: group_memberships has exactly 5 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
  $$,
  array[3::bigint],
  'GUARD: events has exactly 3 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_rsvps'
  $$,
  array[3::bigint],
  'GUARD: event_rsvps has exactly 3 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recommendation_requests'
  $$,
  array[4::bigint],
  'GUARD: recommendation_requests has exactly 4 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recommendation_replies'
  $$,
  array[4::bigint],
  'GUARD: recommendation_replies has exactly 4 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recommendation_saves'
  $$,
  array[3::bigint],
  'GUARD: recommendation_saves has exactly 3 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
  $$,
  array[2::bigint],
  'GUARD: notifications has exactly 2 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_conversations'
  $$,
  array[2::bigint],
  'GUARD: dm_conversations has exactly 2 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_messages'
  $$,
  array[2::bigint],
  'GUARD: dm_messages has exactly 2 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_blocks'
  $$,
  array[3::bigint],
  'GUARD: dm_blocks has exactly 3 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_reports'
  $$,
  array[2::bigint],
  'GUARD: dm_reports has exactly 2 policies'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
  $$,
  array[2::bigint],
  'GUARD: reports has exactly 2 policies (no UPDATE, no DELETE)'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'arrival_guide_entries'
  $$,
  array[1::bigint],
  'GUARD: arrival_guide_entries has exactly 1 policy'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 11: RLS is enabled AND forced on all 23 application tables
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
        'arrival_guide_entries',
        'reports',
        'verification_outcomes', 'family_invitations', 'family_account_links'
      )
      and c.relrowsecurity
      and c.relforcerowsecurity
  $$,
  array[23::bigint],
  'GUARD: RLS enabled and forced on all 23 application tables'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GUARD 12: authorization helpers exist and have correct execute grants
-- ═══════════════════════════════════════════════════════════════════════════════

select has_function('private', 'is_locality_member', array['uuid'], 'GUARD: is_locality_member exists');
select has_function('private', 'is_verified_locality_member', array['uuid'], 'GUARD: is_verified_locality_member exists');
select has_function('private', 'is_verified_holder', array['uuid'], 'GUARD: is_verified_holder exists');
select has_function('private', 'has_accepted_family', array['uuid', 'uuid'], 'GUARD: has_accepted_family exists');
select has_function('private', 'can_dm_between', array['uuid', 'uuid'], 'GUARD: can_dm_between exists');

select function_privs_are(
  'private', 'is_locality_member', array['uuid'],
  'authenticated', array['EXECUTE'],
  'GUARD: is_locality_member executable by authenticated'
);

select function_privs_are(
  'private', 'is_verified_locality_member', array['uuid'],
  'authenticated', array['EXECUTE'],
  'GUARD: is_verified_locality_member executable by authenticated'
);

select function_privs_are(
  'private', 'is_verified_holder', array['uuid'],
  'authenticated', array['EXECUTE'],
  'GUARD: is_verified_holder executable by authenticated'
);

select * from finish();
rollback;
