begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

-- Leitura do convite pelo próprio token (prancha 79, painel 2).
--
-- O convite é criado pelo caminho real (`create_provider_invitation`), o token
-- em claro é lido do outbox — que é onde ele existe, porque a tabela guarda só
-- o digest — e a leitura devolve o nome da comunidade. Os casos negativos
-- cobrem token ausente, malformado, desconhecido e expirado, além dos
-- privilégios: quem abre o link ainda não tem conta, então `anon` executa.

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

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
      'read-invite@example.invalid',
      'Eletricista do Bairro'
    )
  $$,
  'membro aprovado cria o convite que será lido pelo token'
);

reset role;

create temporary table convite as
select (payload ->> 'invite_path') as invite_path,
       split_part(payload ->> 'invite_path', '/', 3) as token
  from public.outbox
 where type = 'provider_invite'
   and recipient = 'read-invite@example.invalid'
 limit 1;

select is(
  (select count(*)::integer from convite where length(token) = 64),
  1,
  'o token em claro existe uma única vez, no caminho de entrega'
);

select results_eq(
  $$
    select community_id, community_name, status
      from public.read_provider_invitation((select token from convite))
  $$,
  $$
    values (
      '70000000-0000-4000-8000-000000000001'::uuid,
      'Vila Ajuricaba'::text,
      'pending'::text
    )
  $$,
  'o portador do token lê a comunidade que indicou'
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
  (
    select count(*)::integer
      from public.read_provider_invitation(repeat('a', 64))
  ),
  0,
  'token bem formado e desconhecido não devolve linha'
);

-- Convite expirado: a coluna ainda diz pending, o prazo é que venceu — mesmo
-- critério de accept_provider_invitation (P0004).
update private.provider_invitations
   set expires_at = now() - interval '1 day'
 where token_digest = extensions.digest(
   decode((select token from convite), 'hex'),
   'sha256'
 );

select is(
  (
    select status
      from public.read_provider_invitation((select token from convite))
  ),
  'expired'::text,
  'convite vencido é lido como expirado'
);

update private.provider_invitations
   set status = 'revoked',
       expires_at = now() + interval '6 days'
 where token_digest = extensions.digest(
   decode((select token from convite), 'hex'),
   'sha256'
 );

select is(
  (
    select status
      from public.read_provider_invitation((select token from convite))
  ),
  'revoked'::text,
  'convite revogado é lido como revogado, não como inexistente'
);

select is(
  pg_get_function_result('public.read_provider_invitation(text)'::regprocedure),
  'TABLE(community_id uuid, community_name text, status text)',
  'a leitura não expõe o digest do e-mail convidado'
);

-- Quem abre o link do convite ainda não tem conta, então `anon` precisa
-- executar a leitura. Aceitar continua exigindo sessão.
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

select * from finish();
rollback;
