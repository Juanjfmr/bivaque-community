-- ADR-20260922-conversa-por-pedido, consequencia em open_event_question.
--
-- Antes desta correcao, open_event_question buscava a conversa do par por
-- participante_a/participant_b sem olhar o contexto. Desde
-- 20260922160100_conversation_per_request o par pode ter varias linhas (uma por
-- pedido de servico, e no maximo uma de qualquer outro contexto), entao a busca
-- enxergava a conversa de pedido e recusava a pergunta do evento com 42501
-- 'pair already has a conversation with another context'.
--
-- Correcao minima: a busca passa a ignorar conversas de pedido. O indice
-- parcial dm_conversations_unique_pair (where context_type <> 'service_request')
-- garante no maximo UMA conversa nao-pedido por par, que e a que decide
-- idempotencia e o conflito de contexto. A semantica de "another context"
-- permanece intacta para tudo que nao e pedido: par com pergunta sobre OUTRO
-- evento continua recusado. Somente pedidos deixam de contar.
--
-- Corpo identico ao de 20260911051230_event_question_thread.sql, mudando so o
-- select da conversa existente. security definer e search_path = '' mantidos.

create or replace function public.open_event_question(p_event_id uuid)
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

  -- Quem pergunta precisa enxergar o evento; a mesma regua da policy de leitura.
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

  -- A ordenacao e do servidor, e so dele - o cliente nunca escolhe quem e A.
  v_a := least(v_me, v_organizer);
  v_b := greatest(v_me, v_organizer);

  -- Conversas de pedido nao contam: o par pode ter varias, uma por pedido.
  select * into v_existing
  from public.dm_conversations c
  where c.participant_a = v_a
    and c.participant_b = v_b
    and c.context_type <> 'service_request';

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