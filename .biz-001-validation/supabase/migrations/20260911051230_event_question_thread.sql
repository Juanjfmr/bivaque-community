-- RECON-029 (R34 / ADR-20260909 D2–D3): pergunta vinculada ao evento.
--
-- O destinatário é derivado do PRÓPRIO evento dentro do banco: `open_event_question`
-- lê `events.organizer_id` e nunca aceita um destinatário vindo do corpo da
-- requisição. Quem pergunta precisa poder acessar o evento (a mesma régua de
-- `private.can_access_event`) e não pode ser o organizador — o organizador
-- responde, não inicia. Não exige RSVP, não promete prazo.
--
-- Idempotência: reabrir a mesma pergunta devolve a MESMA conversa. A tabela
-- `dm_conversations` tem unicidade por par (`dm_conversations_unique_pair`), então
-- quando o par já tem uma conversa de OUTRO contexto a função recusa com 42501
-- em vez de reescrever o contexto alheio — a conversa permanece vinculada ao
-- evento, que é o contrato. A unicidade por (par, contexto) é decisão de schema
-- à parte, registrada como pendência no card RECON-029; não se altera aqui um
-- primitivo compartilhado sem prova.
--
-- Notificação (R34: "autor e organizador recebem atualização"): cada mensagem da
-- conversa de pergunta notifica o outro participante com o tipo `direct_message`
-- já existente, honrando `notification_preferences.messages`. Terceiro não lê
-- porque a RLS de `dm_conversations`/`dm_messages` só mostra a quem participa.

-- ── abrir a conversa de pergunta (destinatário vem do evento) ────────────────

create function public.open_event_question(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_organizer uuid;
  v_a uuid;
  v_b uuid;
  v_existing public.dm_conversations%rowtype;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select e.organizer_id into v_organizer
  from public.events e
  where e.id = p_event_id;

  if v_organizer is null then
    raise exception 'event not found' using errcode = '42501';
  end if;

  if v_organizer = v_me then
    raise exception 'organizer cannot ask about own event' using errcode = '42501';
  end if;

  -- Quem pergunta precisa enxergar o evento; a mesma régua da policy de leitura.
  if not private.can_access_event(p_event_id) then
    raise exception 'cannot access event' using errcode = '42501';
  end if;

  -- Bloqueio vale nos dois sentidos, inclusive para abrir conversa nova.
  if exists (
    select 1
    from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = v_organizer)
       or (blocker_user_id = v_organizer and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A ordenação é do servidor, e só dele — o cliente nunca escolhe quem é A.
  v_a := least(v_me, v_organizer);
  v_b := greatest(v_me, v_organizer);

  select * into v_existing
  from public.dm_conversations c
  where c.participant_a = v_a
    and c.participant_b = v_b;

  if found then
    if v_existing.context_type = 'event_question' and v_existing.context_id = p_event_id then
      return v_existing.id;
    end if;
    raise exception 'pair already has a conversation with another context'
      using errcode = '42501';
  end if;

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, 'event_question', p_event_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.open_event_question(uuid) from public, anon;
grant execute on function public.open_event_question(uuid) to authenticated;

-- ── notificação da pergunta/resposta ─────────────────────────────────────────

create function private.notify_event_question_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.dm_conversations%rowtype;
  v_recipient uuid;
begin
  select * into v_conversation
  from public.dm_conversations c
  where c.id = new.conversation_id;

  -- Só a conversa de pergunta notifica; as outras primitivas de DM têm o seu ciclo.
  if not found or v_conversation.context_type <> 'event_question' then
    return new;
  end if;

  v_recipient := case
    when v_conversation.participant_a = new.sender_id then v_conversation.participant_b
    else v_conversation.participant_a
  end;

  if v_recipient is null or v_recipient = new.sender_id then
    return new;
  end if;

  if coalesce(
    (select np.messages from public.notification_preferences np where np.user_id = v_recipient),
    true
  ) is false then
    return new;
  end if;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  values
    (v_recipient, new.sender_id, 'direct_message', 'question', 'conversation', new.conversation_id);

  return new;
end;
$$;

create trigger notify_event_question_message_trigger
after insert on public.dm_messages
for each row
execute function private.notify_event_question_message();
