begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select has_table('public', 'national_holidays', 'national holidays table exists');

-- Feriados nacionais 2026–2030 (insumo da Task 4 da onda F).
select results_eq(
  $$
    select count(*)
    from public.national_holidays
    where date between '2026-01-01' and '2030-12-31'
  $$,
  array[70::bigint],
  '70 national holidays across 2026-2030'
);

-- 2026-02-16 consta como Carnaval.
select results_eq(
  $$
    select name
    from public.national_holidays
    where date = '2026-02-16'
  $$,
  $$ values ('Carnaval'::text) $$,
  '2026-02-16 is Carnival'
);

-- Só feriado nacional existe nessa rota; nada de municipal/estadual inventado.
select results_eq(
  $$
    select count(distinct type)
    from public.national_holidays
  $$,
  array[1::bigint],
  'only national holidays are in the table'
);

select * from finish();
rollback;
