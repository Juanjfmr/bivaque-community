begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

\ir fixtures/foundation.inc

-- Verbete aprovado (visível) com autor de sugestão registrado.
insert into public.arrival_guide_entries (
  id, locality_id, category, name, description, status, submitted_by
)
values (
  'a2000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'school',
  'Escola Aprovada com Autor',
  'Fixture do grant por coluna.',
  'approved',
  '10000000-0000-4000-8000-000000000002'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select id, name, category
      from public.arrival_guide_entries
     where id = 'a2000000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      'a2000000-0000-4000-8000-000000000001'::uuid,
      'Escola Aprovada com Autor'::text,
      'school'::public.arrival_guide_category
    )
  $$,
  'membro lê o verbete aprovado, sem a coluna do autor'
);

select throws_ok(
  $$
    select submitted_by
      from public.arrival_guide_entries
     where id = 'a2000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'authenticated não lê quem sugeriu'
);

select * from finish();
rollback;
