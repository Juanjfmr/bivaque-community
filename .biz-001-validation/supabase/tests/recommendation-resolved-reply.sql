-- RECON-035 — a conversa registra qual resposta resolveu a pergunta.
--
-- Positivo e negativo, no servidor: a autora marca/limpa/reabre; quem não é a
-- autora, a resposta de outra pergunta e o PATCH direto são recusados; quem não
-- alcança a conversa não lê nem a marca nem a resposta; apagar a resposta
-- marcada não deixa referência pendurada.

begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

\ir fixtures/foundation.inc

reset role;

-- member-one (001) pergunta em Manaus (locality 001) e recebe duas respostas de
-- member-two (002). member-two também tem a própria pergunta, com resposta de
-- hidden-member (004), para o caso de cruzamento.
insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values (
  '70000000-0000-4000-8000-000000000035',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Procuro indicação de pediatra',
  'Alguém indica um pediatra que atenda perto do centro?',
  'outros'
);

insert into public.recommendation_replies (id, request_id, author_id, body)
values
  (
    '80000000-0000-4000-8000-000000000035',
    '70000000-0000-4000-8000-000000000035',
    '10000000-0000-4000-8000-000000000002',
    'A Dra. X atende muito bem no centro.'
  ),
  (
    '80000000-0000-4000-8000-000000000036',
    '70000000-0000-4000-8000-000000000035',
    '10000000-0000-4000-8000-000000000002',
    'Também recomendo a clínica Y.'
  );

insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values (
  '70000000-0000-4000-8000-000000000036',
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Procuro indicação de eletricista',
  'Alguém conhece um eletricista de confiança?',
  'outros'
);

insert into public.recommendation_replies (id, request_id, author_id, body)
values (
  '80000000-0000-4000-8000-000000000037',
  '70000000-0000-4000-8000-000000000036',
  '10000000-0000-4000-8000-000000000004',
  'O eletricista Z é muito bom.'
);

-- 1 — a pergunta nasce sem resposta marcada.
select ok(
  (
    select resolved_reply_id is null
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  'R35: a pergunta começa sem resposta marcada'
);

-- ── POSITIVE: a autora marca uma resposta da própria pergunta ───────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '70000000-0000-4000-8000-000000000035'::uuid,
      '80000000-0000-4000-8000-000000000035'::uuid
    )
  $$,
  'R35+: a autora marca uma resposta da própria pergunta'
);

select is(
  (
    select resolved_reply_id
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  '80000000-0000-4000-8000-000000000035'::uuid,
  'R35+: o marcador aponta para a resposta marcada'
);

select is(
  (
    select is_resolved
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  true,
  'R35+: marcar a resposta fecha a pergunta'
);

-- ── NEGATIVE: quem não escreveu a pergunta não marca ────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '70000000-0000-4000-8000-000000000035'::uuid,
      '80000000-0000-4000-8000-000000000035'::uuid
    )
  $$,
  'P0002',
  null,
  'R35-: quem não escreveu a pergunta recebe negativa ao marcar'
);

select is(
  (
    select resolved_reply_id
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  '80000000-0000-4000-8000-000000000035'::uuid,
  'R35-: a negativa não altera o marcador'
);

-- POSITIVE (leitura): quem alcança a conversa lê a marca.
select is(
  (
    select resolved_reply_id
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  '80000000-0000-4000-8000-000000000035'::uuid,
  'R35+: outro membro da localidade lê a marca'
);

-- ── NEGATIVE: resposta de OUTRA pergunta é recusada ─────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '70000000-0000-4000-8000-000000000035'::uuid,
      '80000000-0000-4000-8000-000000000037'::uuid
    )
  $$,
  'P0002',
  null,
  'R35-: marcar resposta de outra pergunta é recusado pelo servidor'
);

-- ── NEGATIVE: PATCH direto (sem interface) não burla a regra ────────────────
-- A autora tem RLS para atualizar a própria linha; o trigger recusa apontar
-- para resposta de outra pergunta.
select throws_ok(
  $$
    update public.recommendation_requests
    set resolved_reply_id = '80000000-0000-4000-8000-000000000037'::uuid
    where id = '70000000-0000-4000-8000-000000000035'::uuid
  $$,
  '23514',
  null,
  'R35-: update direto para resposta alheia é recusado pelo trigger'
);

-- ── POSITIVE: idempotência e troca da resposta marcada ──────────────────────
select lives_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '70000000-0000-4000-8000-000000000035'::uuid,
      '80000000-0000-4000-8000-000000000035'::uuid
    )
  $$,
  'R35+: marcar de novo é idempotente'
);

select is(
  (
    select resolved_reply_id
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  '80000000-0000-4000-8000-000000000035'::uuid,
  'R35+: o marcador permanece na mesma resposta'
);

select lives_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '70000000-0000-4000-8000-000000000035'::uuid,
      '80000000-0000-4000-8000-000000000036'::uuid
    )
  $$,
  'R35+: a autora troca a resposta marcada'
);

select is(
  (
    select resolved_reply_id
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  '80000000-0000-4000-8000-000000000036'::uuid,
  'R35+: o marcador passou para a nova resposta'
);

-- ── NEGATIVE: quem não alcança a conversa não lê nem a marca nem a resposta ──
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  (
    select count(*)
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  0::bigint,
  'R35-: membro de outra localidade não lê a conversa'
);

select is(
  (
    select count(*)
    from public.recommendation_replies
    where id = '80000000-0000-4000-8000-000000000035'
  ),
  0::bigint,
  'R35-: membro de outra localidade não lê a resposta'
);

-- ── POSITIVE: limpar a marca mantendo resolvida, com idempotência ───────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.clear_recommendation_resolved_reply(
      '70000000-0000-4000-8000-000000000035'::uuid
    )
  $$,
  'R35+: a autora limpa a marca'
);

select ok(
  (
    select resolved_reply_id is null
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  'R35+: limpar zera o marcador'
);

select is(
  (
    select is_resolved
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  true,
  'R35+: limpar a marca não reabre a pergunta'
);

select lives_ok(
  $$
    select public.clear_recommendation_resolved_reply(
      '70000000-0000-4000-8000-000000000035'::uuid
    )
  $$,
  'R35+: limpar de novo é idempotente'
);

-- ── POSITIVE: reabrir limpa o marcador ──────────────────────────────────────
select lives_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '70000000-0000-4000-8000-000000000035'::uuid,
      '80000000-0000-4000-8000-000000000036'::uuid
    )
  $$,
  'R35+: remarca antes de reabrir'
);

select lives_ok(
  $$
    select public.reopen_recommendation(
      '70000000-0000-4000-8000-000000000035'::uuid
    )
  $$,
  'R35+: a autora reabre a pergunta'
);

select is(
  (
    select is_resolved
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  false,
  'R35+: reabrir volta is_resolved para falso'
);

select ok(
  (
    select resolved_reply_id is null
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  'R35+: reabrir limpa o marcador'
);

-- ── POSITIVE: apagar a resposta marcada não deixa referência pendurada ──────
select lives_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '70000000-0000-4000-8000-000000000035'::uuid,
      '80000000-0000-4000-8000-000000000036'::uuid
    )
  $$,
  'R35+: remarca antes de apagar a resposta'
);

reset role;

delete from public.recommendation_replies
where id = '80000000-0000-4000-8000-000000000036';

select ok(
  (
    select resolved_reply_id is null
    from public.recommendation_requests
    where id = '70000000-0000-4000-8000-000000000035'
  ),
  'R35+: apagar a resposta marcada limpa a referência (on delete set null)'
);

select * from finish();
rollback;
