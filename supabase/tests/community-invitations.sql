-- Onda E Task 6 — community member invitations with attribution and scope.
--
-- Negative test priority: the D15 gate (verification required) and the D14
-- scope (leaked invite yields a pending request, never access). The
-- database owner calls the service_role-only RPCs directly — the same
-- pattern family-invite-sad-paths.sql uses.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Reset role so we can call the service_role-only wrappers as the owner.
reset role;

-- ── POSITIVE 1: verified inviter, valid token, verified invitee ──────────
-- Member-one is verified (foundation.inc) and approved owner of -001.
select lives_ok(
  $$
    select public.create_community_invitation(
      '70000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('aa', 32), 'hex'),
      now() + interval '7 days'
    )
  $$,
  'E6+: verified approved member creates an invite for the community'
);

-- Mark member-five verified (only member-one is verified in foundation.inc).
insert into private.verification_outcomes (
  user_id, status, eligibility_class, checked_at
) values (
  '10000000-0000-4000-8000-000000000005',
  'verified',
  'active_federal_military',
  now()
);

select lives_ok(
  $$
    select public.accept_community_invitation(
      decode(repeat('aa', 32), 'hex'),
      '10000000-0000-4000-8000-000000000005'::uuid
    )
  $$,
  'E6+: verified invitee accepts and gets a pending membership'
);

-- The pending membership exists.
select results_eq(
  $$
    select status::text from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000005'::uuid
  $$,
  $$ values ('pending'::text) $$,
  'E6+: accepted invite yields a pending community_membership, not approved'
);

-- ── NEGATIVE: D15 gate — unverified invitee is denied, no row created ────
-- Member-three is NOT verified. The RPC must throw and create nothing.
select lives_ok(
  $$
    select public.create_community_invitation(
      '70000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('bb', 32), 'hex'),
      now() + interval '7 days'
    )
  $$,
  'E6: create a second invite for the D15 negative case'
);

select throws_ok(
  $$
    select public.accept_community_invitation(
      decode(repeat('bb', 32), 'hex'),
      '10000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  '42501',
  null,
  'E6-: unverified invitee is denied (D15 gate) — the test that proves D15'
);

select is_empty(
  $$
    select 1 from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000003'::uuid
  $$,
  'E6-: unverified acceptance creates no community_membership row'
);

-- ── NEGATIVE: expired invite is rejected with errcode P0004 ─────────────
-- Create an invite and backdate expires_at.
select lives_ok(
  $$
    select public.create_community_invitation(
      '70000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('cc', 32), 'hex'),
      now() + interval '1 hour'
    )
  $$,
  'E6: create an invite for the expired-test case'
);

update public.community_invitations
  set expires_at = now() - interval '1 hour'
  where token_digest = decode(repeat('cc', 32), 'hex');

select throws_ok(
  $$
    select public.accept_community_invitation(
      decode(repeat('cc', 32), 'hex'),
      '10000000-0000-4000-8000-000000000005'::uuid
    )
  $$,
  'P0004',
  null,
  'E6-: expired invite is refused with errcode P0004'
);

-- ── POSITIVE: revoke transitions a pending invite to revoked ─────────────
select lives_ok(
  $$
    select public.create_community_invitation(
      '70000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('dd', 32), 'hex'),
      now() + interval '7 days'
    )
  $$,
  'E6: create an invite for the revoke case'
);

select lives_ok(
  $$
    select public.revoke_community_invitation(
      (select id from public.community_invitations
        where token_digest = decode(repeat('dd', 32), 'hex')),
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'E6+: inviter revokes a pending invite'
);

select results_eq(
  $$
    select status::text from public.community_invitations
    where token_digest = decode(repeat('dd', 32), 'hex')
  $$,
  $$ values ('revoked'::text) $$,
  'E6+: revoked invite has status = revoked'
);

select * from finish();
rollback;