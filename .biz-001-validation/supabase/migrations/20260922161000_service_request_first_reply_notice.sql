-- ADR-20260922-aviso-da-primeira-resposta (aceito pelo dono em 22/09/2026).
--
-- Quem pede um servico nao era avisado quando o prestador respondia. O aviso
-- nasce no unico lugar em que a primeira resposta existe: o ramo de
-- send_conversation_message que muda o pedido de open para in_conversation.
-- Uma vez por pedido, so para quem pediu, sem o texto da mensagem, honrando
-- notification_preferences.messages. Depende da conversa por pedido
-- (20260922160100): antes dela a transicao mudava um pedido qualquer.

CREATE OR REPLACE FUNCTION public.send_conversation_message(p_conversation_id uuid, p_content text, p_client_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_content text := btrim(coalesce(p_content, ''));
  v_key text := nullif(btrim(coalesce(p_client_key, '')), '');
  v_conv public.dm_conversations%rowtype;
  v_msg public.dm_messages%rowtype;
  v_other uuid;
  v_status public.service_request_status;
  v_provider uuid;
  v_request_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_content = '' then
    raise exception 'message required' using errcode = '22023';
  end if;
  if char_length(v_content) > 2000 then
    raise exception 'message too long' using errcode = '22023';
  end if;

  select * into v_conv from public.dm_conversations where id = p_conversation_id;
  if not found then
    raise exception 'conversation not found' using errcode = '42501';
  end if;
  if v_me <> v_conv.participant_a and v_me <> v_conv.participant_b then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  v_other := case
    when v_conv.participant_a = v_me then v_conv.participant_b
    else v_conv.participant_a
  end;
  if private.account_deletion_requested(v_other) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.dm_blocks b
     where (b.blocker_user_id = v_conv.participant_a
            and b.blocked_user_id = v_conv.participant_b)
        or (b.blocker_user_id = v_conv.participant_b
            and b.blocked_user_id = v_conv.participant_a)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- Reenvio repetido devolve a linha ja gravada em vez de criar outra.
  if v_key is not null then
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    if found then
      return to_jsonb(v_msg);
    end if;
  end if;

  insert into public.dm_messages (conversation_id, sender_id, content, client_key)
  values (p_conversation_id, v_me, v_content, v_key)
  on conflict (conversation_id, sender_id, client_key) where client_key is not null
  do nothing
  returning * into v_msg;

  if v_msg.id is null then
    -- Corrida: outra transacao gravou a mesma chave primeiro.
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    return to_jsonb(v_msg);
  end if;

  -- A situacao muda na PRIMEIRA resposta do PRESTADOR, na mesma transacao em
  -- que a mensagem e gravada. Depois disso a coluna permanece. Enquanto o
  -- pedido nao esta encerrado, a mensagem tambem move a "ultima atualizacao"
  -- que a lista mostra.
  -- ADR-20260922-conversa-por-pedido: conversa nova tem UM pedido. Nos pedidos
  -- antigos, que dividem a conversa do par, a escolha deixa de ser qualquer uma:
  -- vale o pedido aberto mais recente, e depois o mais recente ainda ativo.
  select r.id, r.status, r.provider_user_id
    into v_request_id, v_status, v_provider
    from public.service_requests r
   where r.conversation_id = p_conversation_id
   order by (r.status = 'open') desc, r.created_at desc
   limit 1
   for update;
  if found then
    if v_status = 'open' and v_me = v_provider then
      update public.service_requests
         set status = 'in_conversation'
       where id = v_request_id;

      -- ADR-20260922-aviso-da-primeira-resposta: a primeira resposta do
      -- prestador avisa QUEM PEDIU, uma unica vez, na mesma transacao da
      -- transicao. Sem texto da mensagem e com ator nulo (o prestador nao tem
      -- perfil de membro); o nome exibido vem da ficha, pelo pedido. Honra
      -- notification_preferences.messages, como os avisos de mensagem.
      insert into public.notifications
        (recipient_user_id, actor_user_id, type, action, target_type, target_id)
      select r.requester_user_id, null, 'service_request', 'provider_first_reply',
             'service_request', r.id
        from public.service_requests r
       where r.id = v_request_id
         and coalesce(
           (select np.messages from public.notification_preferences np
             where np.user_id = r.requester_user_id),
           true
         );
    elsif v_status <> 'closed' and v_status <> 'cancelled' then
      update public.service_requests
         set updated_at = now()
       where id = v_request_id;
    end if;
  end if;

  return to_jsonb(v_msg);
end;
$function$;

revoke all on function public.send_conversation_message(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.send_conversation_message(uuid, text, text) to authenticated;
