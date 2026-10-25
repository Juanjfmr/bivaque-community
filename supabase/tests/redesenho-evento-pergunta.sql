-- RED-003 — matriz de evento e pergunta (R2-matriz-evento-pergunta §2–§4).
-- Evento de cidade permanece; evento de grupo herda o acesso do grupo;
-- pergunta de origem dupla exige membro ativo de grupo Aberto e mesma cidade.

begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

\ir fixtures/foundation.inc
\ir fixtures/redesenho.inc

-- ── Eventos ────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into public.events (id, locality_id, organizer_id, title, starts_at)
     values ('92000000-0000-4000-8000-000000000010',
             '00000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001',
             'Evento da cidade', now() + interval '5 days') $$,
  'evento+: a cidade mantém evento fora de grupo');

select lives_ok(
  $$ insert into public.events (id, locality_id, group_id, organizer_id, title, starts_at)
     values ('92000000-0000-4000-8000-000000000011',
             '00000000-0000-4000-8000-000000000001',
             '81000000-0000-4000-8000-000000000002',
             '10000000-0000-4000-8000-000000000001',
             'Evento do grupo fechado', now() + interval '6 days') $$,
  'evento+: o membro cria evento de grupo Fechado');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.events where id = '92000000-0000-4000-8000-000000000010'),
  1, 'evento+: membro da cidade lê evento da cidade');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*)::int from public.events where id = '92000000-0000-4000-8000-000000000010'),
  0, 'evento-: outra cidade não lê evento da cidade alheia');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::int from public.events where id = '92000000-0000-4000-8000-000000000011'),
  1, 'evento+: membro do grupo lê o evento do grupo');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::int from public.events where id = '92000000-0000-4000-8000-000000000011'),
  0, 'evento-: quem não é do grupo não lê o evento do Fechado');

-- ── Confirmações ───────────────────────────────────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into public.event_rsvps (event_id, user_id, occurrence_date, status)
     values ('92000000-0000-4000-8000-000000000010',
             '10000000-0000-4000-8000-000000000001',
             '2026-11-01', 'going') $$,
  'evento+: o organizador confirma presença (E3)');

reset role;
select is(
  (select count(*)::int from public.event_rsvps
    where event_id = '92000000-0000-4000-8000-000000000010'
      and user_id = '10000000-0000-4000-8000-000000000001'),
  1, 'evento: o organizador conta uma única vez');

select is(
  (select count(*)::int from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'event_rsvp'),
  0, 'evento-: o organizador não se notifica (E3)');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into public.event_rsvps (event_id, user_id, occurrence_date, status)
     values ('92000000-0000-4000-8000-000000000011',
             '10000000-0000-4000-8000-000000000002',
             (select starts_at::date from public.events
               where id = '92000000-0000-4000-8000-000000000011'), 'going') $$,
  'evento+: o membro confirma presença');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ insert into public.event_rsvps (event_id, user_id, occurrence_date, status)
     values ('92000000-0000-4000-8000-000000000011',
             '10000000-0000-4000-8000-000000000004',
             (select starts_at::date from public.events
               where id = '92000000-0000-4000-8000-000000000011'), 'going') $$,
  42501, null, 'evento-: quem não é do grupo não confirma presença');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select isnt_empty(
  $$ select user_id from public.event_rsvps
     where event_id = '92000000-0000-4000-8000-000000000011' $$,
  'evento+: quem lê o evento lê a lista de confirmações');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is_empty(
  $$ select user_id from public.event_rsvps
     where event_id = '92000000-0000-4000-8000-000000000011' $$,
  'evento-: quem não lê o evento não lê a lista de confirmações');

-- ── Perguntas: origem dupla, cidade e grupo ────────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into public.recommendation_requests
       (id, author_id, locality_id, group_id, title, body)
     values ('95000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000002',
             '00000000-0000-4000-8000-000000000001',
             '81000000-0000-4000-8000-000000000001',
             'Indicação na cidade e no grupo', 'Onde encontro isso?') $$,
  'pergunta+: membro ativo de grupo Aberto pergunta à cidade também');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ insert into public.recommendation_requests
       (id, author_id, locality_id, group_id, title, body)
     values ('95000000-0000-4000-8000-000000000002',
             '10000000-0000-4000-8000-000000000004',
             '00000000-0000-4000-8000-000000000001',
             '81000000-0000-4000-8000-000000000001',
             'Indicação indevida', 'Não sou do grupo') $$,
  42501, null, 'pergunta-: não membro não usa origem dupla');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ insert into public.recommendation_requests
       (id, author_id, locality_id, group_id, title, body)
     values ('95000000-0000-4000-8000-000000000003',
             '10000000-0000-4000-8000-000000000002',
             '00000000-0000-4000-8000-000000000001',
             '81000000-0000-4000-8000-000000000002',
             'Indicação em Fechado', 'Grupo não é Aberto') $$,
  42501, null, 'pergunta-: origem dupla exige grupo Aberto');

select throws_ok(
  $$ insert into public.recommendation_requests
       (id, author_id, locality_id, group_id, title, body)
     values ('95000000-0000-4000-8000-000000000004',
             '10000000-0000-4000-8000-000000000002',
             '00000000-0000-4000-8000-000000000002',
             '81000000-0000-4000-8000-000000000001',
             'Indicação de outra cidade', 'Cidade diverge do grupo') $$,
  42501, null, 'pergunta-: origem dupla exige a cidade do grupo');

select throws_ok(
  $$ insert into public.recommendation_requests
       (id, author_id, title, body)
     values ('95000000-0000-4000-8000-000000000005',
             '10000000-0000-4000-8000-000000000002',
             'Sem origem', 'Nem cidade nem grupo') $$,
  23514, null, 'pergunta-: pergunta sem nenhuma origem é recusada');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into public.recommendation_requests
       (id, author_id, locality_id, title, body)
     values ('95000000-0000-4000-8000-000000000006',
             '10000000-0000-4000-8000-000000000001',
             '00000000-0000-4000-8000-000000000001',
             'Pergunta só da cidade', 'Como funciona aqui?') $$,
  'pergunta+: membro da cidade pergunta só à cidade');

-- ── Encerrar o grupo e a projeção na cidade (E1) ───────────────────────────
select lives_ok(
  $$ insert into public.events (id, locality_id, group_id, organizer_id, title, starts_at)
     values ('92000000-0000-4000-8000-000000000012',
             '00000000-0000-4000-8000-000000000001',
             '81000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001',
             'Evento que fica no Encerrado', now() + interval '7 days') $$,
  'evento+: mais um evento de grupo antes de encerrar');

select lives_ok(
  $$ select public.archive_group('81000000-0000-4000-8000-000000000001') $$,
  'grupos+: o dono encerra o grupo Aberto');

select throws_ok(
  $$ select public.complete_event('92000000-0000-4000-8000-000000000012') $$,
  42501, null, 'evento-: não se conclui evento de grupo Encerrado');

select isnt_empty(
  $$ select id from public.list_indications('00000000-0000-4000-8000-000000000001')
     where id = '95000000-0000-4000-8000-000000000001' $$,
  'pergunta+: a projeção na cidade permanece depois de o grupo encerrar');

-- ── Conclusão de evento da cidade ──────────────────────────────────────────
select lives_ok(
  $$ select public.complete_event('92000000-0000-4000-8000-000000000010') $$,
  'evento+: o organizador conclui o próprio evento da cidade');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.complete_event('92000000-0000-4000-8000-000000000011') $$,
  42501, null, 'evento-: outra pessoa não conclui o evento alheio');

select throws_ok(
  $$ select public.complete_event(
       '92000000-0000-4000-8000-000000000011',
       '10000000-0000-4000-8000-000000000001') $$,
  42501, null, 'evento-: o chamador não pode se passar por outro');

select * from finish();
rollback;