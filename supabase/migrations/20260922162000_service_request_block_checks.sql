-- Auditoria de 22/09/2026 sobre o ADR-20260922-conversa-por-pedido (achado
-- MEDIUM): create_service_request nao conferia bloqueio nem exclusao de conta,
-- e agora cada pedido abre uma conversa nova. Passa a conferir, como
-- open_conversation ja faz. O teto de pedidos por par e decisao de produto
-- separada (card PEDIDO-TETO-POR-PAR).

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

  -- ADR-20260922-conversa-por-pedido diz que bloqueios valem para as duas
  -- conversas, e cada pedido agora abre uma conversa nova: sem estas
  -- conferencias, quem foi bloqueado pelo prestador seguia mandando pedidos, e
  -- cada um criava uma conversa na caixa dele (auditoria de 22/09/2026, MEDIUM).
  -- Mesmas regras de open_conversation.
  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;
  if private.account_deletion_requested(v_provider_user) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = v_provider_user)
       or (blocker_user_id = v_provider_user and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
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

revoke all on function public.create_service_request(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_service_request(uuid, text, text, text) to authenticated;
