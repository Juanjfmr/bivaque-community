-- RECON-052: o convite criado gera notificacao in-app para o CONVIDADO.
--
-- Hoje o convidado de um evento so recebe e-mail (outbox, RECON-037); nao havia
-- notificacao in-app de convite. Esta migration liga o retorno em Notificacoes.
-- Duas partes, ambas no caminho unico de preferencia:
--
--   1. `private.notification_type_key` passa a mapear `event_invite` -> `events`.
--      Sem isto o helper devolveria `true` para um tipo nao governado e entregaria
--      convite a quem desligou eventos — exatamente o furo que o RECON-037 fechou
--      no outbox e que faltava no espelho do banco. O mapa TS
--      (apps/web/lib/notifications/channel-preferences.ts) ja declara
--      `event_invite: "events"`; este e o mesmo mapa do lado do banco.
--
--      O corpo abaixo partiu da versao ATUAL da funcao (a ultima que a define e
--      20260911054812_notification_channel_preferences.sql) e SO acrescentou
--      `event_invite` a lista de tipos de evento. Nenhum mapeamento existente foi
--      removido: `comment`, `event_rsvp`/`event_change`/`event_reminder`,
--      `direct_message` e `product_news` continuam identicos.
--
--   2. O gatilho AFTER INSERT em `public.event_invites` insere a notificacao para
--      `new.invitee_user_id` e para mais ninguem, perguntando a preferencia pelo
--      helper unico do canal in-app (`private.notification_channel_allows`), o
--      mesmo que `notify_event_rsvp`/`notify_event_change` usam. `public.event_invites`
--      tem (event_id, invitee_user_id, invited_by, status, created_at, responded_at)
--      e `public.notifications` tem (recipient_user_id, actor_user_id, type, action,
--      target_type, target_id) — as colunas usadas aqui batem com o schema atual.
--
-- A leitura ja e permitida ao convidado pela policy `event_invites_select_invitee`
-- (20260806171204). O convite repetido e no-op no app (upsert ignoreDuplicates), e
-- `ON CONFLICT DO NOTHING` nao dispara gatilho de INSERT — sem notificacao dobrada.
-- Nenhuma checagem paralela de bloqueio e criada: os outros produtores in-app
-- (notify_comment, notify_event_rsvp, notify_event_change) tambem nao checam
-- bloqueio hoje; inventar uma aqui seria uma regra so deste tipo.
--
-- O valor `event_invite` entra em migration anterior porque `ALTER TYPE ADD VALUE`
-- nao pode ser usado na mesma transacao que o cria.

-- ── 1. o mapa tipo -> chave de preferencia ganha o convite de evento ─────────

create or replace function private.notification_type_key(p_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type = 'comment' then 'comments'
    when p_type in ('event_rsvp', 'event_change', 'event_reminder', 'event_invite') then 'events'
    when p_type = 'direct_message' then 'messages'
    when p_type = 'product_news' then 'product_news'
    else null
  end;
$$;

revoke all on function private.notification_type_key(text) from public;

-- ── 2. o produtor in-app: um convite criado notifica o convidado ────────────

create function private.notify_event_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Actor must not self-notify (the organizer inviting themselves).
  if new.invitee_user_id = new.invited_by then
    return new;
  end if;

  -- The in-app producer asks the single helper, which resolves the 'events'
  -- preference and the in_app matrix row together. O convidado e o unico
  -- destinatario; ninguem mais recebe esta linha.
  if private.notification_channel_allows('event_invite', 'in_app', new.invitee_user_id) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (new.invitee_user_id, new.invited_by, 'event_invite', 'invited', 'event', new.event_id);
  end if;

  return new;
end;
$$;

create trigger notify_event_invite_trigger
after insert on public.event_invites
for each row
execute function private.notify_event_invite();