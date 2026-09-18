-- Visibilidade por campo da Força Armada e da OM autodeclaradas.
--
-- O assert que justifica o desenho é o 4. A D1 do ADR pedia colunas em
-- profiles com um booleano ao lado; sob profiles_select_visible_in_locality,
-- que libera a linha inteira a quem compartilha cidade, esse booleano seria
-- decorativo. Aqui o campo oculto não chega ao terceiro nem como linha.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc

-- member-one (001) declara as duas coisas: a Força Armada ele mostra, a OM
-- ele mantém para si. member-two (002) é da mesma cidade. other-locality
-- (003) é de outra.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values
       ('10000000-0000-4000-8000-000000000001', 'armed_force', 'exercito', true),
       ('10000000-0000-4000-8000-000000000001', 'om', 'CMA', false) $$,
  'membro declara Forca Armada visivel e OM oculta'
);

-- ── O dono enxerga os dois, visivel ou nao: o dado e dele.
select is(
  (
    select count(*)::int from public.profile_affiliations
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  2,
  'o dono le os dois campos, inclusive o oculto'
);

-- ── POSITIVO: vizinho de cidade le o campo marcado como visivel.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select value from public.profile_affiliations
    where user_id = '10000000-0000-4000-8000-000000000001'
      and field = 'armed_force'
  ),
  'exercito',
  'vizinho de cidade le a Forca Armada marcada como visivel'
);

-- ── NEGATIVO, o assert que sustenta o desenho: o campo oculto nao chega ao
-- terceiro nem como linha. Se isto virar 1, a visibilidade voltou a ser
-- promessa de cliente.
select is(
  (
    select count(*)::int from public.profile_affiliations
    where user_id = '10000000-0000-4000-8000-000000000001'
      and field = 'om'
  ),
  0,
  'vizinho de cidade NAO le a OM oculta'
);

-- ── NEGATIVO: membro de outra cidade nao le nem o campo visivel.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int from public.profile_affiliations
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0,
  'membro de outra cidade nao le nada, nem o campo visivel'
);

-- ── NEGATIVO: ninguem declara pelo outro.
select throws_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000001', 'om', 'invadido', true) $$,
  null,
  null,
  'terceiro nao declara afiliacao no perfil alheio'
);

-- ── D2: a lista de campos e fechada no banco, nao so na tela.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000002', 'patente', 'capitao', true) $$,
  null,
  null,
  'campo fora de armed_force/om e recusado pelo banco'
);

-- ── D2: a Forca Armada e selecao fechada tambem no banco.
select throws_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000002', 'armed_force', 'fuzileiros', true) $$,
  null,
  null,
  'Forca Armada fora do enum e recusada pelo banco'
);

-- ── D3: APAGAR remove a linha, e o valor deixa de ser alcancavel pelo terceiro.
-- O ADR exige este teste explicitamente ("o teste de remocao e parte da mesma
-- entrega, com prova de que a leitura por terceiro deixa de retornar o valor").
-- Oito asserts provavam ocultar; nenhum provava apagar.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

delete from public.profile_affiliations
 where user_id = '10000000-0000-4000-8000-000000000001'
   and field = 'armed_force';

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int from public.profile_affiliations
    where user_id = '10000000-0000-4000-8000-000000000001'
      and field = 'armed_force'
  ),
  0,
  'apagar o campo (DELETE da linha) torna o valor inalcancavel para o terceiro'
);

select * from finish();
rollback;
