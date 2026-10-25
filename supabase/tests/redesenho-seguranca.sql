-- RED-003 — negativos da primeira revisão de segurança (R3-revisao-seguranca-1).
--
-- Um negativo executável por achado HIGH, com papel real e estado persistido.
-- Nada de teste tautológico: cada caso tenta a escrita/leitura proibida e
-- confere o resultado ou o estado gravado.

begin;

create extension if not exists pgtap with schema extensions;
select plan(27);

\ir fixtures/foundation.inc
\ir fixtures/redesenho.inc

-- ── Evento de grupo para exercitar escopo, RSVP e Encerrado ────────────────
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into public.events (id, locality_id, group_id, organizer_id, title, starts_at)
     values ('92000000-0000-4000-8000-000000000001',
             '00000000-0000-4000-8000-000000000001',
             '81000000-0000-4000-8000-000000000002',
             '10000000-0000-4000-8000-000000000001',
             'Encontro do grupo fechado',
             now() + interval '3 days') $$,
  'evento+: o membro cria evento de grupo ativo');

-- Achado 3 — o organizador não transforma evento de grupo em evento da cidade.
select throws_ok(
  $$ update public.events set group_id = null
     where id = '92000000-0000-4000-8000-000000000001' $$,
  42501, null, 'evento-: o organizador não tira o grupo do evento');

select throws_ok(
  $$ update public.events set locality_id = '00000000-0000-4000-8000-000000000002'
     where id = '92000000-0000-4000-8000-000000000001' $$,
  42501, null, 'evento-: o organizador não troca a cidade do evento');

select throws_ok(
  $$ update public.events set status = 'cancelled'
     where id = '92000000-0000-4000-8000-000000000001' $$,
  42501, null, 'evento-: o estado do evento não muda por UPDATE direto');

-- Achado 2 — não participante não escreve em grupo Aberto (só lê).
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ insert into public.posts (locality_id, user_id, group_id, post_type, content)
     values ('00000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000004',
             '81000000-0000-4000-8000-000000000001', 'text', 'Escrevendo de fora') $$,
  42501, null, 'publicacoes-: a cidade não publica no grupo Aberto sem participar');

select throws_ok(
  $$ insert into public.comments (post_id, user_id, content)
     values ('91000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000004', 'Comentando de fora') $$,
  42501, null, 'publicacoes-: a cidade não comenta no grupo Aberto sem participar');

select throws_ok(
  $$ insert into public.post_reactions (post_id, user_id)
     values ('91000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000004') $$,
  42501, null, 'publicacoes-: a cidade não reage no grupo Aberto sem participar');

-- Achado 4 — comentário e publicação não trocam de alvo/escopo/tipo.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into public.comments (id, post_id, user_id, content)
     values ('93000000-0000-4000-8000-000000000001',
             '91000000-0000-4000-8000-000000000002',
             '10000000-0000-4000-8000-000000000001', 'Comentário no Fechado') $$,
  'publicacoes+: o membro comenta no grupo Fechado');

select throws_ok(
  $$ update public.comments set post_id = '91000000-0000-4000-8000-000000000001'
     where id = '93000000-0000-4000-8000-000000000001' $$,
  42501, null, 'publicacoes-: o comentário não é transplantado para outro post');

select throws_ok(
  $$ update public.posts set post_type = 'photo', photo_path = 'x/y.jpg'
     where id = '91000000-0000-4000-8000-000000000002' $$,
  42501, null, 'publicacoes-: o tipo da publicação é imutável');

select throws_ok(
  $$ update public.posts set locality_id = '00000000-0000-4000-8000-000000000002'
     where id = '91000000-0000-4000-8000-000000000002' $$,
  42501, null, 'publicacoes-: o escopo de cidade da publicação é imutável');

-- Achado 5 — a identidade de quem reagiu não é exposta.
select throws_ok(
  $$ select user_id from public.post_reactions limit 1 $$,
  42501, null, 'reacoes-: a coluna user_id de post_reactions não é legível');

select lives_ok(
  $$ select count(*) from public.post_reactions $$,
  'reacoes+: a contagem de reações continua disponível');

-- Achado 7 — quem perde o vínculo sai das confirmações do grupo.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into public.event_rsvps (event_id, user_id, occurrence_date, status)
     values ('92000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000002',
             (select starts_at::date from public.events
               where id = '92000000-0000-4000-8000-000000000001'), 'going') $$,
  'evento+: o membro confirma presença no evento do grupo');

select lives_ok(
  $$ select public.leave_group('81000000-0000-4000-8000-000000000002') $$,
  'grupos+: o moderador sai do grupo');

reset role;
select is(
  (select count(*)::int from public.event_rsvps
    where event_id = '92000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'),
  0, 'grupos-: sair do grupo remove a própria confirmação de evento');

-- Achado 8 — grupo Encerrado recusa mutação e interação.
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.archive_group('81000000-0000-4000-8000-000000000002') $$,
  'grupos+: o dono encerra o grupo com evento dentro');

select throws_ok(
  $$ select public.approve_group_member(
       '81000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000004') $$,
  42501, null, 'grupos-: não se aprova pedido em grupo Encerrado');

select throws_ok(
  $$ select public.add_group_moderator(
       '81000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: não se promove moderador em grupo Encerrado');

select throws_ok(
  $$ select public.transfer_group_ownership(
       '81000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: não se transfere grupo Encerrado');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ insert into public.event_rsvps (event_id, user_id, occurrence_date, status)
     values ('92000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001',
             (select starts_at::date from public.events
               where id = '92000000-0000-4000-8000-000000000001'), 'going') $$,
  42501, null, 'evento-: grupo Encerrado não aceita confirmação nova');

-- Achado 1 — conta suspensa/em exclusão não administra nem cria.
reset role;
insert into public.profile_suspensions (user_id) values ('10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ select public.remove_group_member(
       '81000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: conta suspensa não remove membro');

reset role;
insert into public.account_deletion_requests (user_id, due_at)
values ('10000000-0000-4000-8000-000000000004', now() + interval '30 days');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ select public.create_group('Grupo em Exclusão', 'open',
       '00000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: conta em exclusão não cria grupo');

-- Achado 6 — todos os consumidores de leitura consultam o bloqueio.
reset role;
create or replace function private.block_allows(p_actor uuid, p_author uuid, p_action text)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select false;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is_empty(
  $$ select id from public.profile_posts_for(
       '10000000-0000-4000-8000-000000000001'::uuid,
       '10000000-0000-4000-8000-000000000001'::uuid) $$,
  'bloqueio-: o perfil deixa de listar quando o bloqueio nega');

select is_empty(
  $$ select id from public.list_indications('00000000-0000-4000-8000-000000000001') $$,
  'bloqueio-: a lista de indicações filtra pelo bloqueio');

select is_empty(
  $$ select event_id from public.event_rsvps
     where event_id = '92000000-0000-4000-8000-000000000001' $$,
  'bloqueio-: a lista de confirmações filtra pelo bloqueio');

select is_empty(
  $$ select id from public.comments where id = '93000000-0000-4000-8000-000000000001' $$,
  'bloqueio-: a leitura de comentários filtra pelo bloqueio');

select * from finish();
rollback;