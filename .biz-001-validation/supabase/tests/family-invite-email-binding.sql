begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc

-- Two prospective invitees: the intended mailbox and a forwarded-link user.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'intended-invitee@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'wrong-invitee@example.invalid');

insert into private.family_invitations (
  id,
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  expires_at
)
values
  (
    '40000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('fa', 32), 'hex'),
    digest('intended-invitee@example.invalid', 'sha256'),
    now() + interval '7 days'
  ),
  (
    '40000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('fb', 32), 'hex'),
    digest('intended-invitee@example.invalid', 'sha256'),
    now() + interval '7 days'
  );

set local role service_role;

-- Negative: a different mailbox cannot consume the invitee link.
select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('fa', 32), 'hex'),
      '10000000-0000-4000-8000-000000000021'::uuid
    )
  $$,
  'P0001',
  null,
  'forwarded link with a different e-mail is rejected'
);

-- The failed attempt above must leave the invitation pending, so the real
-- invitee can still accept it.
select is(
  (select status::text from private.family_invitations
   where id = '40000000-0000-4000-8000-000000000020'),
  'pending',
  'failed e-mail check leaves the invitation pending'
);

-- Positive: the intended mailbox accepts and creates the account link.
select lives_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('fa', 32), 'hex'),
      '10000000-0000-4000-8000-000000000020'::uuid
    )
  $$,
  'intended invitee can accept the invitation'
);

select is(
  (select count(*)::integer
   from private.family_account_links
   where invitation_id = '40000000-0000-4000-8000-000000000020'),
  1,
  'acceptance creates exactly one family account link'
);

-- The second invitation is still pending; the wrong mailbox cannot eat it.
select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('fb', 32), 'hex'),
      '10000000-0000-4000-8000-000000000021'::uuid
    )
  $$,
  'P0001',
  null,
  'second forwarded link is rejected for the same reason'
);

-- Negative: a token for a missing Auth user cannot be provisioned.
insert into private.family_invitations (
  id,
  inviter_user_id,
  token_digest,
  invitee_email_digest,
  expires_at
)
values (
  '40000000-0000-4000-8000-000000000022',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('fc', 32), 'hex'),
  digest('missing-invitee@example.invalid', 'sha256'),
  now() + interval '7 days'
);

select throws_ok(
  $$
    select private.accept_family_invitation(
      decode(repeat('fc', 32), 'hex'),
      '10000000-0000-4000-8000-000000000099'::uuid
    )
  $$,
  'P0001',
  null,
  'missing accepting user is rejected'
);

select * from finish();
rollback;
