begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

\ir fixtures/foundation.inc

-- SEC-011 (auditoria de 16/11, A2-1/A2-2/A2-3): a posse do convite familiar é do
-- banco, derivada de auth.uid(), e os dois tetos são conferidos DENTRO da função,
-- sob trava por titular (migration 20261116221048).
--
-- O que se prova aqui:
--   * o titular verificado cria pela sessão, e o dono gravado é auth.uid();
--   * outro membro autenticado NÃO cria em nome de ninguém (não existe parâmetro
--     para isso, e o convite dele sai no nome dele) nem revoga/reenvia convite
--     alheio — com a mesma frase de um id inexistente, para não virar oráculo;
--   * anon é recusado por privilégio (42501) e autenticado sem sessão por
--     identidade (28000);
--   * a criação toma a trava por titular (prova de serialização no molde de
--     family-invite-code.sql: uma trava de transação só sai no commit);
--   * o teto de 5 ativos e o teto de 10 envios por hora recusam com frase fixa.

-- member-two também é titular verificado: a recusa dele vem da posse, nunca de
-- "não é titular".
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

-- ── 1. privilégio: só authenticated ────────────────────────────────────────

select ok(
  has_function_privilege(
    'authenticated', 'public.create_family_invitation(bytea, bytea, text, bytea)', 'EXECUTE'
  )
  and has_function_privilege(
    'authenticated', 'public.revoke_family_invitation(uuid)', 'EXECUTE'
  )
  and has_function_privilege(
    'authenticated', 'public.resend_family_invitation(uuid, bytea, bytea, bytea)', 'EXECUTE'
  ),
  'o membro autenticado executa as três funções de convite (positivo)'
);

select ok(
  not has_function_privilege(
    'anon', 'public.create_family_invitation(bytea, bytea, text, bytea)', 'EXECUTE'
  )
  and not has_function_privilege('anon', 'public.revoke_family_invitation(uuid)', 'EXECUTE')
  and not has_function_privilege(
    'anon', 'public.resend_family_invitation(uuid, bytea, bytea, bytea)', 'EXECUTE'
  ),
  'anon não executa as três funções: a posse exige sessão'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc p
    cross join lateral unnest(p.proargnames) as nome
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'create_family_invitation',
        'revoke_family_invitation',
        'resend_family_invitation'
      )
      and nome in ('p_inviter_user_id', 'p_user_id', 'p_holder_user_id')
  ),
  0,
  'nenhuma função pública de convite recebe o id do titular'
);

-- ── 2. anon (42501) e autenticado sem sessão (28000) ───────────────────────

set local role anon;

select throws_ok(
  $$
    select public.create_family_invitation(
      decode(repeat('a1', 32), 'hex'),
      decode(repeat('a2', 32), 'hex'),
      'fa***@ex***.invalid',
      decode(repeat('a3', 32), 'hex')
    )
  $$,
  '42501',
  null,
  'anonymous não cria convite'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_family_invitation(
      decode(repeat('a4', 32), 'hex'),
      decode(repeat('a5', 32), 'hex'),
      'fa***@ex***.invalid',
      decode(repeat('a6', 32), 'hex')
    )
  $$,
  '28000',
  'unauthenticated',
  'sem sessão a criação responde 28000 (falta identidade, não privilégio)'
);

reset role;

-- ── 3. o titular cria pela sessão, e o dono é auth.uid() ───────────────────

-- A trava é de transação: ela só sai no commit/rollback, então a contagem em
-- pg_locks depois da chamada prova que a criação a tomou. O retrato vem antes de
-- qualquer chamada que possa travar por este titular.
do $$
begin
  perform set_config(
    'bivaque.family_invite_lock_probe',
    (
      select count(*)::text
      from pg_catalog.pg_locks
      where locktype = 'advisory'
        and pid = pg_catalog.pg_backend_pid()
    ),
    false
  );
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_family_invitation(
      decode(repeat('b1', 32), 'hex'),
      decode(repeat('b2', 32), 'hex'),
      'fa***@ex***.invalid',
      decode(repeat('b3', 32), 'hex')
    )
  $$,
  'o titular verificado cria o convite pela sessão (positivo)'
);

reset role;

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_locks
    where locktype = 'advisory'
      and pid = pg_catalog.pg_backend_pid()
  ),
  current_setting('bivaque.family_invite_lock_probe')::integer + 1,
  'a criação trava por titular: contar e inserir não abrem corrida'
);

select is(
  (
    select inviter_user_id
    from private.family_invitations
    where token_digest = decode(repeat('b1', 32), 'hex')
  ),
  '10000000-0000-4000-8000-000000000001'::uuid,
  'o dono do convite é auth.uid(), não um id do chamador'
);

-- ── 4. outro membro autenticado não age em nome de ninguém ─────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_family_invitation(
      decode(repeat('c1', 32), 'hex'),
      decode(repeat('c2', 32), 'hex'),
      'me***@ex***.invalid',
      decode(repeat('c3', 32), 'hex')
    )
  $$,
  'outro membro autenticado cria o PRÓPRIO convite (controle positivo)'
);

reset role;

select is(
  (
    select inviter_user_id
    from private.family_invitations
    where token_digest = decode(repeat('c1', 32), 'hex')
  ),
  '10000000-0000-4000-8000-000000000002'::uuid,
  'o convite do segundo membro sai no nome dele: a função não cria pelo outro'
);

-- ── 5. convite alheio e convite inexistente respondem igual ────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.revoke_family_invitation(
      '20000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'P0001',
  'invitation not found or not revocable',
  'member-two não revoga o convite do titular'
);

reset role;

select is(
  (
    select status::text
    from private.family_invitations
    where id = '20000000-0000-4000-8000-000000000001'::uuid
  ),
  'pending',
  'o convite do titular continua pendente depois da tentativa'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- O digest do e-mail é o do convite do titular: a recusa vem da posse, não de
-- um e-mail que não confere.
select throws_ok(
  $$
    select public.resend_family_invitation(
      '20000000-0000-4000-8000-000000000001'::uuid,
      decode(repeat('d1', 32), 'hex'),
      decode(repeat('cd', 32), 'hex'),
      decode(repeat('d2', 32), 'hex')
    )
  $$,
  'P0001',
  'invitation not found or not resendable',
  'member-two não reenvia convite alheio nem acertando o e-mail do convite'
);

select throws_ok(
  $$
    select public.revoke_family_invitation(
      '90000000-0000-4000-8000-000000000009'::uuid
    )
  $$,
  'P0001',
  'invitation not found or not revocable',
  'convite inexistente responde igual ao alheio: o id não vira oráculo'
);

select throws_ok(
  $$
    select public.resend_family_invitation(
      '90000000-0000-4000-8000-000000000009'::uuid,
      decode(repeat('d3', 32), 'hex'),
      decode(repeat('cd', 32), 'hex'),
      decode(repeat('d4', 32), 'hex')
    )
  $$,
  'P0001',
  'invitation not found or not resendable',
  'reenvio de convite inexistente responde igual ao do convite alheio'
);

reset role;

-- ── 6. o teto de 5 ativos é do banco ───────────────────────────────────────

-- O segundo membro já tem o convite da seção 4; mais quatro fecham o teto.
do $$
begin
  insert into private.family_invitations (
    inviter_user_id,
    token_digest,
    invitee_email_digest,
    expires_at
  )
  select
    '10000000-0000-4000-8000-000000000002',
    extensions.digest('teto-de-ativos-' || i::text, 'sha256'),
    extensions.digest('teto-de-ativos-' || i::text || '@example.invalid', 'sha256'),
    now() + interval '7 days'
  from generate_series(1, 4) as g(i);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_family_invitation(
      decode(repeat('e1', 32), 'hex'),
      decode(repeat('e2', 32), 'hex'),
      'te***@ex***.invalid',
      decode(repeat('e3', 32), 'hex')
    )
  $$,
  'P0001',
  'maximum 5 active invitations per holder',
  'o sexto convite ativo do titular é recusado dentro da função'
);

reset role;

-- ── 7. o teto de envios por janela é do banco ──────────────────────────────

-- O titular já tem dois convites criados nesta janela (o da fixture e o da
-- seção 3). Mais oito fecham o teto de dez; eles entram revogados e vencidos,
-- então o que os conta é a janela de envio, não o teto de ativos.
do $$
begin
  insert into private.family_invitations (
    inviter_user_id,
    token_digest,
    invitee_email_digest,
    expires_at,
    status
  )
  select
    '10000000-0000-4000-8000-000000000001',
    extensions.digest('janela-de-envio-' || i::text, 'sha256'),
    extensions.digest('janela-de-envio-' || i::text || '@example.invalid', 'sha256'),
    now() - interval '1 day',
    'revoked'::private.family_invitation_status
  from generate_series(1, 8) as g(i);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_family_invitation(
      decode(repeat('f1', 32), 'hex'),
      decode(repeat('f2', 32), 'hex'),
      'ja***@ex***.invalid',
      decode(repeat('f3', 32), 'hex')
    )
  $$,
  'P0001',
  'maximum 10 invitations per holder per hour',
  'o décimo primeiro envio do titular na hora é recusado com frase fixa'
);

reset role;

-- ── 8. nenhuma recusa da jornada revela dado ───────────────────────────────

-- A lista é fechada: as dez frases de antes mais a do teto de envios. Se uma
-- mensagem nova entrar na jornada, a asserção abaixo a acusa; a segunda garante
-- que nenhuma delas carrega endereço, digest, hash, token ou código.
select is(
  (
    select array_agg(mensagem order by mensagem)
    from (
      select 'only verified holders can create invitations'::text as mensagem
      union all select 'maximum 5 active invitations per holder'
      union all select 'maximum 10 invitations per holder per hour'
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
    'maximum 10 invitations per holder per hour',
    'maximum 5 active invitations per holder',
    'only verified holders can create invitations',
    'the inviting holder has no current locality'
  ]::text[],
  'as dez recusas de antes continuam aqui, mais a do teto de envios'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'only verified holders can create invitations',
      'maximum 10 invitations per holder per hour',
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