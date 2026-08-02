begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

\ir fixtures/foundation.inc
\ir fixtures/recommendations.inc

-- ── cross-locality denial (member of other locality cannot see Manaus requests) ─

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.recommendation_requests
     where locality_id = '00000000-0000-4000-8000-000000000001' $$,
  'cross-locality member cannot see Manaus-scoped recommendation requests'
);

select is_empty(
  $$ select 1 from public.recommendation_replies $$,
  'cross-locality member cannot see any recommendation replies'
);

-- ── non-member denial ─────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.recommendation_requests',
  'non-member sees no recommendation requests'
);

select is_empty(
  'select 1 from public.recommendation_replies',
  'non-member sees no recommendation replies'
);

select is_empty(
  'select 1 from public.recommendation_saves',
  'non-member sees no recommendation saves'
);

-- ── cannot insert request into locality you do not belong to ───────────────

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000001',
      'Titulo de intruso',
      'Corpo de intruso na comunidade alheia sem permissao de acesso.',
      'outros'
    )
  $$,
  42501,
  null,
  'non-member cannot insert a recommendation request into a locality'
);

-- ── commercial title CHECK violation ───────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Promocao imperdivel de produtos!',
      'Esta e uma descricao valida o suficiente para passar mas o titulo deve falhar.',
      'outros'
    )
  $$,
  23514,
  null,
  'commercial word "promocao" in title is rejected by CHECK constraint'
);

-- ── commercial body CHECK violation ────────────────────────────────────────

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Titulo valido',
      'Ligue agora para contratar nossos servicos com preco promocional! whatsapp disponivel.',
      'outros'
    )
  $$,
  23514,
  null,
  'commercial terms in body ("contratar", "preco", "whatsapp") are rejected'
);

-- ── commercial reply CHECK violation ───────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_replies (
      request_id,
      author_id,
      body
    )
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Faca seu pagamento via PIX! Desconto exclusivo para quem fechar o contrato hoje.'
    )
  $$,
  23514,
  null,
  'commercial terms in reply ("pagamento", "desconto", "contrato") are rejected'
);

-- ── origin scope CHECK: cannot set both locality AND group ─────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      group_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
      'Titulo valido para ambos escopos',
      'Esta descricao tem tamanho suficiente para passar na validacao do body.',
      'outros'
    )
  $$,
  23514,
  null,
  'setting both locality_id and group_id is rejected by origin scope CHECK'
);

-- ── origin scope CHECK: must set at least one scope ────────────────────────

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      'Sem escopo definido',
      'Esta descricao tem tamanho suficiente para passar na validacao do body.',
      'outros'
    )
  $$,
  42501,
  null,
  'omitting both locality_id and group_id is rejected by RLS insert policy'
);

-- ── cannot insert a reply to a request you cannot see ──────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_replies (
      request_id,
      author_id,
      body
    )
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003',
      'Tentativa de responder de outra localidade.'
    )
  $$,
  42501,
  null,
  'cross-locality member cannot reply to a request they cannot see'
);

-- ── cannot update another user request ─────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    update public.recommendation_requests
    set title = 'Titulo modificado por outro'
    where id = '40000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'non-author cannot update another user recommendation request'
);

-- ── cannot insert a save for another user ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_saves (
      user_id,
      request_id
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'cannot insert a save for another user'
);

-- ── cannot delete another user save ────────────────────────────────────────

select results_eq(
  $$
    delete from public.recommendation_saves
    where user_id = '10000000-0000-4000-8000-000000000002'
      and request_id = '40000000-0000-4000-8000-000000000001'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'cannot delete another user save (RLS silently prevents)'
);

-- ── waitlist user (006) cannot insert a request ────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000006',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-000000000001',
      'Pedido de fora da comunidade',
      'Esta descricao tem tamanho suficiente para passar na validacao do body.',
      'outros'
    )
  $$,
  42501,
  null,
  'waitlist user cannot insert a recommendation request'
);

select * from finish();
rollback;
