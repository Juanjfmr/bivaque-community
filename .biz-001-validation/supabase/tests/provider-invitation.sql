begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'provider-target@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'provider-wrong@example.invalid'),
  ('10000000-0000-4000-8000-000000000022', 'provider-expired@example.invalid'),
  ('10000000-0000-4000-8000-000000000030', 'provider-existing@example.invalid');

insert into public.provider_accounts (
  auth_user_id,
  invited_by,
  community_id,
  locality_id
)
values (
  '10000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select public.create_provider_invitation(
      '70000000-0000-4000-8000-000000000001',
      'new-provider@example.invalid',
      'Climatiza Manaus'
    )
  $$,
  'approved community member creates a provider invitation'
);

reset role;

select is(
  (
    select count(*)::integer
      from public.outbox
     where type = 'provider_invite'
       and recipient = 'new-provider@example.invalid'
       and payload ->> 'display_name' = 'Climatiza Manaus'
       and payload ->> 'invite_path' like '/prestador-convite/%'
  ),
  1,
  'provider invitation is enqueued with only the delivery data'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$
    select public.create_provider_invitation(
      '70000000-0000-4000-8000-000000000001',
      'denied-city-member@example.invalid',
      'Prestador sem vila'
    )
  $$,
  '42501',
  null,
  'locality member without approved community membership cannot invite'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000030',
  true
);

select throws_ok(
  $$
    select public.create_provider_invitation(
      '70000000-0000-4000-8000-000000000001',
      'denied-provider@example.invalid',
      'Prestador convidando'
    )
  $$,
  '42501',
  null,
  'provider account cannot create provider invitations'
);

reset role;

insert into private.provider_invitations (
  id,
  inviter_user_id,
  community_id,
  locality_id,
  display_name,
  token_digest,
  invitee_email_digest,
  expires_at
)
values
  (
    '40000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Prestador alvo',
    digest(decode(repeat('a1', 32), 'hex'), 'sha256'),
    digest('provider-target@example.invalid', 'sha256'),
    now() + interval '7 days'
  ),
  (
    '40000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Prestador expirado',
    digest(decode(repeat('a2', 32), 'hex'), 'sha256'),
    digest('provider-expired@example.invalid', 'sha256'),
    now() - interval '1 hour'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000021',
  true
);

select throws_ok(
  $$
    select public.accept_provider_invitation(
      repeat('a1', 32),
      'provider-wrong@example.invalid'
    )
  $$,
  'P0002',
  null,
  'provider invitation rejects an authenticated divergent e-mail'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000022',
  true
);

select throws_ok(
  $$
    select public.accept_provider_invitation(
      repeat('a2', 32),
      'provider-expired@example.invalid'
    )
  $$,
  'P0004',
  null,
  'expired provider invitation is rejected'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000020',
  true
);

select is(
  public.accept_provider_invitation(
    repeat('a1', 32),
    'provider-target@example.invalid'
  ),
  '10000000-0000-4000-8000-000000000020'::uuid,
  'intended authenticated invitee accepts the provider invitation'
);

select throws_ok(
  $$
    select public.accept_provider_invitation(
      repeat('a1', 32),
      'provider-target@example.invalid'
    )
  $$,
  'P0003',
  null,
  'provider invitation cannot be accepted twice'
);

select isnt_empty(
  $$
    select 1
      from public.provider_accounts
     where auth_user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  'acceptance creates the provider account'
);

select is_empty(
  $$
    select 1
      from public.locality_memberships
     where user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  'acceptance does not create locality membership'
);

select is_empty(
  $$
    select 1
      from public.community_memberships
     where user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  'acceptance does not create community membership'
);

select is_empty(
  $$
    select 1
      from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  'acceptance does not create a member profile'
);

reset role;

select is(
  (
    select status::text
      from private.provider_invitations
     where id = '40000000-0000-4000-8000-000000000020'
  ),
  'accepted',
  'successful acceptance records the invitation state'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select lives_ok(
  $$
    do $quota$
    begin
      for i in 1..5 loop
        perform public.create_provider_invitation(
          '70000000-0000-4000-8000-000000000001',
          'quota-provider@example.invalid',
          'Prestador da cota'
        );
      end loop;
    end
    $quota$
  $$,
  'member can keep five active provider invitations'
);

select throws_ok(
  $$
    select public.create_provider_invitation(
      '70000000-0000-4000-8000-000000000001',
      'sixth-provider@example.invalid',
      'Sexto prestador'
    )
  $$,
  '54000',
  null,
  'sixth active provider invitation is rejected'
);

reset role;

select is(
  (
    select count(*)::integer
      from private.provider_invitations
     where inviter_user_id = '10000000-0000-4000-8000-000000000004'
       and status = 'pending'
       and expires_at > now()
  ),
  5,
  'quota denial leaves exactly five active invitations'
);

select * from finish();
rollback;
