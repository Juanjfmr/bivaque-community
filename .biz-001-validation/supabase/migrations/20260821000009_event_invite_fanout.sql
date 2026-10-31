-- 031: Event invitation fan-out + scope guard (Wave F Task 3).
--
-- The events surface had `event_invites` table + RLS (migration 033) but
-- no organizer-facing path. Three things land here:
--   1. can_receive_invite_to_event(p_event_id, p_user_id): the TARGET-user
--      variant of can_access_event. The existing helpers (is_locality_member,
--      is_community_member, is_group_member) are auth.uid()-bound, so we
--      inline the same scope logic parameterized by the invitee.
--   2. The insert policy now ALSO requires the invitee to be able to reach
--      the event's scope. Without this, an organizer could invite someone
--      from another locality to a locality-only event — a leak-by-
--      construction (D43: the invitation is scoped, not a directory).
--   3. The outbox enqueue happens at the action layer (same as the family
--      invite), so the type is free-text event_invite; the per-invitee
--      row is inserted with the invitee's email from auth.users.

create function private.can_receive_invite_to_event(
  p_event_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_in_locality boolean;
begin
  select * into v_event from public.events e where e.id = p_event_id;
  if not found then
    return false;
  end if;

  -- Invitee must be a member of the event's locality.
  select exists (
    select 1 from public.locality_memberships lm
    where lm.locality_id = v_event.locality_id
      and lm.user_id = p_user_id
  ) into v_in_locality;

  if not v_in_locality then
    return false;
  end if;

  -- Community scope: if the event is community-bound, invitee must be an
  -- approved member of that community.
  if v_event.community_id is not null then
    if not exists (
      select 1 from public.community_memberships cm
      where cm.community_id = v_event.community_id
        and cm.user_id = p_user_id
        and cm.status = 'approved'
    ) then
      return false;
    end if;
  end if;

  -- Group scope: if the event is group-bound, invitee must be an approved
  -- group member OR the group is public and the invitee is a locality member
  -- (already established above).
  if v_event.group_id is not null then
    if not exists (
      select 1 from public.groups g
      where g.id = v_event.group_id and g.visibility = 'public'
    ) then
      -- private group: must be approved member
      if not exists (
        select 1 from public.group_memberships gm
        where gm.group_id = v_event.group_id
          and gm.user_id = p_user_id
          and gm.status = 'approved'
      ) then
        return false;
      end if;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function private.can_receive_invite_to_event(uuid, uuid) from public;
revoke all on function private.can_receive_invite_to_event(uuid, uuid) from anon;
revoke all on function private.can_receive_invite_to_event(uuid, uuid) from authenticated;
-- The RLS policy calls this function, so authenticated needs execute on it.
grant execute on function private.can_receive_invite_to_event(uuid, uuid) to authenticated;

-- Replace the insert policy: organizer AND invitee can reach the event.
drop policy if exists event_invites_insert_organizer on public.event_invites;

create policy event_invites_insert_organizer
on public.event_invites
for insert
to authenticated
with check (
  invited_by = (select auth.uid())
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.organizer_id = (select auth.uid())
  )
  and private.can_receive_invite_to_event(event_id, invitee_user_id)
)
;