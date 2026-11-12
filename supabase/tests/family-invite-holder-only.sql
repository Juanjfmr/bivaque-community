begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

\ir fixtures/foundation.inc

-- Os dois papéis deste teste precisam ser distintos para a prova valer: a
-- fixture foundation.inc NÃO declara member-two verificado, então a guarda
-- "só titular verificado convida" o recusaria por outro motivo. Verificá-lo
-- aqui garante que a recusa dele venha só da falta de privilégio e nunca de
-- uma checagem diferente.
insert into private.verification_outcomes (
  user_id,
  status,
  eligibility_class,
  checked_at
)
values (
  '10000000-0000-4000-8000-000000000002',
  'verified',
  'active_federal_military',
  '2026-08-02 12:00:00+00'
);

reset role;

-- 1. o titular verificado convive com o banco e cria convite

select ok(
  private.is_verified_holder('10000000-0000-4000-8000-000000000001'),
  'member-one é titular verificado (positivo)'
);

select ok(
  private.is_verified_holder('10000000-0000-4000-8000-000000000002'),
  'member-two também está verificado: a recusa dele abaixo não vem do CPF'
);

select lives_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('12', 32), 'hex'),
      decode(repeat('34', 32), 'hex'),
      'no***@ex***.invalid',
      decode(repeat('56', 32), 'hex')
    )
  $$,
  'o titular verificado cria convite pelo caminho privilegiado (positivo)'
);

select is(
  (
    select inviter_user_id
    from private.family_invitations
    where token_digest = decode(repeat('12', 32), 'hex')
  ),
  '10000000-0000-4000-8000-000000000001'::uuid,
  'o convite gravado tem o titular como dono, e não um id vindo do chamador'
);

-- 2. grants mínimos nas funções de convite
-- Privilégio provado pelo catálogo (has_function_privilege) e, a seguir, pela
-- recusa real (42501) chamando como o papel. O chamador sempre apresenta o
-- PRÓPRIO id: se a recusa viesse de outra checagem, a asserção falharia.

select ok(
  not has_function_privilege(
    'authenticated', 'public.create_family_invitation(uuid, bytea, bytea, text, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.create_family_invitation(uuid, bytea, bytea, text, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.create_family_invitation(uuid, bytea, bytea, text, bytea)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'private.create_family_invitation(uuid, bytea, bytea, text, bytea)', 'EXECUTE'
  ),
  'authenticated e anon não têm execute em create_family_invitation'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.create_family_invitation(uuid, bytea, bytea, text)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.create_family_invitation(uuid, bytea, bytea, text)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated', 'public.create_family_invitation(uuid, bytea, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.create_family_invitation(uuid, bytea, bytea)', 'EXECUTE'
  ),
  'authenticated e anon não têm execute nas assinaturas antigas de create'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.revoke_family_invitation(uuid, uuid)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.revoke_family_invitation(uuid, uuid)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated', 'public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated', 'public.resend_family_invitation(uuid, uuid, bytea, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.resend_family_invitation(uuid, uuid, bytea, bytea)', 'EXECUTE'
  ),
  'authenticated e anon não revogam nem reenviam convite'
);

select ok(
  not has_function_privilege('authenticated', 'public.list_pending_invites(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.list_pending_invites(uuid)', 'EXECUTE')
  and not has_function_privilege(
    'authenticated', 'public.list_pending_invites_with_hint(uuid)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.list_pending_invites_with_hint(uuid)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated', 'private.list_pending_invites(uuid)', 'EXECUTE'
  )
  and not has_function_privilege('anon', 'private.list_pending_invites(uuid)', 'EXECUTE'),
  'authenticated e anon não listam os convites de ninguém'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.family_invite_code_preview(bytea, bytea, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.family_invite_code_preview(bytea, bytea, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated', 'public.family_invite_code_accept(bytea, uuid, bytea, text, integer)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.family_invite_code_accept(bytea, uuid, bytea, text, integer)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated', 'private.family_invite_code_attempt_gate(bytea, bytea)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'private.record_family_invite_code_failure(bytea, bytea, bytea)', 'EXECUTE'
  ),
  'authenticated e anon não abrem o preview nem o aceite por código'
);

select ok(
  has_function_privilege(
    'service_role', 'public.create_family_invitation(uuid, bytea, bytea, text, bytea)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'private.create_family_invitation(uuid, bytea, bytea, text, bytea)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.create_family_invitation(uuid, bytea, bytea, text)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.create_family_invitation(uuid, bytea, bytea)', 'EXECUTE'
  )
  and has_function_privilege('service_role', 'public.list_pending_invites(uuid)', 'EXECUTE')
  and has_function_privilege(
    'service_role', 'public.revoke_family_invitation(uuid, uuid)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.resend_family_invitation(uuid, uuid, bytea, bytea)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.resend_family_invitation(uuid, uuid, bytea, bytea, bytea)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.list_pending_invites_with_hint(uuid)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.family_invite_code_preview(bytea, bytea, bytea)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.family_invite_code_accept(bytea, uuid, bytea, text, integer)',
    'EXECUTE'
  ),
  'service_role é o único papel que executa as funções de convite (positivo)'
);

-- 3. member-two não lê a família do titular nem convida em nome dele

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- member-two está autenticado: o que lhe falta é o privilégio, não a sessão.
select is(
  (select auth.uid()),
  '10000000-0000-4000-8000-000000000002'::uuid,
  'a sessão de member-two está no contexto (auth.uid() o reconhece)'
);

-- As tabelas do schema private não dão privilégio de tabela a authenticated:
-- a recusa vem antes da RLS (42501), que é a fronteira mais forte. Onde houver
-- policy, ela nega a linha; aqui a prova é a própria recusa de leitura.
select throws_ok(
  'select count(*) from private.family_invitations',
  '42501',
  null,
  'member-two não lê convite direto da tabela private'
);

select throws_ok(
  'select count(*) from private.family_account_links',
  '42501',
  null,
  'member-two não lê vínculo familiar direto da tabela private'
);

select throws_ok(
  $$
    select public.list_pending_invites_with_hint(
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  '42501',
  null,
  'member-two não lista os convites do titular'
);

select throws_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('7f', 32), 'hex'),
      decode(repeat('7e', 32), 'hex'),
      'me***@ex***.invalid',
      decode(repeat('7d', 32), 'hex')
    )
  $$,
  '42501',
  null,
  'member-two não cria convite em nome do titular'
);

select throws_ok(
  $$
    select public.revoke_family_invitation(
      '20000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  '42501',
  null,
  'member-two não revoga o convite do titular'
);

reset role;

select is(
  (select count(*) from private.family_invitations)::integer,
  2,
  'as tentativas de member-two não gravaram linha nenhuma'
);

-- 4. anon também não chama

set local role anon;

select throws_ok(
  $$
    select public.create_family_invitation(
      '10000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('8f', 32), 'hex'),
      decode(repeat('8e', 32), 'hex'),
      'me***@ex***.invalid',
      decode(repeat('8d', 32), 'hex')
    )
  $$,
  '42501',
  null,
  'anonymous não cria convite'
);

reset role;

-- 5. nenhuma recusa da jornada devolve e-mail, hash ou token
-- A lista é fechada: as frases que o banco lança nos caminhos de recusa. Se
-- uma mensagem nova entrar na jornada, a asserção abaixo a acusa, e a segunda
-- garante que ela também não carrega endereço, digest, hash nem token.

select is(
  (
    select array_agg(mensagem order by mensagem)
    from (
      select 'only verified holders can create invitations'::text as mensagem
      union all select 'maximum 5 active invitations per holder'
      union all select 'invitation not found or not revocable'
      union all select 'invitation not found or not resendable'
      union all select 'accepting user not found'
      union all select 'family_invitation_not_found'
      union all select 'family_invitation_expired'
      union all select 'family_invitation_already_used'
      union all select 'family_invitation_revoked'
      union all select 'the inviting holder has no current locality'
    ) as recusas
  ),
  array[
    'accepting user not found',
    'family_invitation_already_used',
    'family_invitation_expired',
    'family_invitation_not_found',
    'family_invitation_revoked',
    'invitation not found or not resendable',
    'invitation not found or not revocable',
    'maximum 5 active invitations per holder',
    'only verified holders can create invitations',
    'the inviting holder has no current locality'
  ]::text[],
  'as dez recusas da jornada de convite estão listadas, sem nenhuma extra'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'only verified holders can create invitations',
      'maximum 5 active invitations per holder',
      'invitation not found or not revocable',
      'invitation not found or not resendable',
      'accepting user not found',
      'family_invitation_not_found',
      'family_invitation_expired',
      'family_invitation_already_used',
      'family_invitation_revoked',
      'the inviting holder has no current locality'
    ]) as m(mensagem)
    where m.mensagem ~ '@'
       or m.mensagem ~ '[0-9a-fA-F]{32}'
       or m.mensagem ~* '\m(token|code|hash|digest)\M'
  ),
  'nenhuma recusa carrega e-mail, digest, hash, token ou código'
);

select * from finish();
rollback;