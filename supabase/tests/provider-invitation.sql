begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

-- RED-005 — convite de prestador no esquema aprovado (ADR-20261024 §6).
--
-- A vila saiu do produto: o convite não nasce mais de uma comunidade e não é
-- mais poder de morador. Quem convida é o OPERADOR (`private.operators`), com
-- a localidade obrigatória como escopo; a conta do e-mail convidado é que
-- aceita, e o aceite cria APENAS a conta de prestador — não cria ficha,
-- vínculo de localidade nem perfil de membro.

\ir fixtures/foundation.inc

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'provider-target@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'provider-wrong@example.invalid'),
  ('10000000-0000-4000-8000-000000000022', 'provider-expired@example.invalid'),
  ('10000000-0000-4000-8000-000000000030', 'provider-existing@example.invalid'),
  ('10000000-0000-4000-8000-00000000000c', 'operator-provider-invite@example.invalid'),
  ('10000000-0000-4000-8000-00000000000d', 'operator-provider-quota@example.invalid');

insert into public.operators (auth_user_id, notes)
values
  ('10000000-0000-4000-8000-00000000000c', 'fixture: operador que convida prestador'),
  ('10000000-0000-4000-8000-00000000000d', 'fixture: operador da cota de convites');

insert into public.provider_accounts (
  auth_user_id,
  invited_by,
  locality_id
)
values (
  '10000000-0000-4000-8000-000000000030',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-00000000000c',
  true
);

select lives_ok(
  $$
    select public.create_provider_invitation(
      '00000000-0000-4000-8000-000000000001',
      'new-provider@example.invalid',
      'Climatiza Manaus'
    )
  $$,
  'the operator creates a provider invitation'
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
      '00000000-0000-4000-8000-000000000001',
      'denied-city-member@example.invalid',
      'Prestador sem convite'
    )
  $$,
  '42501',
  null,
  'a locality member cannot invite: provider invitations are operator-only'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000030',
  true
);

select throws_ok(
  $$
    select public.create_provider_invitation(
      '00000000-0000-4000-8000-000000000001',
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
  locality_id,
  display_name,
  token_digest,
  invitee_email_digest,
  expires_at
)
values
  (
    '40000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-000000000001',
    'Prestador alvo',
    digest(decode(repeat('a1', 32), 'hex'), 'sha256'),
    digest('provider-target@example.invalid', 'sha256'),
    now() + interval '7 days'
  ),
  (
    '40000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-00000000000c',
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

reset role;

-- O aceite não atesta nada: não cria ficha de prestador (a antiga checagem de
-- vínculo de vila foi extinta com a vila; esta é independente e é lida como
-- postgres, para medir o estado real e não o filtro de RLS).
select is_empty(
  $$
    select 1
      from public.provider_profiles
     where owner_user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  'acceptance does not create a provider profile'
);

select is_empty(
  $$
    select 1
      from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  'acceptance does not create a member profile'
);

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
  '10000000-0000-4000-8000-00000000000d',
  true
);

select lives_ok(
  $$
    do $quota$
    begin
      for i in 1..50 loop
        perform public.create_provider_invitation(
          '00000000-0000-4000-8000-000000000001',
          'quota-provider@example.invalid',
          'Prestador da cota'
        );
      end loop;
    end
    $quota$
  $$,
  'the operator can keep fifty active provider invitations'
);

select throws_ok(
  $$
    select public.create_provider_invitation(
      '00000000-0000-4000-8000-000000000001',
      'fifty-first-provider@example.invalid',
      'Prestador excedente'
    )
  $$,
  '54000',
  null,
  'the fifty-first active provider invitation is rejected'
);

reset role;

select is(
  (
    select count(*)::integer
      from private.provider_invitations
     where inviter_user_id = '10000000-0000-4000-8000-00000000000d'
       and status = 'pending'
       and expires_at > now()
  ),
  50,
  'quota denial leaves exactly fifty active invitations'
);

select * from finish();
rollback;