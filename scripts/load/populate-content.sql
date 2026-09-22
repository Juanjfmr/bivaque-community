-- CONTEUDO distribuido pelas cidades da carga, para o teste ser OBSERVAVEL:
-- sem isto as cidades novas aparecem vazias e a unica leitura possivel e
-- 'a lista esta vazia'. Gera posts de cidade, uma comunidade por cidade com
-- dono, eventos e grupos.

-- helper: as 19 localidades da carga, em ordem estavel
create temp table carga_localidades as
select l.id, l.state_code, l.city_name,
       row_number() over (order by l.state_code, l.city_name) as n
  from public.localities l
 where l.state_code in ('SP','MG','BA','RS','PE','AM','DF')
   and l.city_name in (
     'São Paulo','Campinas','Santos',
     'Belo Horizonte','Uberlândia','Juiz de Fora',
     'Salvador','Feira de Santana','Vitória da Conquista',
     'Porto Alegre','Caxias do Sul','Pelotas',
     'Recife','Olinda','Caruaru',
     'Manaus','Parintins','Itacoatiara',
     'Brasília')
   and l.admission_mode = 'verification_gated';

-- ── uma comunidade por cidade, dona por um dos usuarios da carga ─────────
-- O dono e um usuario da propria cidade (n*23, dentro da faixa de cada uma),
-- para a comunidade ter administracao real e nao um dono de outra regiao.
insert into public.communities (id, name, locality_id, created_by, owner_user_id)
select
  ('71000000-0000-4000-8002-' || lpad(to_hex(cl.n), 12, '0'))::uuid,
  'Vila ' || cl.city_name,
  cl.id,
  ('50000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 23) + 1), 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 23) + 1), 12, '0'))::uuid
from carga_localidades cl
on conflict (id) do nothing;

-- ── vinculo do dono com a propria comunidade ─────────────────────────────
insert into public.community_memberships (community_id, user_id, role, status, joined_at)
select
  ('71000000-0000-4000-8002-' || lpad(to_hex(cl.n), 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 23) + 1), 12, '0'))::uuid,
  'owner',
  'approved',
  now() - interval '40 days'
from carga_localidades cl
on conflict (community_id, user_id) do nothing;

-- ─ posts de cidade (alcance municipal) ──────────────────────────────────
-- Cinco por cidade, de autores diferentes, com texto que identifica a cidade
-- — e o que torna a diferenca entre cidades VISIVEL na tela.
insert into public.posts (id, locality_id, user_id, post_type, content, created_at)
select
  ('80000000-0000-4000-8001-' || lpad(to_hex(((cl.n - 1) * 5) + k), 12, '0'))::uuid,
  cl.id,
  ('50000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 23) + k), 12, '0'))::uuid,
  'text',
  (array[
    'Bom dia de ' || cl.city_name || '! Alguém indica um bom encanador aqui?',
    'Feira de rua em ' || cl.city_name || ' neste sábado, das 7h às 13h.',
    'Procuro indicação de dentista em ' || cl.city_name || '.',
    'Carona para a capital saindo de ' || cl.city_name || ' na sexta.',
    'Aula de reforço para crianças em ' || cl.city_name || '. Quem conhece?'
  ])[k],
  now() - make_interval(days => 1 + (k * 2))
from carga_localidades cl
cross join generate_series(1, 5) as k
on conflict (id) do nothing;

-- ── eventos por cidade ───────────────────────────────────────────────────
insert into public.events (id, organizer_id, locality_id, title, starts_at, created_at)
select
  ('90000000-0000-4000-8001-' || lpad(to_hex(cl.n), 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 23) + 1), 12, '0'))::uuid,
  cl.id,
  'Encontro da comunidade de ' || cl.city_name,
  -- (cl.n % 20)::int: row_number() devolve bigint e make_interval exige int.
  now() + make_interval(days => 3 + (cl.n % 20)::int),
  now() - interval '10 days'
from carga_localidades cl
on conflict (id) do nothing;

drop table carga_localidades;

-- ── conferencia ──────────────────────────────────────────────────────────
do $$
declare
  v_comunidades int; v_posts int; v_eventos int; v_cidades int;
begin
  select count(*) into v_comunidades from public.communities where name like 'Vila %';
  select count(*) into v_posts from public.posts where id::text like '80000000-0000-4000-8001-%';
  select count(*) into v_eventos from public.events where id::text like '90000000-0000-4000-8001-%';
  select count(distinct locality_id) into v_cidades from public.posts where id::text like '80000000-0000-4000-8001-%';
  raise notice 'conteudo: % comunidades, % posts em % cidades, % eventos', v_comunidades, v_posts, v_cidades, v_eventos;
  if v_cidades < 19 then
    raise exception 'conteudo cobriu % cidades, esperado 19', v_cidades;
  end if;
end;
$$;