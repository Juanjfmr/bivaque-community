begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

\ir fixtures/foundation.inc
\ir fixtures/recommendations.inc

-- ── locality member (member-one, 001) can see locality-scoped requests ─────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select title from public.recommendation_requests order by created_at $$,
  $$ values ('Algum dentista de confianca na zona leste?'::text) $$,
  'locality member sees locality-scoped recommendation requests'
);

-- ── locality member sees replies on visible requests ───────────────────────

select results_eq(
  $$ select body from public.recommendation_replies order by created_at $$,
  $$ values ('Conheco uma clinica muito boa perto do Aleixo. O atendimento e otimo e aceitam varios convenios.'::text) $$,
  'locality member sees replies on visible requests'
);

-- ── locality member sees own saves ─────────────────────────────────────────

select results_eq(
  $$ select count(*) from public.recommendation_saves $$,
  array[0::bigint],
  'member-one sees their own save count (fixture saves belong to member-two)'
);

-- ── verified holder (also a member) can create a request ───────────────────

select lives_ok(
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
      'Alguma academia com horario estendido?',
      'Procuro uma academia na regiao central que funcione ate tarde durante a semana.',
      'esporte_lazer'
    )
  $$,
  'verified holder can create a locality-scoped recommendation request'
);

-- ── another locality member (007) can create a request ─────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000007',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      locality_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000007',
      '00000000-0000-4000-8000-000000000001',
      'Onde comprar material escolar?',
      'Preciso de indicacoes de papelarias com bons precos na zona sul.',
      'educacao'
    )
  $$,
  'any locality member can create a recommendation request'
);

-- ── new member (007) sees both requests ────────────────────────────────────

select results_eq(
  $$ select title from public.recommendation_requests order by created_at $$,
  $$ values
    ('Algum dentista de confianca na zona leste?'::text),
    ('Alguma academia com horario estendido?'::text),
    ('Onde comprar material escolar?'::text)
  $$,
  'locality member sees all locality-scoped requests'
);

-- ── a locality member can reply to a visible request ───────────────────────

select lives_ok(
  $$
    insert into public.recommendation_replies (
      request_id,
      author_id,
      body
    )
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000007',
      'Tem uma clinica odontologica na Constantino Nery que e muito boa.'
    )
  $$,
  'locality member can reply to a visible recommendation request'
);

-- ── a locality member can save a visible request ───────────────────────────

select lives_ok(
  $$
    insert into public.recommendation_saves (
      user_id,
      request_id
    )
    values (
      '10000000-0000-4000-8000-000000000007',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  'locality member can save a visible recommendation request'
);

-- ── member-two sees their own saves ────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select count(*) from public.recommendation_saves $$,
  array[1::bigint],
  'member-two sees only their own save'
);

-- ── member-two can delete their own save ───────────────────────────────────

select lives_ok(
  $$
    delete from public.recommendation_saves
    where user_id = '10000000-0000-4000-8000-000000000002'
      and request_id = '40000000-0000-4000-8000-000000000001'
  $$,
  'member-two can delete their own save'
);

select is_empty(
  $$ select 1 from public.recommendation_saves
     where user_id = '10000000-0000-4000-8000-000000000002' $$,
  'save is gone after deletion'
);

-- ── author can update their own request ────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.recommendation_requests
    set title = 'Algum dentista de confianca na zona leste? [atualizado]'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'author can update their own recommendation request'
);

select results_eq(
  $$
    select title
    from public.recommendation_requests
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Algum dentista de confianca na zona leste? [atualizado]'::text) $$,
  'update is visible after author edit'
);

-- ── author can delete their own request ────────────────────────────────────

-- Use the request created by member-one earlier (academia).
select lives_ok(
  $$
    delete from public.recommendation_requests
    where author_id = '10000000-0000-4000-8000-000000000001'
      and title = 'Alguma academia com horario estendido?'
  $$,
  'author can delete their own recommendation request'
);

select is_empty(
  $$
    select 1 from public.recommendation_requests
    where title = 'Alguma academia com horario estendido?'
  $$,
  'deleted request is gone'
);

-- ── hidden member (004, Manaus member) can see locality-scoped requests ────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select count(*) from public.recommendation_requests $$,
  array[2::bigint],
  'hidden locality member still sees locality-scoped requests'
);

-- ── anon cannot access any recommendation tables ──────────────────────────

set local role anon;

select throws_ok(
  'select 1 from public.recommendation_requests',
  42501,
  null,
  'anon cannot select recommendation_requests'
);

select throws_ok(
  'select 1 from public.recommendation_replies',
  42501,
  null,
  'anon cannot select recommendation_replies'
);

select throws_ok(
  'select 1 from public.recommendation_saves',
  42501,
  null,
  'anon cannot select recommendation_saves'
);

select * from finish();
rollback;
