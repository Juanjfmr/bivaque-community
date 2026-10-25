begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

-- Leitura do convite pelo próprio token (prancha 79, painel 2).
--
-- RED-005 — no esquema aprovado (ADR-20261024 §6) o convite é criado pelo
-- OPERADOR e aponta para uma LOCALIDADE; a vila saiu. A leitura devolve a
-- localidade que indicou, e nunca o destino apagado da antiga comunidade.
-- Os negativos cobrem token ausente, malformado, não-hexadecimal, com espaço
-- nas bordas, desconhecido e expirado, além dos privilégios: quem abre o link
-- ainda não tem conta, então `anon` executa a leitura.

\ir fixtures/foundation.inc

-- Quem cria o convite é o operador; quem o aceita precisa de sessão.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'read-invite-accepted@example.invalid'),
  ('10000000-0000-4000-8000-00000000000c', 'operator-invite-read@example.invalid');

insert into public.operators (auth_user_id, notes)
values (
  '10000000-0000-4000-8000-00000000000c',
  'fixture: operador que cria o convite lido'
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
      'read-invite@example.invalid',
      'Eletricista do Bairro'
    )
  $$,
  'o operador cria o convite que será lido pelo token'
);

reset role;

create temporary table convite as
select (payload ->> 'invite_path') as invite_path,
       split_part(payload ->> 'invite_path', '/', 3) as token
  from public.outbox
 where type = 'provider_invite'
   and recipient = 'read-invite@example.invalid'
 limit 1;

-- A leitura é feita pelo papel de quem abre o link antes de ter conta: `anon`.
grant select on table convite to anon;

select is(
  (select count(*)::integer from convite where length(token) = 64),
  1,
  'o token em claro existe uma única vez, no caminho de entrega'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select results_eq(
  $$
    select locality_id, locality_name, status
      from public.read_provider_invitation((select token from convite))
  $$,
  $$
    values (
      '00000000-0000-4000-8000-000000000001'::uuid,
      'Manaus'::text,
      'pending'::text
    )
  $$,
  'o portador do token lê a localidade que indicou'
);

select is(
  (select count(*)::integer from public.read_provider_invitation(null)),
  0,
  'token ausente não devolve linha'
);

select is(
  (select count(*)::integer from public.read_provider_invitation('nao-e-token')),
  0,
  'token malformado não devolve linha'
);

select is(
  (select count(*)::integer from public.read_provider_invitation(repeat('g', 64))),
  0,
  'token de 64 caracteres não-hexadecimais não devolve linha (negativo)'
);

select is(
  (select count(*)::integer from public.read_provider_invitation(' ' || (select token from convite))),
  0,
  'token com espaço nas bordas não é aceito: a leitura não apara a entrada (negativo)'
);

select is(
  (
    select count(*)::integer
      from public.read_provider_invitation(repeat('a', 64))
  ),
  0,
  'token bem formado e desconhecido não devolve linha'
);

-- Convite expirado: a coluna ainda diz pending, o prazo é que venceu — mesmo
-- critério de accept_provider_invitation (P0004).
reset role;

update private.provider_invitations
   set expires_at = now() - interval '1 day'
 where token_digest = extensions.digest(
   decode((select token from convite), 'hex'),
   'sha256'
);

set local role anon;

select is(
  (
    select status
      from public.read_provider_invitation((select token from convite))
  ),
  'expired'::text,
  'convite vencido é lido como expirado'
);

reset role;

update private.provider_invitations
   set status = 'revoked',
       expires_at = now() + interval '6 days'
 where token_digest = extensions.digest(
   decode((select token from convite), 'hex'),
   'sha256'
);

set local role anon;

select is(
  (
    select status
      from public.read_provider_invitation((select token from convite))
  ),
  'revoked'::text,
  'convite revogado é lido como revogado, não como inexistente'
);

reset role;

select is(
  pg_get_function_result('public.read_provider_invitation(text)'::regprocedure),
  'TABLE(locality_id uuid, locality_name text, status text)',
  'a leitura não expõe o digest do e-mail convidado'
);

select ok(
  has_function_privilege('anon', 'public.read_provider_invitation(text)', 'EXECUTE'),
  'anon executa a leitura do convite'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.accept_provider_invitation(text, text)',
    'EXECUTE'
  ),
  'anon não aceita convite: aceitar exige sessão'
);

set local role anon;

-- Casos de entrada que o revisor independente mediu e o teste não cobria:
-- token em maiúsculas (o digest é do texto em caixa baixa), token vazio e
-- convite ACEITO.
select is(
  (
    select locality_name
      from public.read_provider_invitation(upper((select token from convite)))
  ),
  'Manaus'::text,
  'token em maiúsculas resolve o mesmo convite'
);

select is(
  (select count(*)::integer from public.read_provider_invitation('')),
  0,
  'token vazio não devolve linha'
);

reset role;

update private.provider_invitations
   set status = 'accepted',
       accepted_by_user_id = '10000000-0000-4000-8000-000000000020',
       accepted_at = now()
 where token_digest = extensions.digest(
   decode((select token from convite), 'hex'),
   'sha256'
);

set local role anon;

select is(
  (
    select status
      from public.read_provider_invitation((select token from convite))
  ),
  'accepted'::text,
  'convite aceito é lido como aceito: o link continua explicando o que houve'
);

select * from finish();
rollback;