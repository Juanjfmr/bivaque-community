-- Memória de indicações (migration 20260926004501,
-- ADR-20260925-memoria-de-indicacoes).
--
-- Prova: pedido de saúde vai para a cidade; o pedido cabe numa frase (detalhe
-- vazio); a busca ignora palavras de pergunta e acento; acha pelo texto da
-- resposta; na busca o resolvido vem antes, sem busca vale a data; filtros de estado funcionam; e quem é de
-- outra cidade ou não é membro não alcança nada pela função.
--
-- Os termos de busca ("quelonario", "tucunarex") não existem no seed de
-- desenvolvimento, então o arquivo passa com ou sem seed.

begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

\ir fixtures/foundation.inc

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

-- 1. Saúde para a cidade, sem grupo.
select lives_ok(
  $$
    insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
    values (
      '81000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Alguém indica pediatra quelonário?',
      'Filha de 3 anos.',
      'saude_bem_estar'
    )
  $$,
  'pedido de saúde vai para a cidade sem grupo'
);

-- 2. Uma frase basta: detalhe vazio.
select lives_ok(
  $$
    insert into public.recommendation_requests (id, author_id, locality_id, title, body, category, created_at)
    values (
      '81000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Médico quelonário na zona sul',
      '',
      'saude_bem_estar',
      now() + interval '1 minute'
    )
  $$,
  'pedido sem detalhe é aceito'
);

-- Um terceiro pedido só casa pela RESPOSTA.
insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values (
  '81000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Peixaria boa perto da vila',
  '',
  'alimentacao'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

insert into public.recommendation_replies (id, request_id, author_id, body)
values
  ('d1000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000002', 'A Dra. Helena atende bem.'),
  ('d1000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000002', 'O Tucunarex, na feira da Panair.');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select public.mark_recommendation_reply_resolved(
  '81000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001'
);

-- 3. Palavras de pergunta e acento não atrapalham; o resolvido vem antes do
--    mais novo.
select results_eq(
  $$
    select id from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'Alguém indica um quelonario?'
    )
  $$,
  $$ values
    ('81000000-0000-4000-8000-000000000001'::uuid),
    ('81000000-0000-4000-8000-000000000002'::uuid)
  $$,
  'busca sem acento e sem palavras de pergunta; resolvido primeiro'
);

-- 4. A resposta que resolveu volta junto.
select is(
  (
    select resolved_reply_body from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'quelonario'
    ) where id = '81000000-0000-4000-8000-000000000001'
  ),
  'A Dra. Helena atende bem.',
  'o pedido resolvido traz a resposta marcada'
);

-- 5. Acha pelo texto de uma resposta e diz qual.
select is(
  (
    select matched_reply_body from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'tucunarex'
    ) where id = '81000000-0000-4000-8000-000000000003'
  ),
  'O Tucunarex, na feira da Panair.',
  'busca acha o pedido pelo texto da resposta'
);

-- 5b. Um termo de três casando só numa resposta é ruído: fica de fora.
select is(
  (
    select count(*)::integer from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'tucunarex violino luthier'
    ) where id = '81000000-0000-4000-8000-000000000003'
  ),
  0,
  'termo minoritário só na resposta não traz o pedido'
);

-- 6. Mais termos casados vem antes: "quelonario zona" põe o pedido da zona sul
--    na frente do resolvido.
select is(
  (
    select id from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'quelonario zona sul'
    ) limit 1
  ),
  '81000000-0000-4000-8000-000000000002'::uuid,
  'o pedido que casa mais termos vem primeiro'
);

-- 7. Filtro de estado: esperando resposta não traz o resolvido.
select is(
  (
    select count(*)::integer from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'quelonario', null, false
    )
  ),
  1,
  'filtro de não resolvidos'
);

-- 8. Filtro de categoria.
select is(
  (
    select count(*)::integer from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'quelonario', 'alimentacao'
    )
  ),
  0,
  'filtro de categoria'
);

-- 8b. Sem busca, a lista vai por data: o resolvido não passa na frente do
--     mais novo (o 001 e o 003 têm o mesmo instante; desempate pelo id).
select results_eq(
  $$
    select id from public.list_indications(
      '00000000-0000-4000-8000-000000000001', null, null, null, 50
    )
    where id::text like '81000000-%'
  $$,
  $$ values
    ('81000000-0000-4000-8000-000000000002'::uuid),
    ('81000000-0000-4000-8000-000000000003'::uuid),
    ('81000000-0000-4000-8000-000000000001'::uuid)
  $$,
  'sem busca, o mais novo primeiro'
);

-- 9. Membro de outra cidade não alcança os pedidos desta.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(
  (
    select count(*)::integer from public.list_indications(
      '00000000-0000-4000-8000-000000000001', 'quelonario'
    )
  ),
  0,
  'membro de outra cidade não vê pela função'
);

-- 10. Anônimo não executa.
reset role;
set local role anon;
select throws_ok(
  $$ select * from public.list_indications('00000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'anon não executa list_indications'
);

select * from finish();
rollback;
