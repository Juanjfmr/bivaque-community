-- ADR-20260922-conversa-por-pedido (aceito pelo dono em 22/09/2026), parte 2.
--
-- dm_conversations_unique_pair impunha UMA conversa por par, e create_service_
-- request reaproveitava a do par: todos os pedidos entre a mesma pessoa e o
-- mesmo prestador dividiam a conversa, cada acompanhamento mostrava as
-- mensagens de todos, e a resposta do prestador mudava a situacao de um pedido
-- qualquer. Medido no banco local em 22/09/2026: 9 pedidos numa conversa, 4
-- presos em open.
--
-- 1. A unicidade por par continua para toda conversa que NAO e de pedido
--    (indice parcial); conversa de pedido e unica por pedido.
-- 2. create_service_request cria a conversa do proprio pedido.
-- 3. open_conversation nunca abre conversa de pedido, e o on conflict dela
--    passa a casar com o indice parcial.
-- 4. send_conversation_message acha o pedido certo; nos pedidos antigos, que
--    continuam na conversa compartilhada (as mensagens gravadas nao dizem de
--    qual pedido sao), vale o aberto mais recente.

alter table public.dm_conversations drop constraint dm_conversations_unique_pair;

create unique index dm_conversations_unique_pair
  on public.dm_conversations (participant_a, participant_b)
  where context_type <> 'service_request';

create unique index dm_conversations_unique_service_request
  on public.dm_conversations (context_id)
  where context_type = 'service_request';

CREATE OR REPLACE FUNCTION public.open_conversation(p_other_user_id uuid, p_context_type dm_context_type, p_context_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null or v_me = p_other_user_id then
    raise exception 'invalid conversation' using errcode = '22023';
  end if;

  -- Quem está saindo também não abre conversa: a sessão morreu, mas um access
  -- token ainda aceito pelo Data API não pode virar conversa nova.
  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if private.account_deletion_requested(p_other_user_id) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  -- ADR-20260922-conversa-por-pedido: conversa de pedido so nasce com o pedido,
  -- em create_service_request. Aqui ela nunca e aberta nem reaproveitada.
  if p_context_type = 'service_request' then
    raise exception 'service request conversations are created with the request'
      using errcode = '42501';
  end if;

  if not private.dm_context_valid(v_me, p_other_user_id, p_context_type, p_context_id) then
    raise exception 'no valid context between these users' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = p_other_user_id)
       or (blocker_user_id = p_other_user_id and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A ordenação é aqui, e só aqui. O cliente nunca escolhe quem é A.
  v_a := least(v_me, p_other_user_id);
  v_b := greatest(v_me, p_other_user_id);

  -- O "do update" não muda nada: é o idioma para conseguir RETURNING quando a
  -- linha já existe. Reabrir conversa é devolver a mesma, não criar outra.
  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, p_context_type, p_context_id)
  on conflict (participant_a, participant_b) where context_type <> 'service_request'
  do update set participant_a = excluded.participant_a
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_service_request(p_provider_id uuid, p_description text, p_when_text text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me uuid := (select auth.uid());
  v_provider_user uuid;
  v_category public.provider_category;
  v_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_existing uuid;
  v_a uuid;
  v_b uuid;
  v_conv uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_description is null or btrim(p_description) = '' then
    raise exception 'description required' using errcode = '22023';
  end if;
  if char_length(btrim(p_description)) > 500 then
    raise exception 'description too long' using errcode = '22023';
  end if;
  if p_when_text is not null and char_length(btrim(p_when_text)) > 120 then
    raise exception 'when too long' using errcode = '22023';
  end if;

  select pp.owner_user_id, pp.category
    into v_provider_user, v_category
    from public.provider_profiles pp
   where pp.id = p_provider_id
     and pp.is_deleted = false;

  if v_provider_user is null then
    raise exception 'provider not found' using errcode = 'P0002';
  end if;

  if v_provider_user = v_me then
    raise exception 'cannot request from the own profile' using errcode = '42501';
  end if;

  if not private.can_see_provider(p_provider_id) then
    raise exception 'provider not visible' using errcode = '42501';
  end if;

  if v_key is not null then
    select r.id into v_existing
      from public.service_requests r
     where r.requester_user_id = v_me
       and r.idempotency_key = v_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- A ordenacao do par e do servidor e a conversa nasce com contexto fixo.
  v_a := least(v_me, v_provider_user);
  v_b := greatest(v_me, v_provider_user);

  -- ADR-20260922-conversa-por-pedido: cada pedido nasce com a sua conversa, de
  -- contexto service_request e context_id = id do pedido. Antes a conversa do
  -- par era reaproveitada, e todos os pedidos do par se misturavam.
  v_id := gen_random_uuid();

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, 'service_request', v_id)
  returning id into v_conv;

  insert into public.service_requests (
    id,
    requester_user_id,
    provider_id,
    provider_user_id,
    category,
    description,
    when_text,
    conversation_id,
    idempotency_key
  )
  values (
    v_id,
    v_me,
    p_provider_id,
    v_provider_user,
    v_category,
    btrim(p_description),
    nullif(btrim(coalesce(p_when_text, '')), ''),
    v_conv,
    v_key
  )
  returning id into v_id;

  return v_id;
end;
$function$;

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
    elsif v_status <> 'closed' and v_status <> 'cancelled' then
      update public.service_requests
         set updated_at = now()
       where id = v_request_id;
    end if;
  end if;

  return to_jsonb(v_msg);
end;
$function$;


revoke all on function public.open_conversation(uuid, public.dm_context_type, uuid)
  from public, anon, authenticated;
grant execute on function public.open_conversation(uuid, public.dm_context_type, uuid) to authenticated;

revoke all on function public.create_service_request(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_service_request(uuid, text, text, text) to authenticated;

revoke all on function public.send_conversation_message(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.send_conversation_message(uuid, text, text) to authenticated;
