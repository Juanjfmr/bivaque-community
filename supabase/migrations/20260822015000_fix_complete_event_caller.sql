-- Fix complete_event caller identity gap (MVP-02-AUTHZ).
--
-- The RPC was only callable by service_role but checked auth.uid() internally
-- — always NULL under service_role, so no organizer could ever close their
-- own event. Now accepts p_caller_user_id (same pattern as approve_community_member,
-- profile_rpcs, list_invitable_members_for_event). Grants expanded to authenticated
-- so any member can also invoke it directly with RLS deciding organizer ownership.

create or replace function public.complete_event(
  p_event_id uuid,
  p_caller_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = p_caller_user_id
  ) then
    raise exception 'only the event organizer can complete the event';
  end if;

  update public.events
  set status = 'completed', updated_at = now()
  where id = p_event_id;
end;
$$;

-- Grant to authenticated so members can call directly (RLS + organizer check).
revoke execute on function public.complete_event(uuid, uuid) from anon, authenticated;
grant execute on function public.complete_event(uuid, uuid) to authenticated;
grant execute on function public.complete_event(uuid, uuid) to service_role;
