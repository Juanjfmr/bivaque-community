-- Regras de envio também no INSERT direto em dm_messages (RECON-023/024).
--
-- 20260924005748 travou a RPC send_conversation_message, mas `authenticated`
-- mantém `insert` em public.dm_messages (20260802001500:97) e a policy
-- dm_messages_insert_sender só confere remetente, participante e bloqueio.
-- O chat de /messages grava direto na tabela, então um participante gravava
-- num pedido closed/cancelled, e também numa conversa com conta em exclusão —
-- duas regras que só a RPC aplicava. Elas passam a morar num gatilho BEFORE
-- INSERT, que vale para a RPC e para o insert direto:
--
--   * quem NÃO participa da conversa sai sem consulta nenhuma: a policy
--     recusa com 42501. O gatilho roda antes da RLS e com privilégio de dono;
--     responder outra coisa a um estranho (ou travar os pedidos dele) diria
--     que a conversa existe e em que estado está;
--   * conta em exclusão (remetente ou destinatário): recusa em qualquer
--     conversa, com as mesmas frases da RPC;
--   * pedido terminal: só conversa DE PEDIDO (context_type = 'service_request',
--     criada por create_service_request desde 20260922160100) é vigiada, e
--     aceita enquanto houver PELO MENOS UM pedido não terminal ligado a ela.
--     Conversa de outro tipo segue livre, MESMO que carregue pedidos antigos:
--     até 22/09 o pedido reaproveitava a conversa do par (`provider`,
--     `event_question`…), que é o chat geral das duas pessoas — encerrar um
--     pedido antigo não pode calar esse chat (open_conversation sempre devolve
--     a mesma conversa do par). Nessas conversas a trava continua na RPC, que a
--     página do pedido usa.
--
-- `for share`, em ordem de id, serializa com close/cancel (que usam
-- `for update`): se o encerramento ganhou a corrida, o gatilho enxerga o
-- estado final; a ordem fixa evita ciclo de espera entre transações que travam
-- os mesmos pedidos.
--
-- A RPC passa a preferir um pedido ativo ao escolher qual pedido da conversa
-- avançar, e close/cancel usam a mesma frase para inexistente e não
-- autorizado.

-- O gatilho procura os pedidos da conversa a cada mensagem gravada.
create index if not exists service_requests_conversation_idx
  on public.service_requests (conversation_id);

create function private.guard_dm_message_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_conv public.dm_conversations%rowtype;
  v_other uuid;
begin
  select * into v_conv
    from public.dm_conversations c
   where c.id = new.conversation_id;
  if not found
     or new.sender_id is null
     or new.sender_id not in (v_conv.participant_a, v_conv.participant_b) then
    -- A RLS (dm_messages_insert_sender) é quem recusa, com 42501.
    return new;
  end if;

  if private.account_deletion_requested(new.sender_id) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;
  v_other := case
    when v_conv.participant_a = new.sender_id then v_conv.participant_b
    else v_conv.participant_a
  end;
  if private.account_deletion_requested(v_other) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  if v_conv.context_type <> 'service_request' then
    return new;
  end if;

  perform 1
    from public.service_requests r
   where r.conversation_id = new.conversation_id
   order by r.id
   for share;
  if not found then
    return new;
  end if;

  if not exists (
    select 1
      from public.service_requests r
     where r.conversation_id = new.conversation_id
       and r.status in ('open', 'in_conversation')
  ) then
    raise exception 'request is terminal' using errcode = '22023';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_dm_message_insert() from public, anon, authenticated;

create trigger dm_messages_guard_insert
before insert on public.dm_messages
for each row
execute function private.guard_dm_message_insert();


CREATE OR REPLACE FUNCTION public.send_conversation_message(
  p_conversation_id uuid,
  p_content text,
  p_client_key text DEFAULT NULL::text
)
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

  select * into v_conv
    from public.dm_conversations
   where id = p_conversation_id;
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

  -- Trava o pedido ANTES de qualquer insert. Isso serializa com
  -- close/cancel: se o terminal ganhou a corrida, a mensagem é recusada; se a
  -- mensagem ganhou, o close é aplicado depois sem duplicar a linha.
  -- Conversa antiga compartilhada por mais de um pedido: um pedido ATIVO
  -- vence um terminal, então o pedido escolhido só é terminal quando todos são.
  select r.id, r.status, r.provider_user_id
    into v_request_id, v_status, v_provider
    from public.service_requests r
   where r.conversation_id = p_conversation_id
   order by case r.status
              when 'open' then 0
              when 'in_conversation' then 1
              else 2
            end,
            r.created_at desc
   limit 1
   for update;

  if v_request_id is not null and v_status in ('closed', 'cancelled') then
    -- Retry idempotente de uma mensagem que já entrou antes do encerramento
    -- continua devolvendo a linha existente.
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
    raise exception 'request is terminal' using errcode = '22023';
  end if;

  -- Reenvio repetido devolve a linha já gravada em vez de criar outra.
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
    -- Corrida: outra transação gravou a mesma chave primeiro.
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    return to_jsonb(v_msg);
  end if;

  -- A situação muda na PRIMEIRA resposta do PRESTADOR, na mesma transação que
  -- grava a mensagem. Depois disso a coluna permanece.
  if v_request_id is not null then
    if v_status = 'open' and v_me = v_provider then
      update public.service_requests
         set status = 'in_conversation'
       where id = v_request_id;

      -- ADR-20260922-aviso-da-primeira-resposta: a primeira resposta do
      -- prestador avisa QUEM PEDIU, uma única vez, na mesma transação.
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
    elsif v_status not in ('closed', 'cancelled') then
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


CREATE OR REPLACE FUNCTION public.close_service_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;
  if not found then
    -- Não diferencia inexistente de não autorizado: o endpoint não confirma
    -- a existência de um pedido a uma conta que não é a solicitante.
    raise exception 'request not found' using errcode = '42501';
  end if;
  if v_me <> v_req.requester_user_id and v_me <> v_req.provider_user_id then
    -- Mesma frase do inexistente: a mensagem não confirma que o pedido existe.
    raise exception 'request not found' using errcode = '42501';
  end if;

  -- closed e cancelled são terminais. Uma repetição idempotente devolve o
  -- mesmo estado; nunca transforma cancelamento em encerramento.
  if v_req.status in ('open', 'in_conversation') then
    update public.service_requests
       set status = 'closed',
           closed_at = now(),
           closed_by_user_id = v_me
     where id = p_request_id
     returning * into v_req;
  end if;

  return to_jsonb(v_req);
end;
$function$;

revoke all on function public.close_service_request(uuid) from public, anon;
grant execute on function public.close_service_request(uuid) to authenticated;


CREATE OR REPLACE FUNCTION public.cancel_service_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;
  if not found then
    -- Não confirma a existência do pedido para uma conta não autorizada.
    raise exception 'request not found' using errcode = '42501';
  end if;
  if v_req.requester_user_id <> v_me then
    -- Mesma frase do inexistente: a mensagem não confirma que o pedido existe.
    raise exception 'request not found' using errcode = '42501';
  end if;
  if v_req.status not in ('open', 'in_conversation') then
    raise exception 'request already finished' using errcode = '22023';
  end if;

  update public.service_requests
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by_user_id = v_me
   where id = p_request_id
   returning * into v_req;

  return to_jsonb(v_req);
end;
$function$;

revoke all on function public.cancel_service_request(uuid) from public, anon;
grant execute on function public.cancel_service_request(uuid) to authenticated;
