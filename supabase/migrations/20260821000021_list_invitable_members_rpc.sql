-- Found finishing the fix chain for event-invites-actions.ts (onda F Task 3):
-- even after the missing public RPC wrapper (20260821000019), the missing
-- service_role SELECT grant on events (20260821000020) and a detached
-- `this` binding on supabase.rpc in the client code, the invite list was
-- STILL empty for Manaus-sized data. Root cause: listInvitableMembersAction
-- built its candidate list from ALL locality members (302 in the real
-- seed), called can_receive_invite_to_event once per candidate (301
-- sequential round trips, ~2.6s), then queried
-- `.from("profiles").select(...).in("user_id", allowed)` with the ~300
-- surviving ids — which PostgREST rejects with "URI too long" the moment a
-- pilot-sized locality is involved. This was never going to surface
-- against the 5-10 users a pgTAP fixture or a quick manual click-through
-- uses; it was only found running against seed.sql's real ~300 members.
--
-- Fix: do the whole candidate-filter-join in one query, not 300+ round
-- trips plus one that could 414. Same shape as list_community_pending_
-- arrivals (20260820051230) and list_promotable_replies — the app calls
-- one RPC and gets back exactly the rows it needs.

create function public.list_invitable_members_for_event(
  p_event_id uuid,
  p_user_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  is_already_invited boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $func$
declare
  v_organizer_id uuid;
  v_locality_id uuid;
begin
  select e.organizer_id, e.locality_id
    into v_organizer_id, v_locality_id
    from public.events e
    where e.id = p_event_id;

  if v_organizer_id is null or v_organizer_id <> p_user_id then
    return;
  end if;

  return query
    select
      lm.user_id,
      p.display_name,
      exists (
        select 1 from public.event_invites ei
        where ei.event_id = p_event_id and ei.invitee_user_id = lm.user_id
      )
    from public.locality_memberships lm
    left join public.profiles p on p.user_id = lm.user_id
    where lm.locality_id = v_locality_id
      and lm.user_id <> v_organizer_id
      and private.can_receive_invite_to_event(p_event_id, lm.user_id)
    order by p.display_name nulls last;
end;
$func$;

revoke all on function public.list_invitable_members_for_event(uuid, uuid) from public;
revoke all on function public.list_invitable_members_for_event(uuid, uuid) from anon;
revoke all on function public.list_invitable_members_for_event(uuid, uuid) from authenticated;
grant execute on function public.list_invitable_members_for_event(uuid, uuid) to service_role;
