-- SEC-006 H1 (revisao final de 2026-10-21) - anuncio de comunidade exige
-- participacao aprovada.
--
-- A policy de `public.listings` conferia dono, suspensao e pedido de exclusao,
-- mas nao o publico. Com `community_id` de uma comunidade da qual a pessoa nao
-- participa, o anuncio era publicado nela - e a RPC `create_property_listing`
-- (SECURITY INVOKER) herdava a mesma lacuna.
--
-- O UPDATE tambem precisa reconferir o publico: o dono que deixou de ser membro
-- aprovado nao continua escrevendo no anuncio que ficou na comunidade. Trocar
-- o publico em si ja e proibido pelo trigger de imutabilidade de 20260911.
--
-- Fixtures: 001 aprovado na comunidade A; 002 pendente em A e aprovado em B;
-- 005 sem comunidade. A = 70000000-.-0001, B = 70000000-.-0002.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Anuncio ja existente em A, de propriedade do 002 (pendente em A). Criado
-- como superusuario para representar o estado que a policy antiga permitiu.
insert into public.listings (id, owner_user_id, kind, status, title, community_id)
values (
  'a2000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'property',
  'active',
  'Anuncio antigo em comunidade alheia',
  '70000000-0000-4000-8000-000000000001'
);

-- Anuncio ja existente em A, do 001 (aprovado em A), para o UPDATE positivo.
insert into public.listings (id, owner_user_id, kind, status, title, community_id)
values (
  'a2000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'property',
  'active',
  'Anuncio do membro aprovado',
  '70000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ---------------------------------------------------------------- pendente em A
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, community_id)
    values (
      '10000000-0000-4000-8000-000000000002',
      'property', 'active', 'Publicado na comunidade alheia',
      '70000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'membro pendente nao publica anuncio na comunidade A'
);

select throws_ok(
  $$
    update public.listings
       set title = 'Titulo trocado por quem nao participa'
     where id = 'a2000000-0000-4000-8000-000000000001'
  $$,
  42501,
  null,
  'membro pendente nao atualiza anuncio que esta na comunidade A'
);

select throws_ok(
  $$
    select public.create_property_listing(
      '{"status":"active","title":"RPC na comunidade alheia","community_id":"70000000-0000-4000-8000-000000000001"}'::jsonb,
      '{"deal":"rent","property_type":"house","rent_cents":200000}'::jsonb
    )
  $$,
  42501,
  null,
  'a RPC create_property_listing herda a recusa da policy'
);

select is_empty(
  $$ select 1 from public.listings where title = 'RPC na comunidade alheia' $$,
  'a RPC recusada nao deixa anuncio nem detalhe'
);

-- ---------------------------------------------------------------- aprovado em A
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, community_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      'property', 'active', 'Publicado na propria comunidade',
      '70000000-0000-4000-8000-000000000001'
    )
  $$,
  'membro aprovado publica anuncio na comunidade A'
);

select lives_ok(
  $$
    update public.listings
       set title = 'Titulo do membro aprovado'
     where id = 'a2000000-0000-4000-8000-000000000002'
  $$,
  'membro aprovado atualiza o proprio anuncio na comunidade A'
);

-- ---------------------------------------------------------------- aprovado em B
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, community_id)
    values (
      '10000000-0000-4000-8000-000000000002',
      'property', 'active', 'Publicado na comunidade B',
      '70000000-0000-4000-8000-000000000002'
    )
  $$,
  'membro aprovado na comunidade B publica nela'
);

-- ---------------------------------------------------------------- cidade
select lives_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, locality_id)
    values (
      '10000000-0000-4000-8000-000000000002',
      'property', 'active', 'Publicado para a cidade',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  'anuncio de cidade com community_id nulo continua funcionando'
);

select * from finish();
rollback;
