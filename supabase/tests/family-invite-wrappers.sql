begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc

-- invitee fixture (verified holder 00000001 already in foundation.inc)
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-00000000000b', 'invitee-1@example.invalid');

reset role;

select is(
  public.create_family_invitation(
    '10000000-0000-4000-8000-000000000001'::uuid,
    decode(repeat('12', 32), 'hex'),
    decode(repeat('34', 32), 'hex')
  ) IS NOT NULL,
  true,
  'create_family_invitation returns a non-null result'
);

select lives_ok(
  $$
    select public.revoke_family_invitation(
      (
        select id
        from private.family_invitations
        where inviter_user_id = '10000000-0000-4000-8000-000000000001'
          and status = 'pending'
        limit 1
      ),
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'revoke_family_invitation succeeds on a pending invitation'
);

set local role anon;
select throws_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('ef', 32), 'hex'),
      decode(repeat('01', 32), 'hex')
    )
  $$,
  '42501',
  null,
  'anonymous cannot call create_family_invitation (insufficient_privilege)'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select throws_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000005'::uuid,
      decode(repeat('34', 32), 'hex'),
      decode(repeat('56', 32), 'hex')
    )
  $$,
  'P0001',
  null,
  'unverified inviter is rejected by the underlying private guard'
);

select * from finish();
rollback;