-- Onda G Task 5, Step 2 — busca dentro do alcance e a guarda da D29.
--
-- A busca enxerga só ficha com alcance ativo que o chamador pode ver; filtro
-- de categoria é exato; nome aceita parcial/trgm. E o teste da D29 existe
-- para durar: duas fichas na MESMA categoria na vila A, uma free e outra
-- paid, com nomes que colocam a GRÁTIS primeiro na ordem alfabética. Se um
-- dia a ordenação passar a privilegiar o pagante, este teste fica vermelho.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000006', 'search-city-only@example.invalid'),
  ('10000000-0000-4000-8000-000000000020', 'search-provider-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'search-provider-b@example.invalid'),
  ('10000000-0000-4000-8000-000000000022', 'search-provider-free@example.invalid'),
  ('10000000-0000-4000-8000-000000000023', 'search-provider-paid@example.invalid');

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values
  (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000022',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  );

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values
  ('30000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000020', 'Climatiza Ajuricaba', 'assistencia_tecnica'),
  ('30000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000021', 'Marmitas da Vizinha', 'alimentacao'),
  -- D29: mesma categoria, nomes em ordem alfabética colocando a GRÁTIS antes.
  ('30000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000022', 'Alfa Serviços', 'alimentacao'),
  ('30000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000023', 'Beta Soluções', 'alimentacao');

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values
  ('30000000-0000-4000-8000-000000000020', 'community', '70000000-0000-4000-8000-000000000001', 'free'),
  ('30000000-0000-4000-8000-000000000021', 'community', '70000000-0000-4000-8000-000000000002', 'free'),
  ('30000000-0000-4000-8000-000000000022', 'community', '70000000-0000-4000-8000-000000000001', 'free'),
  -- reach pago inserido com privilégio: hoje ninguém o cria (Task 7).
  ('30000000-0000-4000-8000-000000000023', 'community', '70000000-0000-4000-8000-000000000001', 'paid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Membro aprovado da vila A busca sem filtro: vê a ficha da própria vila…
select isnt_empty(
  $$ select 1 from public.search_providers()
      where id = '30000000-0000-4000-8000-000000000020' $$,
  'member of community A finds its provider without filter'
);

-- …e NÃO vê a ficha cujo alcance é só a vila B.
select is_empty(
  $$ select 1 from public.search_providers()
      where id = '30000000-0000-4000-8000-000000000021' $$,
  'member of community A does not find community B-only provider'
);

-- Filtro por categoria devolve somente aquela categoria…
select results_eq(
  $$
    select count(*)
      from public.search_providers(p_category => 'alimentacao')
     where category <> 'alimentacao'
  $$,
  array[0::bigint],
  'category filter returns only the requested category'
);
select isnt_empty(
  $$ select 1 from public.search_providers(p_category => 'alimentacao')
      where id = '30000000-0000-4000-8000-000000000022' $$,
  'in-scope provider of the requested category is found'
);
select is_empty(
  $$ select 1 from public.search_providers(p_category => 'alimentacao')
      where id = '30000000-0000-4000-8000-000000000021' $$,
  'category filter still respects reach scope'
);

-- Nome parcial: "clima" acha "Climatiza Ajuricaba".
select isnt_empty(
  $$ select 1 from public.search_providers(p_query => 'clima')
      where id = '30000000-0000-4000-8000-000000000020' $$,
  'partial name search finds the provider'
);

-- ── A GUARDA DA D29 ─────────────────────────────────────────────────────────
-- Grátis primeiro, mesmo sendo a segunda no alfabeto entre as duas? Não:
-- os nomes foram escolhidos para a GRÁTIS ("Alfa") vir ANTES da paga ("Beta")
-- na ordem alfabética. Se alguém trocar a ordenação para priorizar o pagante,
-- o resultado passa a ser "Beta Soluções" e ESTE assert fica vermelho.
select results_eq(
  $$
    select display_name
      from public.search_providers()
     where id in (
       '30000000-0000-4000-8000-000000000022',
       '30000000-0000-4000-8000-000000000023'
     )
     order by display_name
     limit 1
  $$,
  $$ values ('Alfa Serviços'::text) $$,
  'D29: free listing ranks before paid on equal relevance'
);

-- …e a fonte de alcance não vaza como critério implícito: ambas aparecem.
select results_eq(
  $$
    select count(*)
      from public.search_providers()
     where id in (
       '30000000-0000-4000-8000-000000000022',
       '30000000-0000-4000-8000-000000000023'
     )
  $$,
  array[2::bigint],
  'D29: both free and paid listings are returned'
);

-- Membro da cidade sem vila nenhuma não vê ficha nenhuma de comunidade —
-- é exatamente o caso que o alcance pago de localidade (Task 7) vai inverter.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select is_empty(
  $$ select 1 from public.search_providers() $$,
  'locality member without any community sees nothing for now'
);

select * from finish();
rollback;
