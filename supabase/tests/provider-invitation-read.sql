begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

-- Leitura do convite pelo próprio token (prancha 79, painel 2).
--
-- O convite é criado pelo caminho real (`create_provider_invitation`), o token
-- em claro é lido do outbox — que é onde ele existe, porque a tabela guarda só
-- o digest — e a leitura devolve o nome da comunidade. Os casos negativos
-- cobrem token ausente, malformado, desconhecido e expirado, além dos
-- privilégios: quem abre o link ainda não tem conta, então `anon` executa.

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Quem aceita o convite no caso "accepted" (o CHECK exige que não seja o
-- convidante, e a FK exige um usuário real).
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000020', 'read-invite-accepted@example.invalid');

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

-- Casos que o revisor independente mediu e o teste não cobria: token em
-- maiúsculas (o digest é do texto em caixa baixa), token vazio, convite ACEITO
-- e comunidade apagada.
select is(
  (
    select community_name
      from public.read_provider_invitation(upper((select token from convite)))
  ),
  'Vila Ajuricaba'::text,
  'token em maiúsculas resolve o mesmo convite'
);

select is(
  (select count(*)::integer from public.read_provider_invitation('')),
  0,
  'token vazio não devolve linha'
);

update private.provider_invitations
   set status = 'accepted',
       accepted_by_user_id = '10000000-0000-4000-8000-000000000020',
       accepted_at = now()
 where token_digest = extensions.digest(
   decode((select token from convite), 'hex'),
   'sha256'
 );

select is(
  (
    select status
      from public.read_provider_invitation((select token from convite))
  ),
  'accepted'::text,
  'convite aceito é lido como aceito: o link continua explicando o que houve'
);

update public.communities
   set is_deleted = true
 where id = '70000000-0000-4000-8000-000000000001';

// Contrato: a leitura devolve zero linhas para token ausente, malformado,
// desconhecido OU de comunidade apagada — sempre indistinguíveis, para não virar
// oráculo de existência de convite nem de comunidade.
select is(
  (select count(*)::integer from public.read_provider_invitation((select token from convite))),
  0,
  'comunidade apagada devolve zero linhas, como token desconhecido'
);

select * from finish();
rollback;
