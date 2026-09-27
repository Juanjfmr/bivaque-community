-- Aviso de pedido de indicação (migrations 20260926022408 e 20260926022416,
-- ADR-20260925-aviso-de-pedido).
--
-- Prova: quem pode ver o pedido é avisado, e só essas pessoas; quem pediu,
-- outra cidade, quem desligou o tipo e quem está bloqueado ficam de fora; o
-- pedido de grupo só avisa o grupo; o job não repete aviso; o limite de 3 por
-- dia vira UM aviso agregado; o pedido parado 24 h avisa de novo; quem pediu é
-- perguntado se alguma resposta resolveu; o resumo por e-mail só sai para quem
-- ligou; e nenhum cliente lê o registro de entregas.
--
-- O banco local pode ter o seed de desenvolvimento, com pedidos da mesma cidade.
-- Eles são envelhecidos no começo (a transação desfaz tudo), então só os
-- pedidos deste arquivo entram nas janelas do job.

begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

reset role;

update public.recommendation_requests set created_at = now() - interval '60 days';
delete from public.recommendation_replies
 where created_at > now() - interval '11 days';

-- 004 desligou os avisos de pedido.
insert into public.notification_preferences (user_id, indications)
values ('10000000-0000-4000-8000-000000000004', false)
on conflict (user_id) do update set indications = false;

-- Pedido da cidade feito por 001.
insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values ('82000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Pediatra perto da vila', '', 'saude_bem_estar');

select private.dispatch_indication_alerts();

-- 1. Quem mora na cidade é avisado.
select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'recommendation_request' and action = 'new'
      and target_id = '82000000-0000-4000-8000-000000000001'),
  1,
  'membro da cidade recebe o aviso do pedido novo'
);

-- 2-5. Quem não é avisado.
select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'recommendation_request'),
  0,
  'quem pediu não é avisado do próprio pedido'
);

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000003'
      and type = 'recommendation_request'),
  0,
  'membro de outra cidade não é avisado'
);

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000005'
      and type = 'recommendation_request'),
  0,
  'quem não é membro de cidade nenhuma não é avisado'
);

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000004'
      and type = 'recommendation_request'),
  0,
  'quem desligou os avisos de pedido não é avisado'
);

-- 6. Rodar de novo não repete.
select private.dispatch_indication_alerts();
select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and target_id = '82000000-0000-4000-8000-000000000001'),
  1,
  'o job rodando duas vezes não repete o aviso'
);

-- 7. Bloqueio: 002 bloqueou 004; o pedido de 004 não chega a 002.
insert into public.dm_blocks (blocker_user_id, blocked_user_id)
values ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004');

insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values ('82000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000001', 'Eletricista de confiança', '', 'servicos_locais');

select private.dispatch_indication_alerts();
select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and target_id = '82000000-0000-4000-8000-000000000002'),
  0,
  'quem bloqueou quem pediu não é avisado'
);

-- 8-9. Pedido de grupo: só o grupo.
insert into public.recommendation_requests (id, author_id, group_id, title, body, category)
values
  ('82000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   '40000000-0000-4000-8000-000000000002', 'Livro para clube', '', 'educacao'),
  ('82000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
   '40000000-0000-4000-8000-000000000001', 'Tênis de corrida', '', 'esporte_lazer');

select private.dispatch_indication_alerts();

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and target_id = '82000000-0000-4000-8000-000000000003'),
  0,
  'pedido de grupo não chega a quem ainda aguarda entrada no grupo'
);

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and target_id = '82000000-0000-4000-8000-000000000004'),
  1,
  'pedido de grupo chega a quem é do grupo'
);

-- 10-13. Limite: 002 já recebeu 2 avisos. O 3º sai; do 4º em diante, um aviso
-- único do dia.
insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values ('82000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Dentista infantil', '', 'saude_bem_estar');
select private.dispatch_indication_alerts();

insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values ('82000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Mudança para Recife', '', 'transporte');
select private.dispatch_indication_alerts();

insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values ('82000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001', 'Escola bilíngue', '', 'educacao');
select private.dispatch_indication_alerts();

select is(
  private.indication_alert_daily_cap(),
  3,
  'o limite é de 3 avisos de pedido por dia'
);

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'recommendation_request' and action = 'new'),
  3,
  'no dia, no máximo 3 avisos individuais'
);

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'recommendation_request' and action = 'digest'),
  1,
  'o que passa do limite vira um aviso único do dia, não um por pedido'
);

select is(
  (select count(*)::integer from public.indication_alert_deliveries
    where user_id = '10000000-0000-4000-8000-000000000002' and suppressed),
  2,
  'os pedidos acima do limite ficam registrados como suprimidos'
);

-- 14-15. Pedido parado 24 h: sem resposta avisa de novo; com resposta, não.
insert into public.recommendation_requests (id, author_id, locality_id, title, body, category, created_at)
values
  ('82000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Despachante para CNH', '', 'outros',
   now() - interval '25 hours'),
  ('82000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Chaveiro 24 horas', '', 'servicos_locais',
   now() - interval '25 hours');

insert into public.recommendation_replies (request_id, author_id, body)
values ('82000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002',
        'O Chaveiro Central atende de madrugada.');

select private.dispatch_indication_alerts();

select is(
  (select count(*)::integer from public.indication_alert_deliveries
    where request_id = '82000000-0000-4000-8000-000000000008'
      and user_id = '10000000-0000-4000-8000-000000000002' and kind = 'unanswered'),
  1,
  'pedido parado 24 h sem resposta volta a ser avisado'
);

select is(
  (select count(*)::integer from public.indication_alert_deliveries
    where request_id = '82000000-0000-4000-8000-000000000009' and kind = 'unanswered'),
  0,
  'pedido que já tem resposta não é avisado como parado'
);

-- 16-17. "Alguma resposta ajudou a resolver?"
insert into public.recommendation_requests (id, author_id, locality_id, title, body, category, created_at)
values
  ('82000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Pintor de parede', '', 'servicos_locais',
   now() - interval '5 days'),
  ('82000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Marceneiro', '', 'servicos_locais',
   now() - interval '5 days');

insert into public.recommendation_replies (request_id, author_id, body, created_at)
values
  ('82000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002',
   'O Seu Jorge pinta muito bem.', now() - interval '4 days'),
  ('82000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000002',
   'A Marcenaria Norte faz sob medida.', now() - interval '4 days');

update public.recommendation_requests set is_resolved = true
 where id = '82000000-0000-4000-8000-00000000000b';

select private.dispatch_indication_alerts();

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'recommendation_request' and action = 'resolve_prompt'
      and target_id = '82000000-0000-4000-8000-00000000000a'),
  1,
  'quem pediu é perguntado se alguma resposta resolveu'
);

select is(
  (select count(*)::integer from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
      and action = 'resolve_prompt'
      and target_id = '82000000-0000-4000-8000-00000000000b'),
  0,
  'pedido já resolvido não recebe a pergunta'
);

-- 18-20. Resumo por e-mail: só para quem ligou.
insert into public.notification_channel_preferences (user_id, notification_type, channel, enabled)
values ('10000000-0000-4000-8000-000000000001', 'indications', 'email', true);

select private.dispatch_indication_digest();

select ok(
  (select (payload ->> 'open_count')::integer >= 1
     from public.outbox
    where type = 'indications_digest'
      and payload ->> 'user_id' = '10000000-0000-4000-8000-000000000001'),
  'quem ligou o e-mail recebe o resumo com os pedidos sem resposta'
);

select is(
  (select count(*)::integer from public.outbox
    where type = 'indications_digest'
      and payload ->> 'user_id' = '10000000-0000-4000-8000-000000000002'),
  0,
  'sem ligar o e-mail, não há resumo: ele nasce desligado'
);

select is(
  private.notification_channel_allows(
    'indications_digest', 'email', '10000000-0000-4000-8000-000000000002'
  ),
  false,
  'a fila de e-mail também recusa o resumo para quem não ligou'
);

-- 21. O sino continua ligado por padrão.
select is(
  private.notification_channel_allows(
    'recommendation_request', 'in_app', '10000000-0000-4000-8000-000000000002'
  ),
  true,
  'o aviso no sino nasce ligado'
);

-- 22. Nenhum cliente lê quem foi avisado de quê.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$ select * from public.indication_alert_deliveries $$,
  '42501',
  null,
  'o registro de entregas não é legível pelo cliente'
);

select * from finish();
rollback;
