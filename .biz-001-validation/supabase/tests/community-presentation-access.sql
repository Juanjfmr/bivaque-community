begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

-- Apresentação da comunidade × participação (decisão do dono, 15/09/2026).
--
-- A leitura da LINHA da comunidade é de qualquer pessoa autenticada (nome,
-- descrição, cidade): é o que permite a tela dizer "existe, mas você não
-- participa" em vez de 404. O que continua fechado é participar e ver
-- conteúdo — e é isso que as negativas abaixo prendem.

\ir fixtures/foundation.inc
\ir fixtures/community.inc
\ir fixtures/communities.inc

reset role;

insert into public.communities (
  id,
  locality_id,
  created_by,
  owner_user_id,
  name,
  description
)
values (
  '00000000-0000-4000-8000-0000000000c1',
  '00000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'Comunidade de Outra Cidade',
  'Existe e não é da minha cidade.'
);

-- Fora da cidade: quem é membro só de Manaus.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select name
      from public.communities
     where id = '00000000-0000-4000-8000-0000000000c1'
  ),
  'Comunidade de Outra Cidade'::text,
  'quem não é da cidade lê a apresentação da comunidade'
);

select is(
  (
    select count(*)::integer
      from public.community_memberships
     where community_id = '00000000-0000-4000-8000-0000000000c1'
  ),
  0,
  'quem não é da cidade não vê o roster da comunidade'
);

select is(
  (
    select count(*)::integer
      from public.groups
     where community_id = '00000000-0000-4000-8000-0000000000c1'
  ),
  0,
  'quem não é da cidade não vê os grupos da comunidade'
);

select throws_ok(
  $$
    select public.request_community_membership(
      '00000000-0000-4000-8000-0000000000c1'
    )
  $$,
  'P0001',
  null,
  'quem não é da cidade não pede entrada'
);

-- A leitura da apresentação não abre a comunidade APAGADA.
reset role;

update public.communities set is_deleted = true
 where id = '00000000-0000-4000-8000-0000000000c1';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::integer
      from public.communities
     where id = '00000000-0000-4000-8000-0000000000c1'
  ),
  0,
  'comunidade apagada continua invisível'
);

-- Anônimo não lê: a policy é para `authenticated`.
reset role;

set local role anon;
select throws_ok(
  $$ select count(*) from public.communities $$,
  '42501',
  null,
  'anon não lê comunidade nenhuma (sem privilégio, não linha vazia)'
);

reset role;

-- A invisibilidade acima é da RLS, que não alcança o dono da tabela: a linha
-- continua no banco (soft delete), e é isso que mantém conteúdo e histórico
-- íntegros quando a comunidade é apagada.
select is(
  (
    select count(*)::integer
      from public.communities
     where id = '00000000-0000-4000-8000-0000000000c1'
       and is_deleted = true
  ),
  1,
  'apagar comunidade é soft delete: a linha continua no banco'
);

select is(
  (
    select count(*)::integer
      from public.communities
     where id = '70000000-0000-4000-8000-000000000001'
  ),
  1,
  'a comunidade viva segue legível'
);

select * from finish();
rollback;
