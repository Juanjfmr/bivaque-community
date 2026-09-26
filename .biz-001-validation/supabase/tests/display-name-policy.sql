begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

-- P0 Task 5 (Step 3): a política de nomes (D23) — normalização NFC, sem
-- caracteres de controle, sem marcas bidi. Nome que se lê como outro é o
-- vetor mais barato de engano numa rede onde as pessoas se reconhecem por nome.

\ir fixtures/foundation.inc

set local role service_role;

-- Nome com marca bidi (U+202E) é rejeitado.
select throws_ok(
  $$
    update public.profiles
    set display_name = 'Membro ' || chr(8238) || 'reversed'
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'a name containing a bidi control mark (U+202E) is rejected'
);

-- Nome com caractere de controle (newline, U+000A) é rejeitado.
select throws_ok(
  $$
    update public.profiles
    set display_name = 'Membro' || chr(10) || 'Quebrado'
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'a name containing a control character is rejected'
);

-- Nome legítimo com acento passa.
select lives_ok(
  $$
    update public.profiles
    set display_name = 'Membro Acentuado'
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'a legitimate accented name is accepted'
);

select results_eq(
  $$
    select display_name
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Membro Acentuado'::text) $$,
  'the accepted name is stored as sent'
);

-- Decomposição NFD de um nome com acento é rejeitada (só NFC entra).
select throws_ok(
  $$
    update public.profiles
    set display_name = pg_catalog.normalize('Membro Acentuado João', 'NFD')
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'an NFD-decomposed accented name is rejected (NFC only)'
);

select * from finish();
rollback;
