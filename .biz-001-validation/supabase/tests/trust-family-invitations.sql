begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

\ir fixtures/foundation.inc
\ir fixtures/trust.inc

-- ── verified_holder_active_invitations ──

select is(
  private.verified_holder_active_invitations(
    '10000000-0000-4000-8000-000000000001'
  ),
  6,
  'counts all active pending invitations for a verified holder'
);

select is(
  private.verified_holder_active_invitations(
    '10000000-0000-4000-8000-000000000005'
  ),
  0,
  'returns zero for a non-verified user with no history'
);

-- ── create_family_invitation ──

select lives_ok(
  $$
    select private.create_family_invitation(
      '10000000-0000-4000-8000-000000000002',
      decode(repeat('10', 32), 'hex'),
      decode(repeat('fe', 32), 'hex')
    )
  $$,
  'a verified holder can create an invitation'
);

select throws_ok(
  $$
    select private.create_family_invitation(
      '10000000-0000-4000-8000-000000000005',
      decode(repeat('11', 32), 'hex'),
      decode(repeat('f1', 32), 'hex')
    )
  $$,
  'only verified holders can create invitations',
  'rejects invitation from a non-verified user'
);

select throws_ok(
  $$
    select private.create_family_invitation(
      '10000000-0000-4000-8000-000000000001',
      decode(repeat('12', 32), 'hex'),
      decode(repeat('f2', 32), 'hex')
    )
  $$,
  'maximum 5 active invitations per holder',
  'rejects when the holder already has 5 active invitations (6 including foundation)'
);

-- verify the created invitation has a 7-day expiry window
select results_eq(
  $$
    select expires_at > now() and expires_at <= now() + interval '8 days'
    from private.family_invitations
    where token_digest = decode(repeat('10', 32), 'hex')
  $$,
  $$ values (true) $$,
  'created invitation expires within 7 days'
);

-- ── revoke_family_invitation ──

select lives_ok(
  $$
    select private.revoke_family_invitation(
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'the inviter can revoke a pending invitation'
);

select results_eq(
  $$
    select status
    from private.family_invitations
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('revoked'::private.family_invitation_status) $$,
  'revoked invitation status is updated'
);

select throws_ok(
  $$
    select private.revoke_family_invitation(
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'invitation not found or not revocable',
  'a different user cannot revoke another holder invitation'
);

-- ── accepts a family invitation ──

select lives_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('03', 32), 'hex'),
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  'a pending invitation can be accepted by a non-holder user'
);

select results_eq(
  $$
    select status, accepted_by_user_id
    from private.family_invitations
    where id = '30000000-0000-4000-8000-000000000003'
  $$,
  $$
    values (
      'accepted'::private.family_invitation_status,
      '10000000-0000-4000-8000-000000000005'::uuid
    )
  $$,
  'accepted invitation records the accepting user'
);

-- ── family_account_links on accept ──

select is(
  (
    select count(*)
    from private.family_account_links
    where invitation_id = '30000000-0000-4000-8000-000000000003'
  ),
  1::bigint,
  'accepting creates exactly one account link row'
);

select results_eq(
  $$
    select holder_user_id, family_user_id
    from private.family_account_links
    where invitation_id = '30000000-0000-4000-8000-000000000003'
  $$,
  $$
    values (
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000005'::uuid
    )
  $$,
  'account link records correct holder and family user'
);

-- ── accepted family account remains independent ──

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    update public.profiles
    set display_name = 'Attempted Takeover'
    where user_id = '10000000-0000-4000-8000-000000000001'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'an accepted family member cannot modify the holder profile'
);

reset role;

-- ── cannot accept an already-revoked invitation ──

select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('ab', 32), 'hex'),
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  'P0004',
  'family_invitation_revoked',
  'a revoked invitation cannot be accepted'
);

-- ── upsert_verification_outcome ──

select lives_ok(
  $$
    select private.upsert_verification_outcome(
      '10000000-0000-4000-8000-000000000005',
      'verified',
      'veteran'
    )
  $$,
  'a new user can be upserted as verified'
);

select results_eq(
  $$
    select user_id, status, eligibility_class
    from private.verification_outcomes
    where user_id = '10000000-0000-4000-8000-000000000005'
  $$,
  $$
    values (
      '10000000-0000-4000-8000-000000000005'::uuid,
      'verified'::private.verification_status,
      'veteran'::private.eligibility_class
    )
  $$,
  'upsert correctly records verification details'
);

select lives_ok(
  $$
    select private.upsert_verification_outcome(
      '10000000-0000-4000-8000-000000000005',
      'rejected'
    )
  $$,
  'upsert to rejected clears the eligibility class'
);

select results_eq(
  $$
    select status, eligibility_class
    from private.verification_outcomes
    where user_id = '10000000-0000-4000-8000-000000000005'
  $$,
  $$
    values (
      'rejected'::private.verification_status,
      null::private.eligibility_class
    )
  $$,
  'rejected upsert carries no eligibility class'
);

select throws_ok(
  $$
    select private.upsert_verification_outcome(
      '10000000-0000-4000-8000-000000000001',
      'verified',
      null
    )
  $$,
  'verified status requires an eligibility class',
  'verified without eligibility class is rejected'
);

-- ── anon/authenticated cannot execute private trust functions ──

set local role anon;
select throws_ok(
  'select private.verified_holder_active_invitations(''10000000-0000-4000-8000-000000000001'')',
  null,
  'anon cannot call trust functions'
);

set local role authenticated;
select throws_ok(
  'select private.create_family_invitation(''10000000-0000-4000-8000-000000000001'', decode(repeat(''ff'', 32), ''hex''), decode(repeat(''ee'', 32), ''hex''))',
  null,
  'authenticated cannot call trust functions'
);

reset role;

select * from finish();
rollback;
