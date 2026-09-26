begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

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

-- 3b. Regressão medida em runtime em 15/09/2026: a máscara usava o PRIMEIRO ponto
-- do domínio, então 'familiar@bivaque.example.invalid' virava
-- 'fa***@bi***.example.invalid' — dois pontos, e o CHECK da tabela recusava o
-- convite. Valia para qualquer domínio de dois níveis, inclusive '@exemplo.com.br'.
select is(
  private.family_invite_email_hint('familiar@bivaque.example.invalid'),
  'fa***@bi***.invalid',
  'a three-label domain keeps only the TLD'
);

select is(
  private.family_invite_email_hint('ana@exemplo.com.br'),
  'an***@ex***.br',
  'a two-level Brazilian domain keeps only the TLD'
);

-- 4. The hint list read carries the hint for the UI — medido ANTES do convite
-- de domínio de dois níveis, para a leitura continuar com exatamente uma linha.
select results_eq(
  $$ select invitee_email_hint::text from public.list_pending_invites_with_hint('10000000-0000-4000-8000-000000000001')
     where invitee_email_hint is not null $$,
  $$ values ('jo***@gm***.com'::text) $$,
  'the pending-invite read carries the hint'
);

select lives_ok(
  $$
    insert into private.family_invitations (
      inviter_user_id,
      token_digest,
      invitee_email_digest,
      invitee_email_hint,
      expires_at
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      extensions.digest(decode(repeat('66', 32), 'hex'), 'sha256'),
      extensions.digest('familiar@bivaque.example.invalid', 'sha256'),
      private.family_invite_email_hint('familiar@bivaque.example.invalid'),
      now() + interval '7 days'
    )
  $$,
  'an invite for a two-level domain is accepted by the table CHECK'
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
