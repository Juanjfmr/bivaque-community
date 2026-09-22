-- CARGA GRANDE — 200 usuarios por cidade, 19 cidades em 7 estados.
--
-- Substitui a versao de 500 (~26/cidade): o responsavel pediu pelo menos 200 por
-- cidade, ou seja 3971 usuarios. Gera 209 por cidade (11 x 19) para haver folga
-- sobre o piso de 200 e a distribuicao continuar uniforme.
--
-- Faixa 60000000-... (livre). Faixas ocupadas: 2* equipe, 3* membros do seed,
-- 4* dependentes, 5* carga anterior, 9* admissoes.

-- IDEMPOTENTE: o script pode ser reexecutado. A guarda de faixa virou conferencia
-- de COLISAO COM OUTRO CONJUNTO (nao com ele mesmo): falha so se houver usuario
-- na faixa que NAO seja da carga, porque ai o on conflict do nothing descartaria
-- linhas em silencio e a carga sairia menor do que o pedido sem erro nenhum.
do $guarda$
begin
  if exists (
    select 1 from auth.users
     where id::text like '60000000-0000-4000-8000-%'
       and email not like 'carga-%'
  ) then
    raise exception 'a faixa 60000000-... tem usuario que NAO e da carga; escolher outra faixa';
  end if;
end;
$guarda$;

--  as 19 cidades, numeradas de forma estavel ─────────────────────────────
create temp table carga_cidades as
select l.id, l.state_code, l.city_name,
       row_number() over (order by l.state_code, l.city_name) as n
  from public.localities l
 where l.state_code in ('SP','MG','BA','RS','PE','AM','DF')
   and l.city_name in ('São Paulo','Campinas','Santos','Belo Horizonte','Uberlândia',
     'Juiz de Fora','Salvador','Feira de Santana','Vitória da Conquista','Porto Alegre',
     'Caxias do Sul','Pelotas','Recife','Olinda','Caruaru','Manaus','Parintins',
     'Itacoatiara','Brasília')
   and l.admission_mode = 'verification_gated';

-- ─ 3971 usuarios, 209 por cidade (19 x 209) ───────────────────────────── ────────────────────────────────────────
-- i vai de 1 a 3971; a cidade e ((i-1) / 209) + 1, entao cada cidade recebe
-- um bloco CONTIGUO de 209. Bloco contiguo e de proposito: deixa trivial
-- achar uma conta de qualquer cidade (6000...0 + (n-1)*209 + k).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  ('60000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'carga-' || i || '@bivaque.example.invalid',
  crypt('bivaque-e2e-local', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  -- tokens vazios, nunca nulos (GoTrue os le como string)
  '', '', '', '', '', '', '', '',
  now() - make_interval(days => 200 - (i % 200)),
  now()
from generate_series(1, 3971) as i
on conflict (id) do nothing;

--  elegibilidade ────────────────────────────────────────────────────────
insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
select
  ('60000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'verified',
  (array['active_federal_military','veteran','military_pensioner'])[1 + (i % 3)]::private.eligibility_class,
  now() - make_interval(days => 200 - (i % 200))
from generate_series(1, 3971) as i
on conflict (user_id) do nothing;

--  vinculo com a cidade ────────────────────────────────────────────────
insert into public.locality_memberships (user_id, locality_id, joined_at, kind, access)
select
  ('60000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (select cl.id from carga_cidades cl where cl.n = ((i - 1) / 209) + 1),
  now() - make_interval(days => 200 - (i % 200)),
  'current', 'active'
from generate_series(1, 3971) as i
on conflict (user_id, locality_id) do nothing;

-- ─ perfis ─────────────────────────────────────────────────────────────
insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
select
  ('60000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (array['Ana','Bruno','Carla','Diego','Elaine','Fábio','Gabriela','Heitor','Isabela',
    'João','Karina','Lucas','Mariana','Nelson','Olívia','Paulo','Queila','Rafael',
    'Sofia','Tiago','Ursula','Vitor','Wagner','Xênia','Yara','Zélia'])[1 + (i % 26)]
  || ' ' ||
  (array['Almeida','Barbosa','Cavalcante','Duarte','Esteves','Ferreira','Gomes',
    'Henriques','Ibrahim','Ju de Souza','Klein','Lima','Monteiro','Nogueira',
    'Oliveira','Pereira','Queiroz','Ribeiro','Santos','Teixeira'])[1 + ((i / 26) % 20)]
  || ' ' || i,
  'locality_members', 1,
  now() - make_interval(days => 200 - (i % 200))
from generate_series(1, 3971) as i
on conflict (user_id) do nothing;

-- ── uma comunidade por cidade, dona pelo primeiro usuario do bloco ───────
insert into public.communities (id, name, locality_id, created_by, owner_user_id)
select
  ('71000000-0000-4000-8003-' || lpad(to_hex(cl.n), 12, '0'))::uuid,
  'Vila ' || cl.city_name, cl.id,
  ('60000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 209) + 1), 12, '0'))::uuid,
  ('60000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 209) + 1), 12, '0'))::uuid
from carga_cidades cl
on conflict (id) do nothing;

-- todos os 209 de cada cidade entram na propria comunidade como membros
insert into public.community_memberships (community_id, user_id, role, status, joined_at)
select
  ('71000000-0000-4000-8003-' || lpad(to_hex(((i - 1) / 209) + 1), 12, '0'))::uuid,
  ('60000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  -- cast explicito: o CASE devolve text e a coluna e o enum
  -- community_membership_role
  (case when (i - 1) % 209 = 0 then 'owner' else 'member' end)::public.community_membership_role,
  'approved',
  now() - make_interval(days => 150 - (i % 150))
from generate_series(1, 3971) as i
on conflict (community_id, user_id) do nothing;

-- ── 20 posts por cidade (autores diferentes) ────────────────────────────
insert into public.posts (id, locality_id, user_id, post_type, content, created_at)
select
  ('80000000-0000-4000-8003-' || lpad(to_hex(((cl.n - 1) * 20) + k), 12, '0'))::uuid,
  cl.id,
  ('60000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 209) + k), 12, '0'))::uuid,
  'text',
  (array[
    'Bom dia de ' || cl.city_name || '! Alguém indica um bom encanador aqui?',
    'Feira de rua em ' || cl.city_name || ' neste sábado, das 7h às 13h.',
    'Procuro indicação de dentista em ' || cl.city_name || '.',
    'Carona para a capital saindo de ' || cl.city_name || ' na sexta.',
    'Aula de reforço para crianças em ' || cl.city_name || '. Quem conhece?',
    'O posto de saúde de ' || cl.city_name || ' abriu mais cedo hoje.',
    'Alguém sabe de vaga de emprego em ' || cl.city_name || '?',
    'A biblioteca de ' || cl.city_name || ' está com inscrições abertas.',
    'Melhor lugar para tomar café em ' || cl.city_name || '?',
    'Chuva forte em ' || cl.city_name || ' agora à tarde.',
    'Grupo de corrida em ' || cl.city_name || ', quem se anima?',
    'Farmácia de plantão em ' || cl.city_name || ' hoje é a do centro.',
    'Achei um chaveiro ótimo em ' || cl.city_name || ', recomendo.',
    'Feira de adoção de animais em ' || cl.city_name || ' no domingo.',
    'Ônibus de ' || cl.city_name || ' para a capital mudou de horário.',
    'Curso gratuito de informática em ' || cl.city_name || '.',
    'Campanha de vacinação em ' || cl.city_name || ' esta semana.',
    'Alguém recomenda eletricista em ' || cl.city_name || '?',
    'Praça de ' || cl.city_name || ' foi reformada, ficou ótima.',
    'Aluguel de casa em ' || cl.city_name || ', alguém sabe preço?'
  ])[k],
  now() - make_interval(days => 1 + (k * 3))
from carga_cidades cl
cross join generate_series(1, 20) as k
on conflict (id) do nothing;

-- ─ eventos: 3 por cidade ───────────────────────────────────────────────
insert into public.events (id, organizer_id, locality_id, title, starts_at, created_at)
select
  ('90000000-0000-4000-8003-' || lpad(to_hex(((cl.n - 1) * 3) + k), 12, '0'))::uuid,
  ('60000000-0000-4000-8000-' || lpad(to_hex(((cl.n - 1) * 209) + 1), 12, '0'))::uuid,
  cl.id,
  (array['Encontro da comunidade de ' || cl.city_name,
    'Mutirão de limpeza em ' || cl.city_name,
    'Festa junina de ' || cl.city_name])[k],
  now() + make_interval(days => 3 + (cl.n % 20)::int),
  now() - interval '10 days'
from carga_cidades cl
cross join generate_series(1, 3) as k
on conflict (id) do nothing;

drop table carga_cidades;

-- ── conferencia: o piso de 200 por cidade e verificado, nao suposto ──────
do $conf$
declare
  v_total int; v_estados int; v_cidades int; v_minimo int;
begin
  select count(distinct u.id), count(distinct l.state_code), count(distinct l.id), min(por_cidade.qtd)
    into v_total, v_estados, v_cidades, v_minimo
    from auth.users u
    join public.locality_memberships lm on lm.user_id = u.id
    join public.localities l on l.id = lm.locality_id
    join (select locality_id, count(*) as qtd
            from public.locality_memberships
           where user_id in (select id from auth.users where id::text like '60000000-0000-4000-8000-%')
           group by locality_id) por_cidade on por_cidade.locality_id = l.id
   where u.id::text like '60000000-0000-4000-8000-%';
  raise notice 'CARGA GRANDE: % usuarios, % estados, % cidades, minimo % por cidade', v_total, v_estados, v_cidades, v_minimo;
  if v_total < 3971 or v_estados < 7 or v_cidades < 19 then
    raise exception 'carga incompleta: % usuarios / % estados / % cidades', v_total, v_estados, v_cidades;
  end if;
  if v_minimo < 200 then
    raise exception 'cidade com % usuarios, abaixo do piso de 200', v_minimo;
  end if;
end;
$conf$;