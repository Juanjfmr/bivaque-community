begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc

insert into public.arrival_guide_entries (
  id, locality_id, category, name, description, status
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'school',
    'Escola Aprovada',
    'Item aprovado visível para membros da localidade.',
    'approved'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'hospital',
    'Hospital Aprovado',
    'Item aprovado visível para membros da localidade.',
    'approved'
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'transporter',
    'Transportadora Pendente',
    'Sugestão pendente que não pode aparecer para membros.',
    'pending'
  );

-- ── locality member sees only approved entries ────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select name from public.arrival_guide_entries
    where locality_id = '00000000-0000-4000-8000-000000000001'
    order by name
  $$,
  $$ values ('Escola Aprovada'::text), ('Hospital Aprovado'::text) $$,
  'locality member sees only approved guide entries'
);

select is_empty(
  $$
    select 1 from public.arrival_guide_entries
    where status = 'pending'
  $$,
  'locality member cannot see pending guide entries'
);

-- ── cross-locality member sees nothing ────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Consulta a outra cidade (20260925161111): quem é de outra cidade consulta o Guia,
-- mas só o aprovado.
select is_empty(
  $$ select 1 from public.arrival_guide_entries where status <> 'approved' $$,
  'cross-locality member sees only approved guide entries'
);

-- ── non-member sees nothing and cannot insert ─────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.arrival_guide_entries',
  'non-member sees no guide entries'
);

select throws_ok(
  $$
    insert into public.arrival_guide_entries (
      locality_id,
      category,
      name,
      description
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      'school',
      'Escola Intrusa',
      'Membro comum não pode inserir direto no guia.'
    )
  $$,
  42501,
  null,
  'authenticated member cannot insert guide entries directly'
);

select * from finish();
rollback;
