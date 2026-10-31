begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc

-- Reset role so we can insert and call private helpers as the database owner.
reset role;

-- Set up: a verified holder (member-one) and a pending invitation created
-- directly in the private table. member-one is verified in the fixture.
insert into private.family_invitations (
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  invitee_email_hint,
  expires_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('ee', 32), 'hex'),
  -- digest of 'member-two@example.invalid' (fixture e-mail) — precomputed:
  -- extensions.digest(lower(trim('member-two@example.invalid')),'sha256') =
  -- the fixture inserts this user, so its e-mail is known.
  decode(repeat('aa', 32), 'hex'),
  'me***@ex***.com',
  now() + interval '7 days'
)
;

-- 1. not_found: bogus token raises P0001 with the not_found message.
select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('bb', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'P0001',
  'family_invitation_not_found',
  'a non-existent token raises the not_found errcode'
);

-- 2. expired: the invitation expires_at < now().
update private.family_invitations
  set expires_at = now() - interval '1 second'
  where token_digest = decode(repeat('ee', 32), 'hex');

select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('ee', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'P0002',
  'family_invitation_expired',
  'an expired invitation raises the expired errcode'
);

-- 3. already_used: status = 'accepted'.
update private.family_invitations
  set status = 'accepted',
      expires_at = now() + interval '7 days',
      accepted_at = now(),
      accepted_by_user_id = '10000000-0000-4000-8000-000000000002'
  where token_digest = decode(repeat('ee', 32), 'hex');

select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('ee', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'P0003',
  'family_invitation_already_used',
  'an accepted invitation raises the already_used errcode'
);

-- 4. revoked: status = 'revoked'. accepted_by_user_id/at must be null — the
-- table's check constraint forbids keeping them while status moves away from
-- 'accepted'.
update private.family_invitations
  set status = 'revoked',
      accepted_by_user_id = null,
      accepted_at = null
  where token_digest = decode(repeat('ee', 32), 'hex');

select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('ee', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'P0004',
  'family_invitation_revoked',
  'a revoked invitation raises the revoked errcode'
);

-- 5. Positive: pending + unexpired + matching e-mail digests = happy path.
-- Reset the fixture row to pending + matching digest. The fixture member-two
-- e-mail is 'member-two@example.invalid'; its sha256 digest matches the
-- decode(repeat('aa',32),'hex') used here ONLY by coincidence of placeholder;
-- we update the invitee_email_digest to the actual hash so the match holds.
update private.family_invitations
  set status = 'pending',
      expires_at = now() + interval '7 days',
      accepted_at = null,
      accepted_by_user_id = null,
      invitee_email_digest = extensions.digest(lower(trim('member-two@example.invalid')), 'sha256')
  where token_digest = decode(repeat('ee', 32), 'hex');

select lives_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('ee', 32), 'hex'),
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'the matching pair accepts the invitation and provisions the link'
);

select results_eq(
  $$ select status::text from private.family_invitations
     where token_digest = decode(repeat('ee', 32), 'hex') $$,
  $$ values ('accepted'::text) $$,
  'the accepted invitation moves to status accepted'
);

-- 6. Negative: pending + unexpired + E-MAIL DIVERGENTE raises P0001 (the same
-- code as not_found). Whoever forwarded the link cannot distinguish "wrong
-- token" from "right token, wrong person". The happy path above created a
-- family_account_links row, which references this invitation's
-- accepted_by_user_id; delete it before resetting accepted_by_user_id to null
-- or the FK will block the UPDATE.
delete from private.family_account_links
  where invitation_id = (
    select id from private.family_invitations
    where token_digest = decode(repeat('ee', 32), 'hex')
  );
update private.family_invitations
  set status = 'pending',
      expires_at = now() + interval '7 days',
      accepted_at = null,
      accepted_by_user_id = null
  where token_digest = decode(repeat('ee', 32), 'hex');

select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('ee', 32), 'hex'),
      '10000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'P0001',
  'family_invitation_not_found',
  'a wrong e-mail raises the same not_found errcode (no enumeration)'
);

select * from finish();
rollback;
