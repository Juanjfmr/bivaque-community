begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

select has_table('public', 'localities', 'localities is part of the public foundation');
select has_table('public', 'locality_memberships', 'membership gates locality access');
select has_table('public', 'profiles', 'coarse profiles are public-schema resources');
select has_table('private', 'verification_outcomes', 'verification outcomes stay private');
select has_table('private', 'family_invitations', 'family invitations stay private');
select has_table('private', 'family_account_links', 'accepted family links stay private');

select columns_are(
  'public',
  'profiles',
  array[
    'user_id',
    'display_name',
    'visibility',
    'consent_version',
    'consented_at',
    'bio',
    'created_at',
    'updated_at'
  ],
  'profiles expose only coarse social fields plus consent tracking (locality lives in the membership, P0 Task 3)'
);
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
    'last_attempt_at',
    'reconcile_attempts'
  ],
  'verification outcomes retain only the normalized private decision (reconcile_attempts is a counter, not PII — D2 Task 2)'
);
select columns_are(
  'private',
  'family_invitations',
  array[
    'id',
    'inviter_user_id',
    'token_digest',
    'invitee_email_digest',
    'invitee_email_hint',
    'status',
    'expires_at',
    'accepted_by_user_id',
    'accepted_at',
    'created_at'
  ],
  'family invitations retain digests plus the display hint (D2 Task 4) and lifecycle metadata only'
);

select results_eq(
  $$
    select city_name, state_code, country_code, admission_mode::text
    from public.localities
    where slug = 'manaus-am'
  $$,
  $$ values ('Manaus'::text, 'AM'::text, 'BR'::text, 'verification_gated'::text) $$,
  'Manaus is a verification-gated pilot locality'
);

select results_eq(
  $$
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private')
      and c.relname in (
        'localities',
        'locality_memberships',
        'profiles',
        'verification_outcomes',
        'family_invitations',
        'family_account_links'
      )
      and c.relrowsecurity
      and c.relforcerowsecurity
  $$,
  array[6::bigint],
  'RLS is enabled and forced on every application table'
);

select results_eq(
  $$
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'private'
      and grantee in ('anon', 'authenticated')
  $$,
  array[0::bigint],
  'Data API roles have no private table privileges'
);

select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'localities'
      and policyname = 'localities_select_same_membership'
  $$,
  array[1::bigint],
  'locality reads require membership'
);
select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_visible_in_locality'
  $$,
  array[1::bigint],
  'profile reads require visibility and shared locality'
);
select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_self'
  $$,
  array[1::bigint],
  'profile creation is self-scoped'
);
select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_self'
  $$,
  array[1::bigint],
  'profile updates are self-scoped'
);

select col_default_is(
  'public',
  'localities',
  'admission_mode',
  'verification_gated'::public.locality_admission_mode,
  'new localities default to verification-gated admission (P0 Task 2)'
);

select enum_has_labels(
  'locality_admission_mode',
  array['invite_only', 'waitlist_only', 'verification_gated'],
  'locality_admission_mode supports invite-only, verification-gated, and waitlist-only admission models'
);


select function_privs_are(
  'private',
  'is_locality_member',
  array['uuid'],
  'authenticated',
  array['EXECUTE'],
  'authenticated users can execute only the locality policy helper'
);

select * from finish();
rollback;
