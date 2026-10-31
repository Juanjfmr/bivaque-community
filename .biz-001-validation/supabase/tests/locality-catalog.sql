begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

-- ibge_code é a identidade canônica: obrigatório e único.
select col_not_null(
  'public',
  'localities',
  'ibge_code',
  'ibge_code is required on every locality'
);

select col_is_unique(
  'public',
  'localities',
  'ibge_code',
  'ibge_code is the canonical unique identity'
);

-- Código com 6 dígitos é rejeitado pelo check do schema.
select throws_ok(
  $$
    insert into public.localities (slug, city_name, state_code, country_code, ibge_code)
    values ('seis-digitos-teste', 'Seis Digitos', 'ZZ', 'BR', '123456')
  $$,
  '23514',
  null,
  'six-digit ibge_code is rejected by the check constraint'
);

-- Manaus manteve o UUID original (asserção literal sobre o id).
select results_eq(
  $$
    select id::text
    from public.localities
    where slug = 'manaus-am'
  $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::text) $$,
  'Manaus kept its original durable UUID'
);

-- O total de linhas bate com a contagem que o script registrou no cabeçalho
-- da migration de dados (5571 municípios em 27 UFs).
select results_eq(
  $$
    select count(*)
    from public.localities
  $$,
  array[5571::bigint],
  'catalog total matches the number produced by the generator'
);

-- Manaus carrega o código IBGE canônico.
select results_eq(
  $$
    select ibge_code
    from public.localities
    where slug = 'manaus-am'
  $$,
  $$ values ('1302603'::text) $$,
  'Manaus carries its canonical IBGE code'
);

-- Todo slug do catálogo carrega o sufixo da UF (homônimos não colidem).
select results_eq(
  $$
    select count(*)
    from public.localities
    where slug !~ '-[a-z]{2}$'
  $$,
  array[0::bigint],
  'every catalog slug carries the state suffix'
);

select * from finish();
rollback;
