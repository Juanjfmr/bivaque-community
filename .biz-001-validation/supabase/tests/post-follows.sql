-- Acompanhar publicacoes (post_follows + feed_following + my_follow nos feeds)
-- (RECON-049, prancha 01: abas Recentes/Acompanhando e acao "Acompanhar").
--
-- O que esta suite prova:
--   positivo — membro segue um post da propria comunidade e o feed_following o
--              devolve; my_follow vem true no feed_community;
--   negativo — terceiro nao ve nem apaga follow alheio; seguir sem direito de
--              leitura (post de comunidade de que nao e membro aprovado) nao
--              ressuscita o post no feed_following; anon nao executa nada;
--   integridade — chave composta impede follow duplicado; apagar o follow
--              esvazia o feed de acompanhados.

begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- 1) membro aprovado (004, hidden-member) segue o post da propria comunidade A
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into public.post_follows (post_id, user_id)
     values ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004') $$,
  'membro segue o post da propria comunidade'
);

-- 2) a linha de follow existe e e visivel para o proprio dono
reset role;

select is(
  (
    select count(*)
    from public.post_follows
    where post_id = '90000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  1::bigint,
  'follow registrado e visivel para o proprio dono'
);

-- 3) terceiro (001) nao ve o follow de 004 (policy de select e own-only)
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)
    from public.post_follows
    where post_id = '90000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  0::bigint,
  'terceiro nao ve follow alheio'
);

-- 4) terceiro (001) nao apaga o follow de 004 (policy de delete e own-only)
select lives_ok(
  $$ delete from public.post_follows
     where post_id = '90000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000004' $$,
  'delete de follow alheio e aceito pela RLS (no-op sem linha visivel)'
);

reset role;

select is(
  (
    select count(*)
    from public.post_follows
    where post_id = '90000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  1::bigint,
  'follow de terceiro permanece apos o no-op'
);

-- 5) follow duplicado e impedido pela chave composta
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.post_follows (post_id, user_id)
     values ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004') $$,
  '23505',
  null,
  'follow duplicado e rejeitado pela chave composta'
);

-- 6) feed_following devolve o post seguido (matriz de visibilidade ok)
select is(
  (
    select count(*)
    from public.feed_following()
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'feed_following devolve o post seguido da propria comunidade'
);

-- 7) my_follow vem true no feed_community para o post seguido
select is(
  (
    select my_follow
    from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent')
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  true,
  'feed_community marca my_follow true no post seguido'
);

-- 8) e false nos posts que a pessoa nao segue (post de grupo publico, id 002)
select is(
  (
    select my_follow
    from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent')
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  false,
  'feed_community marca my_follow false em post nao seguido'
);

-- 9) follow de post sem direito de leitura nao aparece no feed_following:
--    002 segue o post da comunidade A, mas e pendente na A (nao e membro
--    aprovado) — o feed nao ressuscita o post
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into public.post_follows (post_id, user_id)
     values ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002') $$,
  'membro pendente registra follow (RSL aceita por ser linha propria)'
);

select is(
  (
    select count(*)
    from public.feed_following()
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'post de comunidade sem membership aprovada nao vaza no feed_following'
);

-- 10) apagar o proprio follow esvazia o feed de acompanhados (004)
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ delete from public.post_follows
     where post_id = '90000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000004' $$,
  'membro apaga o proprio follow'
);

select is(
  (
    select count(*)
    from public.feed_following()
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'feed de acompanhados esvazia apos apagar o follow'
);

-- 11) anon nao ve a tabela (sem grant)
reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$ select * from public.post_follows limit 1 $$,
  '42501',
  null,
  'anon nao le post_follows'
);

-- 12) anon nao executa feed_following
select throws_ok(
  $$ select public.feed_following() $$,
  '42501',
  null,
  'anon nao executa feed_following'
);

select * from finish();
rollback;
