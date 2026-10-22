-- DATA-001 / ADR-20261022, seção 1: bairro do perfil, "Mostrar meu bairro" e
-- a recusa de CEP em todo campo de bairro.
--
-- O que este arquivo prova, e é o motivo de ele existir:
--   * o bairro gravado com outra grafia sai com a grafia do catálogo;
--   * o DONO sempre lê o próprio bairro, mesmo com a chave desligada;
--   * outro membro que vê o perfil NÃO recebe o bairro com a chave desligada,
--     recebe com ela ligada, e o dado continua guardado (religar mostra);
--   * a coluna crua (inclusive `*` e JSON) é 42501 para `authenticated`: não
--     existe caminho de leitura que contorne a chave;
--   * terceiro não muda o bairro de outra pessoa;
--   * perfil, anúncio, alerta e pedido recusam 5+ dígitos seguidos (CEP).

begin;

create extension if not exists pgtap with schema extensions;
select plan(35);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- ───────────────────────────────────────────────────────────────────────────
-- 1. O dono grava: grafia do catálogo e coluna fora do SELECT do cliente
-- ───────────────────────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.profiles
       set neighborhood = '  ponta   negra '
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'o dono grava o próprio bairro'
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  'Ponta Negra',
  'a grafia do catálogo substitui a digitada'
);

select throws_ok(
  $$
    select neighborhood from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'a coluna crua não é legível nem pelo dono: a leitura é pela função'
);

select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'SELECT * não contorna a privacidade da coluna'
);

select throws_ok(
  $$ select to_jsonb(p) from public.profiles p $$,
  '42501', null,
  'linha inteira em JSON não contorna a privacidade da coluna'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Chave ligada (padrão): outro membro que vê o perfil recebe
-- ───────────────────────────────────────────────────────────────────────────

reset role;
select is(
  (
    select show_neighborhood from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000002'
  ),
  true,
  '"Mostrar meu bairro" nasce ligada'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  'Ponta Negra',
  'outro membro da mesma cidade recebe o bairro com a chave ligada'
);

select throws_ok(
  $$
    select neighborhood from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'outro membro também não lê a coluna crua'
);

select is_empty(
  $$
    update public.profiles
       set neighborhood = 'Centro'
     where user_id = '10000000-0000-4000-8000-000000000001'
    returning user_id
  $$,
  'terceiro não muda o bairro de outra pessoa'
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  'Ponta Negra',
  'o bairro do dono continua o mesmo depois da tentativa de terceiro'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Chave desligada: ninguém além do dono recebe; o dado fica guardado
-- ───────────────────────────────────────────────────────────────────────────

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.profiles
       set show_neighborhood = false
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'o dono desliga a chave sem apagar o bairro'
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  'Ponta Negra',
  'o dono sempre recebe o próprio bairro, com a chave desligada'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  null::text,
  'com a chave desligada, outro membro NÃO recebe o bairro'
);

reset role;
update public.profiles
   set show_neighborhood = true
 where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  'Ponta Negra',
  'religar a chave mostra o mesmo bairro: o dado nunca saiu'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Quem não vê o perfil não recebe o bairro, nem por comunidade
-- ───────────────────────────────────────────────────────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  null::text,
  'membro de outra cidade, sem comunidade em comum, não recebe o bairro'
);

-- Vira co-membro aprovado da comunidade de member-one. A policy
-- `profiles_select_community_comember` já deixa esta pessoa ver o perfil;
-- logo, com a chave ligada, o bairro acompanha.
reset role;
insert into public.community_memberships (community_id, user_id, role, status)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003',
  'member',
  'approved'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  'Ponta Negra',
  'co-membro aprovado da comunidade vê o perfil e recebe o bairro com a chave ligada'
);

-- A chave vale também para quem chega pelo vínculo de comunidade, não só pelo
-- de cidade: ver o perfil (policy de co-membro) não é permissão para ver o
-- bairro. Sem este par, uma implementação que só escondesse de quem compartilha
-- cidade passaria por todas as asserções acima.
reset role;
update public.profiles
   set show_neighborhood = false
 where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);

select is(
  (
    select display_name from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  'Member One',
  'com a chave desligada o co-membro continua vendo o perfil (só o bairro sai)'
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  null::text,
  'co-membro aprovado da comunidade NÃO recebe o bairro com a chave desligada'
);

reset role;
update public.profiles
   set show_neighborhood = true
 where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  'Ponta Negra',
  'religar a chave devolve o bairro ao co-membro de comunidade'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);

select is(
  public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001'),
  null::text,
  'quem não tem vínculo (nem cidade, nem comunidade) não recebe o bairro'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Anônimo
-- ───────────────────────────────────────────────────────────────────────────

reset role;
set local role anon;

select throws_ok(
  $$ select public.get_profile_neighborhood('10000000-0000-4000-8000-000000000001') $$,
  '42501', null,
  'anônimo não executa a leitura do bairro'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. A regra de CEP
-- ───────────────────────────────────────────────────────────────────────────

reset role;

select is(
  private.is_cep_like('69057-000'),
  true,
  'CEP com hífen é reconhecido'
);

select is(
  private.is_cep_like('CEP 69057000'),
  true,
  'CEP junto de texto é reconhecido'
);

select is(
  private.is_cep_like('Parque 10'),
  false,
  '"Parque 10" não é CEP'
);

select is(
  private.is_cep_like('Quadra 12, bloco 345'),
  false,
  'números soltos separados não viram CEP'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    update public.profiles set neighborhood = '69057-000'
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '23514', null,
  'perfil recusa CEP puro'
);

select throws_ok(
  $$
    update public.profiles set neighborhood = 'Rua X, 69050-000'
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '23514', null,
  'perfil recusa CEP escondido no texto'
);

select throws_ok(
  $$
    update public.profiles set neighborhood = repeat('a', 81)
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '23514', null,
  'perfil recusa bairro acima de 80 caracteres'
);

select lives_ok(
  $$
    update public.profiles set neighborhood = 'Parque 10'
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'perfil aceita bairro com número que não é CEP'
);

reset role;

select throws_ok(
  $$
    insert into public.listings (
      owner_user_id, kind, status, title, description, locality_id,
      neighborhood, category, price_cents, condition
    ) values (
      '10000000-0000-4000-8000-000000000002', 'item', 'active',
      'Produto com CEP', 'Descrição de teste.', '00000000-0000-4000-8000-000000000001',
      '69057-000', 'outros', 1000, 'used'
    )
  $$,
  '23514', null,
  'anúncio recusa CEP no bairro'
);

select lives_ok(
  $$
    insert into public.listings (
      owner_user_id, kind, status, title, description, locality_id,
      neighborhood, category, price_cents, condition
    ) values (
      '10000000-0000-4000-8000-000000000002', 'item', 'active',
      'Produto sem CEP', 'Descrição de teste.', '00000000-0000-4000-8000-000000000001',
      'Parque 10', 'outros', 1000, 'used'
    )
  $$,
  'anúncio aceita bairro de verdade'
);

select throws_ok(
  $$
    insert into public.listing_alerts (owner_user_id, name, neighborhood)
    values ('10000000-0000-4000-8000-000000000001', 'Alerta com CEP', '69057-000')
  $$,
  '23514', null,
  'alerta recusa CEP no bairro'
);

select lives_ok(
  $$
    insert into public.listing_alerts (owner_user_id, name, neighborhood)
    values ('10000000-0000-4000-8000-000000000001', 'Alerta sem CEP', 'Parque 10')
  $$,
  'alerta aceita bairro de verdade'
);

-- Pedido de serviço precisa de um prestador válido para chegar ao CHECK.
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000025', 'provider-neighborhood@example.invalid');

insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values (
  '10000000-0000-4000-8000-000000000025',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values (
  '30000000-0000-4000-8000-000000000025',
  '10000000-0000-4000-8000-000000000025',
  'Prestador de bairro',
  'alimentacao'
);

select throws_ok(
  $$
    insert into public.service_requests (
      requester_user_id, provider_id, provider_user_id, description, category, region
    ) values (
      '10000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000025',
      '10000000-0000-4000-8000-000000000025',
      'Preciso de ajuda na mudança.', 'alimentacao', '69057-000'
    )
  $$,
  '23514', null,
  'pedido recusa CEP no campo de localização (region)'
);

select lives_ok(
  $$
    insert into public.service_requests (
      requester_user_id, provider_id, provider_user_id, description, category, region
    ) values (
      '10000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000025',
      '10000000-0000-4000-8000-000000000025',
      'Preciso de ajuda na mudança.', 'alimentacao', 'Parque 10'
    )
  $$,
  'pedido aceita localização de verdade'
);

select * from finish();
rollback;
