begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc

reset role;

-- 1. The mask function masks without reconstructing.
select is(
  private.family_invite_email_hint('joao.silva@gmail.com'),
  'jo***@gm***.com',
  'a full email masks to the branded hint format'
);

select is(
  private.family_invite_email_hint('ab@gmail.com'),
  'a***@gm***.com',
  'a two-letter local part does not leak its second character'
);

-- 2. Creating an invite through the 4-argument path records the hint.
select lives_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('de', 32), 'hex'),
      decode(repeat('12', 32), 'hex'),
      private.family_invite_email_hint('joao.silva@gmail.com')
    )
  $$,
  'creating an invite with a hint succeeds for a verified holder'
);

select is(
  (select invitee_email_hint::text
   from private.family_invitations
   where token_digest = decode(repeat('de', 32), 'hex')),
  'jo***@gm***.com',
  'the hint is recorded with the invite'
);

-- 3. The hint format can never reconstruct the original e-mail.
select matches(
  (select invitee_email_hint::text
   from private.family_invitations
   where token_digest = decode(repeat('de', 32), 'hex'))::text,
  '^[^@\s]{1,2}\*{3}@[^@\s]{1,2}\*{3}\.[a-z]{2,}$',
  'the stored hint always keeps the masked format'
);

-- 4. The hint list read carries the hint for the UI.
select results_eq(
  $$ select invitee_email_hint::text from public.list_pending_invites_with_hint('10000000-0000-4000-8000-000000000001')
     where invitee_email_hint is not null $$,
  $$ values ('jo***@gm***.com'::text) $$,
  'the pending-invite read carries the hint'
);

-- 5. authenticated cannot read the private table directly (negative).
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select * from private.family_invitations $$,
  '42501',
  null,
  'authenticated cannot read the private invitations table'
);

-- 6. Anon cannot execute the hint RPC.
set local role anon;
select throws_ok(
  $$ select * from public.list_pending_invites_with_hint('10000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'anon cannot read pending invite hints'
);

select * from finish();
rollback;
