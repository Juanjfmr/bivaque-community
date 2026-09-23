-- RECON-052 — o convite de evento gera notificacao in-app para o convidado.
--
-- Cobre: a notificacao nasce para o convidado e so para ele; o convite para quem
-- desligou eventos E criado mas nao notifica; o organizador nunca e notificado do
-- proprio convite (nem ao convidar a si mesmo); a RLS deixa o convidado ler a
-- propria linha e nao deixa outro membro le-la. O canal in-app e decidido pelo
-- helper unico `private.notification_channel_allows`, exercitado pelo gatilho.
--
-- As assercoes 3 e 4 sao a guarda de regressao da `create or replace` de
-- `private.notification_type_key`: o mapa existente tem de sobreviver intacto
-- quando so se acrescenta `event_invite`.

begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

\ir fixtures/foundation.inc

reset role;

-- evento da fixture: member-one organiza; member-two e member-four sao membros
-- da mesma localidade e podem receber convite.
insert into public.events (id, locality_id, organizer_id, title, starts_at)
values (
  '81000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Encontro com convite',
  now() + interval '7 days'
);

-- member-two desligou as notificacoes de evento antes de ser convidado.
insert into public.notification_preferences (user_id, events)
values ('10000000-0000-4000-8000-000000000002', false);

-- 1) o valor existe no enum.
select is(
  (
    select count(*)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'notification_type'
      and e.enumlabel = 'event_invite'
  ),
  1::bigint,
  'event_invite e um valor de notification_type'
);

-- 2) o mapa do banco tem a mesma decisao do outbox: convite de evento = eventos.
select is(
  private.notification_type_key('event_invite'),
  'events',
  'event_invite mapeia para a preferencia de eventos (mesma decisao do outbox)'
);

-- 3) e 4) o replace nao pode ter perdido os mapeamentos que ja existiam.
select is(
  private.notification_type_key('event_change'),
  'events',
  'event_change continua mapeando para eventos depois do replace'
);

select is(
  private.notification_type_key('comment'),
  'comments',
  'comment continua mapeando para respostas depois do replace'
);

-- 5) o organizador (member-one) convida member-four, sem preferencia gravada
--    (padrao: recebe). O insert passa pela RLS do organizador.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '81000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000004'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'o organizador convida um membro elegivel da localidade'
);

-- A leitura por outro destinatario exige sair do papel autenticado: a RLS de
-- notifications mostra so a linha do proprio auth.uid(). As contagens globais
-- rodam como o papel da fixture (superusuario).
reset role;

-- 6) nasce exatamente uma notificacao para o convidado, apontando para o evento.
select is(
  (
    select type || '|' || action || '|' || target_type || '|' || target_id::text
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000004'
  ),
  'event_invite|invited|event|81000000-0000-4000-8000-000000000001',
  'a notificacao do convidado e do tipo event_invite e aponta para o evento'
);

-- 7) o organizador nao recebe notificacao do proprio convite.
select is(
  (
    select count(*)
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'nenhuma notificacao para o organizador — so o convidado e notificado'
);

-- 8) convidar member-two, que desligou eventos. O convite e criado; a notificacao nao.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '81000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'o convite e criado mesmo para quem desligou eventos'
);

-- 9) convite do organizador para si mesmo: permitido pela policy, mas o gatilho
--    nao notifica o proprio ator.
select lives_ok(
  $$
    insert into public.event_invites (event_id, invitee_user_id, invited_by)
    values (
      '81000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'o organizador pode criar um convite para si (a policy permite)'
);

reset role;

-- 10) quem desligou eventos nao recebe a notificacao.
select is(
  (
    select count(*)
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'quem desligou notificacoes de evento nao recebe o convite in-app'
);

-- 11) mesmo com o convite para si, o organizador continua sem notificacao.
select is(
  (
    select count(*)
    from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'o organizador nunca e notificado do proprio convite (nem ao convidar a si)'
);

-- 12) o convidado le a propria notificacao pela RLS.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select isnt_empty(
  $$
    select 1 from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'o convidado le a propria notificacao de convite'
);

-- 13) outro membro nao le a notificacao do convidado.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$
    select 1 from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'outro membro nao le a notificacao do convidado'
);

select * from finish();
rollback;