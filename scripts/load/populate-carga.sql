-- POPULACAO DE TESTE DE CARGA — 500 usuarios em 7 estados, 19 cidades.
--
-- NAO e o seed de desenvolvimento: e um script a parte, para o responsavel
-- observar como a plataforma reage com densidade geografica diversa. Rodar com
-- psql sobre o banco local (ver scripts/load/populate.mjs).
--
-- Estrategia: os usuarios nascem 'verified' (a entrada e verification_gated),
-- recebem locality_membership na cidade escolhida e um profile visivel para
-- membros da localidade. A distribuicao e DETERMINISTICA (i % n), para a
-- mesma execucao produzir sempre o mesmo banco e a comparacao entre rodadas
-- valer.

-- GUARDA: a faixa de UUID tem de estar LIVRE. Na primeira tentativa usei
-- 40000000-... e colidi com os 60 dependentes do seed: o on conflict do nothing
-- descartou em silencio os que batiam, e a carga ficou menor do que o pedido sem
-- erro nenhum. Faixa de UUID neste banco: 2* e a equipe, 3* os 300 membros, 4* os
-- dependentes, 9* as admissoes. 5* e livre.
do $guarda$
begin
  if exists (select 1 from auth.users where id::text like '50000000-0000-4000-8000-%') then
    raise exception 'a faixa 50000000-... ja esta ocupada; escolher outra antes de prosseguir';
  end if;
end;
$guarda$;

-- ─ 500 usuarios ───────────────────────────────────────────────────────
-- Faixa de UUID propria (50000000-...) para NAO colidir com o seed (~300 em
-- 30000000-...) nem com as fixtures de pgTAP. Idempotente por on conflict.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  ('50000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'carga-' || i || '@bivaque.example.invalid',
  crypt('bivaque-e2e-local', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  -- A armadilha conhecida: GoTrue le estes tokens como string e NULL faz o
  -- password grant devolver 500. Vazio, nunca nulo.
  '', '', '', '', '', '', '', '',
  now() - make_interval(days => 120 - (i % 120)),
  now()
from generate_series(1, 500) as i
on conflict (id) do nothing;

-- ─ elegibilidade verificada ────────────────────────────────────────────
-- A entrada e verification_gated: sem verification_outcome o usuario nao
-- passa da porta. Distribui as tres classes para o teste cobrir as regras
-- que dependem delas.
insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
select
  ('50000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'verified',
  (array['active_federal_military', 'veteran', 'military_pensioner'])[1 + (i % 3)]::private.eligibility_class,
  now() - make_interval(days => 120 - (i % 120))
from generate_series(1, 500) as i
on conflict (user_id) do nothing;

-- ── vinculo com a cidade: 7 estados, 19 cidades ──────────────────────────
-- O padrao i % 19 distribui de forma uniforme e reproduzivel. Cada cidade
-- recebe ~26 usuarios, entao nenhuma fica com amostra irrelevante.
insert into public.locality_memberships (user_id, locality_id, joined_at, kind, access)
select
  ('50000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (array[
    -- SP: 3 cidades
    (select id from public.localities where state_code = 'SP' and city_name = 'São Paulo'),
    (select id from public.localities where state_code = 'SP' and city_name = 'Campinas'),
    (select id from public.localities where state_code = 'SP' and city_name = 'Santos'),
    -- MG: 3
    (select id from public.localities where state_code = 'MG' and city_name = 'Belo Horizonte'),
    (select id from public.localities where state_code = 'MG' and city_name = 'Uberlândia'),
    (select id from public.localities where state_code = 'MG' and city_name = 'Juiz de Fora'),
    -- BA: 3
    (select id from public.localities where state_code = 'BA' and city_name = 'Salvador'),
    (select id from public.localities where state_code = 'BA' and city_name = 'Feira de Santana'),
    (select id from public.localities where state_code = 'BA' and city_name = 'Vitória da Conquista'),
    -- RS: 3
    (select id from public.localities where state_code = 'RS' and city_name = 'Porto Alegre'),
    (select id from public.localities where state_code = 'RS' and city_name = 'Caxias do Sul'),
    (select id from public.localities where state_code = 'RS' and city_name = 'Pelotas'),
    -- PE: 3
    (select id from public.localities where state_code = 'PE' and city_name = 'Recife'),
    (select id from public.localities where state_code = 'PE' and city_name = 'Olinda'),
    (select id from public.localities where state_code = 'PE' and city_name = 'Caruaru'),
    -- AM: 3
    (select id from public.localities where state_code = 'AM' and city_name = 'Manaus'),
    (select id from public.localities where state_code = 'AM' and city_name = 'Parintins'),
    (select id from public.localities where state_code = 'AM' and city_name = 'Itacoatiara'),
    -- DF: 1 (unidade federativa de cidade unica)
    (select id from public.localities where state_code = 'DF' and city_name = 'Brasília')
  ])[1 + (i % 19)],
  now() - make_interval(days => 120 - (i % 120)),
  'current',
  'active'
from generate_series(1, 500) as i
on conflict (user_id, locality_id) do nothing;

-- ─ perfis ──────────────────────────────────────────────────────────────
-- Nomes variados o bastante para a busca e as listas nao ficarem repetitivas.
insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
select
  ('50000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (array[
    'Ana','Bruno','Carla','Diego','Elaine','Fábio','Gabriela','Heitor','Isabela',
    'João','Karina','Lucas','Mariana','Nelson','Olívia','Paulo','Queila','Rafael',
    'Sofia','Tiago','Ursula','Vitor','Wagner','Xênia','Yara','Zélia'
  ])[1 + (i % 26)]
  || ' '
  || (array[
    'Almeida','Barbosa','Cavalcante','Duarte','Esteves','Ferreira','Gomes',
    'Henriques','Ibrahim','Ju de Souza','Klein','Lima','Monteiro','Nogueira',
    'Oliveira','Pereira','Queiroz','Ribeiro','Santos','Teixeira'
  ])[1 + ((i / 26) % 20)]
  || ' ' || i,
  'locality_members',
  1,
  now() - make_interval(days => 120 - (i % 120))
from generate_series(1, 500) as i
on conflict (user_id) do nothing;

-- ── conferencia ─────────────────────────────────────────────────────────
do $$
declare
  v_usuarios int;
  v_estados int;
  v_cidades int;
begin
  select count(distinct u.id), count(distinct l.state_code), count(distinct l.id)
    into v_usuarios, v_estados, v_cidades
    from auth.users u
    join public.locality_memberships lm on lm.user_id = u.id
    join public.localities l on l.id = lm.locality_id
   where u.email like 'carga-%@bivaque.example.invalid';
  raise notice 'carga: % usuarios, % estados, % cidades', v_usuarios, v_estados, v_cidades;
  if v_usuarios < 500 or v_estados < 7 then
    raise exception 'populacao incompleta: % usuarios em % estados', v_usuarios, v_estados;
  end if;
end;
$$;