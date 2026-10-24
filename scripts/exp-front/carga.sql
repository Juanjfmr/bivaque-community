-- EXP-001: volume deterministico para a comparacao do front. Aplicar apos seed.sql,
-- somente no banco local. IDs reservados: perguntas e000...0003e9-00000bb8,
-- escape e000...00f001, contas e000...00a001-00a003, respostas e100....
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'e0000000-0000-4000-8000-00000000a001', 'authenticated', 'authenticated',
    'exp-sem-cidade@bivaque.example.invalid', crypt('bivaque-e2e-local', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e0000000-0000-4000-8000-00000000a002', 'authenticated', 'authenticated',
    'exp-outra-cidade@bivaque.example.invalid', crypt('bivaque-e2e-local', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e0000000-0000-4000-8000-00000000a003', 'authenticated', 'authenticated',
    'exp-autora@bivaque.example.invalid', crypt('bivaque-e2e-local', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', '', '', '', now(), now()
  )
on conflict (id) do nothing;

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  ('e0000000-0000-4000-8000-00000000a001', 'verified', 'active_federal_military', now()),
  ('e0000000-0000-4000-8000-00000000a002', 'verified', 'active_federal_military', now()),
  ('e0000000-0000-4000-8000-00000000a003', 'verified', 'active_federal_military', now())
on conflict (user_id) do nothing;

-- A localidade do Rio tem UUID gerado pelo seed; o código IBGE é estável.
insert into public.locality_memberships (user_id, locality_id, joined_at)
select
  'e0000000-0000-4000-8000-00000000a002', id, now()
from public.localities
where ibge_code = '3304557'
on conflict (user_id, locality_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at)
values (
  'e0000000-0000-4000-8000-00000000a003',
  '00000000-0000-4000-8000-000000000001',
  now()
)
on conflict (user_id, locality_id) do nothing;

insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
values
  ('e0000000-0000-4000-8000-00000000a002', 'Experimento outra cidade', 'locality_members', 1, now()),
  ('e0000000-0000-4000-8000-00000000a003', 'Experimento autora', 'locality_members', 1, now())
on conflict (user_id) do nothing;

-- Os autores das perguntas e respostas são membros ativos de Manaus no seed.
with seed_authors as (
  select array_agg(lm.user_id order by lm.user_id) as ids
  from public.locality_memberships lm
  where lm.locality_id = '00000000-0000-4000-8000-000000000001'
    and lm.access = 'active'
    and lm.user_id <> 'e0000000-0000-4000-8000-00000000a003'
), volume as (
  select
    n,
    ('e0000000-0000-4000-8000-' || lpad(to_hex(1000 + n), 12, '0'))::uuid as id,
    case
      when n between 1 and 5 then 'e0000000-0000-4000-8000-00000000a003'::uuid
      else seed_authors.ids[((n - 1) % cardinality(seed_authors.ids)) + 1]
    end as author_id,
    case n % 8
      when 0 then 'saude_bem_estar'
      when 1 then 'educacao'
      when 2 then 'servicos_locais'
      when 3 then 'esporte_lazer'
      when 4 then 'alimentacao'
      when 5 then 'transporte'
      when 6 then 'moradia'
      else 'outros'
    end::public.recommendation_category as category,
    case n % 8
      when 0 then (array['pediatra para criança pequena','dentista que atenda famílias','clínica de fisioterapia','oftalmologista para rotina','atendimento de saúde da família'])[n % 5 + 1]
      when 1 then (array['escola que acolha alunos transferidos','reforço de matemática para o ensino médio','creche com período integral','curso de idiomas para adolescentes','escola com boa adaptação no meio do ano'])[n % 5 + 1]
      when 2 then (array['eletricista para pequenos reparos','costureira para ajustes simples','marceneiro para consertos domésticos','assistência para eletrodomésticos','chaveiro para uma fechadura antiga'])[n % 5 + 1]
      when 3 then (array['aula de natação para iniciantes','atividade esportiva para crianças','grupo de corrida para iniciantes','aula de dança para adultos','espaço de lazer para ir em família'])[n % 5 + 1]
      when 4 then (array['restaurante tranquilo para ir com crianças','padaria com opções para o café da manhã','comida regional para receber visitas','lugar com almoço em família no domingo','opção de lanche perto do Centro'])[n % 5 + 1]
      when 5 then (array['transporte para mudança entre bairros','serviço de frete para poucos móveis','rota de ônibus para chegar ao hospital','transporte escolar na região','apoio para mudança de outra cidade'])[n % 5 + 1]
      when 6 then (array['apartamento familiar perto de escola','casa com acesso fácil ao transporte','moradia para família recém-chegada','bairro tranquilo para morar com crianças','imóvel próximo aos serviços do dia a dia'])[n % 5 + 1]
      else (array['atividade para fazer em família','serviço público de orientação ao cidadão','local para aprender artesanato','espaço comunitário para reuniões','dica útil para quem acabou de chegar'])[n % 5 + 1]
    end as assunto,
    (array['Centro','Adrianópolis','Dom Pedro','Parque Dez','Vila Militar','Aleixo','Flores','Cachoeirinha','Ponta Negra','Nossa Senhora das Graças'])[n % 10 + 1] as bairro,
    (array[
      'Estamos organizando a rotina da família depois de uma mudança recente e queremos conhecer experiências de quem já passou por isso.',
      'Minha família chegou há pouco tempo e estamos procurando uma opção acolhedora para começar com tranquilidade.',
      'Estamos nos planejando para os próximos meses e seria bom ouvir recomendações de moradores da região.',
      'Ainda estamos conhecendo os bairros e queremos escolher uma alternativa que funcione bem no dia a dia.',
      'Uma pessoa da família precisa dessa orientação em breve; qualquer experiência local já ajuda bastante.',
      'Estamos ajustando a rotina por aqui e buscamos uma indicação prática de quem conhece a cidade.',
      'Vamos receber parentes em breve e queremos nos organizar com uma referência confiável da comunidade.',
      'Estamos comparando possibilidades com calma e gostaríamos de ouvir relatos recentes de outras famílias.'
    ])[n % 8 + 1] as contexto,
    now() - ((n * 37) % 120) * interval '1 day' - (n % 24) * interval '1 hour' as created_at
  from generate_series(1, 2000) as g(n)
  cross join seed_authors
)
insert into public.recommendation_requests
  (id, author_id, locality_id, title, body, category, created_at)
select
  id,
  author_id,
  '00000000-0000-4000-8000-000000000001',
  -- O número no fim deixa cada título único: os testes acham a pergunta pelo nome
  -- acessível, e títulos repetidos faziam o seletor achar dois botões (EXP-001).
  case n % 3
    when 0 then 'Alguém recomenda ' || assunto || ' na região de ' || bairro || '?'
    when 1 then 'Que experiência vocês tiveram com ' || assunto || ' perto de ' || bairro || '?'
    else 'Conhecem uma boa opção de ' || assunto || ' em ' || bairro || '?'
  end || ' (nº ' || n || ')',
  contexto || ' A região que estamos considerando é ' || bairro || '.',
  category,
  created_at
from volume
on conflict (id) do nothing;

-- Cinco perguntas da autora de teste; as duas primeiras ficam resolvidas.
insert into public.recommendation_requests
  (id, author_id, locality_id, title, body, category, created_at)
values (
  'e0000000-0000-4000-8000-00000000f001',
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Pergunta de escape <img src=x onerror="window.__xss=1">"''',
  '<script>window.__xss=1</script> texto',
  'outros',
  now() - interval '3 days'
)
on conflict (id) do nothing;

-- De zero a seis respostas por item, sem respostas fora de ordem.
with seed_authors as (
  select array_agg(lm.user_id order by lm.user_id) as ids
  from public.locality_memberships lm
  where lm.locality_id = '00000000-0000-4000-8000-000000000001'
    and lm.access = 'active'
    and lm.user_id <> 'e0000000-0000-4000-8000-00000000a003'
), volume as (
  select n,
    case when n <= 603 and n not between 3 and 5 then 1 + n % 6 else n % 7 end as reply_count
  from generate_series(1, 2000) as g(n)
), replies as (
  select
    v.n,
    r.reply_no,
    ('e1000000-0000-4000-8000-' || lpad(to_hex(v.n * 8 + r.reply_no), 12, '0'))::uuid as id,
    ('e0000000-0000-4000-8000-' || lpad(to_hex(1000 + v.n), 12, '0'))::uuid as request_id,
    seed_authors.ids[((v.n + r.reply_no - 1) % cardinality(seed_authors.ids)) + 1] as author_id,
    (array[
      'A família que conheço teve uma experiência boa e o atendimento foi atencioso.',
      'Uma opção bem avaliada por aqui fica nessa região; vale confirmar os horários antes.',
      'Já ouvi recomendações positivas de moradores do bairro e a localização é prática.',
      'Para nós funcionou bem. A equipe explicou cada etapa com bastante paciência.',
      'Conheço pessoas que usam esse serviço e costumam falar bem da organização.',
      'Também estamos aprendendo sobre a cidade; essa alternativa foi útil para nossa família.'
    ])[((v.n + r.reply_no) % 6) + 1] as body,
    greatest(
      now() - interval '120 days',
      least(
        now(),
        now() - ((v.n * 37) % 120) * interval '1 day'
          - (v.n % 24) * interval '1 hour'
          + r.reply_no * interval '2 hours'
      )
    ) as created_at
  from volume v
  cross join lateral generate_series(1, v.reply_count) as r(reply_no)
  cross join seed_authors
)
insert into public.recommendation_replies (id, request_id, author_id, body, created_at)
select id, request_id, author_id, body, created_at
from replies
on conflict (id) do nothing;

-- A resposta escolhida existe antes da atualização, como exige o trigger de integridade.
with volume as (
  select n
  from generate_series(1, 2000) as g(n)
  where n <= 603 and n not between 3 and 5
), resolved as (
  select
    ('e0000000-0000-4000-8000-' || lpad(to_hex(1000 + n), 12, '0'))::uuid as id,
    ('e1000000-0000-4000-8000-' || lpad(to_hex(n * 8 + 1), 12, '0'))::uuid as reply_id
  from volume
)
update public.recommendation_requests request
set is_resolved = true,
    resolved_at = request.created_at,
    resolved_by = request.author_id,
    resolved_reply_id = resolved.reply_id,
    last_resolved_reply_id = resolved.reply_id
from resolved
where request.id = resolved.id
  and (
    not request.is_resolved
    or request.resolved_at is distinct from request.created_at
    or request.resolved_by is distinct from request.author_id
    or request.resolved_reply_id is distinct from resolved.reply_id
    or request.last_resolved_reply_id is distinct from resolved.reply_id
  );

-- Relatório final: 2.000 de volume + escape, totais e situação das contas.
select
  (select count(*) from public.recommendation_requests
   where id between 'e0000000-0000-4000-8000-000000000001'::uuid
                 and 'e0000000-0000-4000-8000-000000000fff'::uuid) as perguntas_carga,
  (select count(*) from public.recommendation_requests
   where id = 'e0000000-0000-4000-8000-00000000f001') as pergunta_escape,
  (select count(*) from public.recommendation_replies
   where request_id between 'e0000000-0000-4000-8000-000000000001'::uuid
                        and 'e0000000-0000-4000-8000-000000000fff'::uuid) as respostas,
  (select count(*) from public.recommendation_requests
   where id between 'e0000000-0000-4000-8000-000000000001'::uuid
                 and 'e0000000-0000-4000-8000-000000000fff'::uuid
     and is_resolved) as resolvidas,
  (select jsonb_agg(jsonb_build_object(
      'email', u.email,
      'verificada', v.status = 'verified',
      'cidade', l.city_name
    ) order by u.email)
   from auth.users u
   join private.verification_outcomes v on v.user_id = u.id
   left join public.locality_memberships lm on lm.user_id = u.id and lm.access = 'active'
   left join public.localities l on l.id = lm.locality_id
   where u.id in (
     'e0000000-0000-4000-8000-00000000a001',
     'e0000000-0000-4000-8000-00000000a002',
     'e0000000-0000-4000-8000-00000000a003'
   )) as contas_teste;

commit;
