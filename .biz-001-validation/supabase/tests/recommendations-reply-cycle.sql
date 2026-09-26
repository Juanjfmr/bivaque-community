begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc
\ir fixtures/recommendations.inc

-- ── group member (member-two, 002) can create a group-scoped request ───────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.recommendation_requests (
      id,
      author_id,
      group_id,
      title,
      body,
      category
    )
    values (
      '60000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000001',
      'Algum personal de corrida?',
      'Procuro indicacao de personal que atenda o grupo de corrida nas manhas de sabado.',
      'esporte_lazer'
    )
  $$,
  'group member can create a group-scoped recommendation request'
);

-- ── another approved group member (owner, 001) sees the group request ─────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select title from public.recommendation_requests
    where group_id = '40000000-0000-4000-8000-000000000001'
    order by created_at
  $$,
  $$ values ('Algum personal de corrida?'::text) $$,
  'approved group member sees group-scoped request'
);

-- ── locality member outside the group (007) cannot see the group request ──

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000007',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.recommendation_requests
    where group_id = '40000000-0000-4000-8000-000000000001'
  $$,
  'locality member outside the group cannot see group-scoped request'
);

-- ── group member (001) can reply to the group request ─────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.recommendation_replies (
      request_id,
      author_id,
      body
    )
    values (
      '60000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'Tem um personal que treina com a gente aos sabados pela manha.'
    )
  $$,
  'approved group member can reply to group-scoped request'
);

-- The fixture request has a fixed id; the insert above did not set one, so the
-- row receives a generated UUID. Find the latest reply for the assertion below.
select isnt_empty(
  $$
    select 1 from public.recommendation_replies
    where request_id = '60000000-0000-4000-8000-000000000001'
  $$,
  'group-scoped reply is visible to its author'
);

-- ── reply author can update and delete their own reply ─────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.recommendation_replies
    set body = 'Atualizei a indicacao do personal depois de confirmar com o grupo.'
    where request_id = '60000000-0000-4000-8000-000000000001'
      and author_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'reply author can update own reply'
);

-- ── another member cannot update that reply ───────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    update public.recommendation_replies
    set body = 'Resposta alterada por outra pessoa.'
    where request_id = '60000000-0000-4000-8000-000000000001'
      and author_id = '10000000-0000-4000-8000-000000000001'
    returning id
  $$,
  'non-author cannot update another member reply'
);

-- ── reply author can delete own reply ──────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    delete from public.recommendation_replies
    where request_id = '60000000-0000-4000-8000-000000000001'
      and author_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'reply author can delete own reply'
);

-- ── group_id FK exists ────────────────────────────────────────────────────

select results_eq(
  $$
    select count(*)
    from pg_constraint
    where conname = 'recommendation_requests_group_id_fkey'
      and contype = 'f'
  $$,
  array[1::bigint],
  'recommendation_requests.group_id has a foreign key'
);

-- ── arbitrary group_id is rejected before reaching the FK ─────────────────

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id,
      group_id,
      title,
      body,
      category
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      '99999999-9999-4999-8999-999999999999',
      'Grupo inexistente',
      'Esta descricao tem tamanho suficiente para passar na validacao do body.',
      'outros'
    )
  $$,
  42501,
  null,
  'arbitrary group_id is rejected by group membership RLS'
);

select * from finish();
rollback;
