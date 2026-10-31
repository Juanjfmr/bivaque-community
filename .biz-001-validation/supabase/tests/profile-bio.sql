begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

-- Bio do perfil (prancha 51) — ADR-20260909-perfil-bio, D1–D4.
-- Positivo E negativo em cada via: dono lê, terceiro da mesma cidade lê quando
-- a linha é visível, terceiro de outra cidade não lê, limite e varredura
-- recusam, esvaziar apaga, e ninguém escreve a bio alheia.

\ir fixtures/foundation.inc

-- ── dono escreve e lê a própria bio ─────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.set_profile_bio('Apaixonado por vida ao ar livre, trilhas e equipamentos.') $$,
  'o dono grava a própria bio'
);

select is(
  public.get_profile_bio('10000000-0000-4000-8000-000000000001'),
  'Apaixonado por vida ao ar livre, trilhas e equipamentos.',
  'o dono lê a bio que gravou'
);

-- ── terceiro da mesma cidade lê quando a linha é visível (positivo) ─────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  public.get_profile_bio('10000000-0000-4000-8000-000000000001'),
  'Apaixonado por vida ao ar livre, trilhas e equipamentos.',
  'membro da mesma cidade lê a bio visível'
);

-- ── terceiro de outra cidade não lê (negativo) ──────────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  public.get_profile_bio('10000000-0000-4000-8000-000000000001'),
  null,
  'membro de outra cidade não lê a bio'
);

-- ── sem vínculo compartilhado não lê (negativo) ─────────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select is(
  public.get_profile_bio('10000000-0000-4000-8000-000000000001'),
  null,
  'conta sem vínculo compartilhado não lê a bio'
);

-- ── limite de 300 caracteres (D1) ───────────────────────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ select public.set_profile_bio(repeat('a', 301)) $$,
  '23514',
  null,
  'bio acima de 300 caracteres é recusada'
);

-- ── varredura de conteúdo proibido (D4) ─────────────────────────────────────
select throws_ok(
  $$ select public.set_profile_bio('Meu contato e CPF 529.982.247-25') $$,
  '23514',
  null,
  'bio com conteúdo proibido é recusada'
);

-- ── esvaziar apaga (D3) ─────────────────────────────────────────────────────
select lives_ok(
  $$ select public.set_profile_bio('   ') $$,
  'esvaziar a bio grava vazio'
);

select is(
  public.get_profile_bio('10000000-0000-4000-8000-000000000001'),
  null,
  'esvaziar a bio apaga o valor — o dono deixa de lê-la'
);

-- ── ninguém escreve a bio alheia (negativo de escrita) ──────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ update public.profiles set bio = 'invasão' where user_id = '10000000-0000-4000-8000-000000000001' $$,
  'a atualização direta de linha alheia não levanta erro (RLS filtra)'
);

select is(
  public.get_profile_bio('10000000-0000-4000-8000-000000000001'),
  null,
  'a bio do outro membro permanece intocada após a tentativa'
);

select * from finish();
rollback;
