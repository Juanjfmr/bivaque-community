-- Conta conversas com mensagens da outra pessoa ainda não lidas, sob a RLS do chamador.
create function public.unread_conversation_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.dm_conversations c
  where (c.participant_a = (select auth.uid()) or c.participant_b = (select auth.uid()))
    and exists (
      select 1 from public.dm_messages m
      left join public.dm_read_states r
        on r.conversation_id = c.id and r.user_id = (select auth.uid())
      where m.conversation_id = c.id
        and m.sender_id <> (select auth.uid())
        and (r.last_read_at is null or m.created_at > r.last_read_at)
    );
$$;

revoke all on function public.unread_conversation_count() from public, anon;
grant execute on function public.unread_conversation_count() to authenticated;
