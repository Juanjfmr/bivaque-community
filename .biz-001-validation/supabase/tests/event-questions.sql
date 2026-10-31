-- RECON-029 — pergunta ao organizador (R34).
--
-- Positivo: membro abre a conversa de pergunta vinculada ao evento, o destinatário
-- é o organizador derivado do evento, reabrir devolve a MESMA conversa, os dois
-- lados trocam mensagem e recebem notificação.
-- Negativo: organizador não pergunta no próprio evento, terceiro não lê nem
-- escreve na conversa, quem não acessa o evento não abre, e a preferência de
-- mensagens desligada suprime o aviso.
--
-- Fixtures são sintéticas (example.invalid) e transacionais; nada de seed real.

begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

\ir fixtures/foundation.inc
\ir fixtures/trust.inc
\ir fixtures/authz.inc
\ir fixtures/dm.inc
\ir fixtures/events.inc

-- Evento de grupo privado que o membro 008 NÃO acessa (organizador = 010).
reset role;
insert into public.groups (id, name, visibility, locality_id, created_by, owner_user_id)
values (
  '40000000-0000-4000-8000-000000000077',
  'Grupo Fechado da Pergunta',
  'private',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000010'
);
insert into public.events (id, organizer_id, locality_id, group_id, title, starts_at)
values (
  '30000000-0000-4000-8000-000000000077',
  '10000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000077',
  'Evento Fechado',
  '2026-09-20 10:00:00+00'
);

-- ── positivo: 008 abre a pergunta no evento local (organizador = 001) ────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.open_event_question('30000000-0000-4000-8000-000000000001') $$,
  'membro acessível abre a conversa de pergunta ao organizador'
);

reset role;
select c.id as q_conv_id
from public.dm_conversations c
where c.participant_a = '10000000-0000-4000-8000-000000000001'
  and c.participant_b = '10000000-0000-4000-8000-000000000008'
\gset

select results_eq(
  format($$ select context_type::text from public.dm_conversations where id = %L $$, :'q_conv_id'),
  array['event_question'],
  'a conversa nasce com o contexto event_question'
);

select results_eq(
  format($$ select context_id from public.dm_conversations where id = %L $$, :'q_conv_id'),
  array['30000000-0000-4000-8000-000000000001'::uuid],
  'o contexto é o próprio evento — destinatário derivado do evento'
);

-- Reabrir devolve a mesma conversa, nunca uma segunda.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.open_event_question('30000000-0000-4000-8000-000000000001'),
  :'q_conv_id'::uuid,
  'reabrir a mesma pergunta devolve a MESMA conversa'
);

reset role;
select results_eq(
  $$
    select count(*)
      from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000008'
  $$,
  array[1::bigint],
  'existe exatamente uma conversa para o par'
);

-- ── positivo: envio e notificação ao organizador ─────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  format(
    $$ insert into public.dm_messages (conversation_id, sender_id, content)
       values (%L, '10000000-0000-4000-8000-000000000008', 'Posso levar as criancas?') $$,
    :'q_conv_id'
  ),
  'autor da pergunta envia a mensagem na conversa'
);

reset role;
select results_eq(
  format(
    $$ select count(*) from public.notifications
        where recipient_user_id = '10000000-0000-4000-8000-000000000001'
          and actor_user_id = '10000000-0000-4000-8000-000000000008'
          and type = 'direct_message'
          and target_id = %L $$,
    :'q_conv_id'
  ),
  array[1::bigint],
  'o organizador recebe notificação da pergunta'
);

-- Organizador responde — e notifica o autor.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  format(
    $$ insert into public.dm_messages (conversation_id, sender_id, content)
       values (%L, '10000000-0000-4000-8000-000000000001', 'Pode trazer as criancas.') $$,
    :'q_conv_id'
  ),
  'organizador responde na conversa de pergunta'
);

-- O organizador lê a conversa da qual participa.
select results_eq(
  format($$ select count(*) from public.dm_conversations where id = %L $$, :'q_conv_id'),
  array[1::bigint],
  'o organizador lê a conversa da qual participa'
);

reset role;
select results_eq(
  format(
    $$ select count(*) from public.notifications
        where recipient_user_id = '10000000-0000-4000-8000-000000000008'
          and actor_user_id = '10000000-0000-4000-8000-000000000001'
          and type = 'direct_message'
          and target_id = %L $$,
    :'q_conv_id'
  ),
  array[1::bigint],
  'o autor da pergunta recebe notificação da resposta'
);

-- ── negativo: organizador não pergunta no próprio evento ─────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.open_event_question('30000000-0000-4000-8000-000000000001') $$,
  42501,
  null,
  'organizador não abre pergunta no próprio evento'
);

-- ── negativo: terceiro não lê nem escreve ────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000010', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  format($$ select 1 from public.dm_conversations where id = %L $$, :'q_conv_id'),
  'terceiro não lê a conversa entre autor e organizador'
);

select throws_ok(
  format(
    $$ insert into public.dm_messages (conversation_id, sender_id, content)
       values (%L, '10000000-0000-4000-8000-000000000010', 'intrusa') $$,
    :'q_conv_id'
  ),
  42501,
  null,
  'terceiro não escreve na conversa de pergunta'
);

-- ── negativo: quem não acessa o evento não abre ──────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.open_event_question('30000000-0000-4000-8000-000000000077') $$,
  42501,
  null,
  'membro sem acesso ao evento fechado não abre pergunta'
);

-- ── negativo: preferência de mensagens desligada suprime o aviso ─────────────

reset role;
insert into public.notification_preferences (user_id, messages)
values ('10000000-0000-4000-8000-000000000001', false);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.dm_messages (conversation_id, sender_id, content)
values (:'q_conv_id'::uuid, '10000000-0000-4000-8000-000000000008', 'Segunda mensagem');

reset role;
select results_eq(
  format(
    $$ select count(*) from public.notifications
        where recipient_user_id = '10000000-0000-4000-8000-000000000001'
          and actor_user_id = '10000000-0000-4000-8000-000000000008'
          and type = 'direct_message'
          and target_id = %L $$,
    :'q_conv_id'
  ),
  array[1::bigint],
  'preferência messages=false suprime a notificação da segunda mensagem'
);

select * from finish();
rollback;
