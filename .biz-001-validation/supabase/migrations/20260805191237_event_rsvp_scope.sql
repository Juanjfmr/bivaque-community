-- 019: event_rsvps must respect the same scope as the event itself.
--
-- Migration 017 scoped events.select to group membership ("the 012 policy
-- exposed group-scoped events to every locality member, including non-members
-- of private groups") but event_rsvps kept gating on
-- private.is_event_locality_member alone. Same bug class as 018, now on the
-- RSVP surface.
--
-- Two different situations, deliberately fixed together:
--
--   INSERT — the actual leak. is_event_locality_member is security definer, so
--   it bypasses RLS and sees only locality membership: any Manaus member could
--   RSVP to a PRIVATE group's event. The payoff is the notification path, not
--   the row itself — notify_event_change notifies every RSVP'd user, so an
--   outsider who RSVP'd goes on to receive the private event's title, venue
--   and schedule whenever it is edited.
--
--   SELECT — already safe, but by accident. Its policy nests
--   "select 1 from public.events", and that subquery is subject to the events
--   RLS that 017 tightened. Behaviour does not change here; the guarantee just
--   stops depending on a coincidence that a future refactor could remove by
--   wrapping the lookup in a security definer helper.
--
-- can_access_event mirrors the events select policy. When the community layer
-- lands, this function gains a community branch and must be replaced in the
-- same migration that adds events.community_id — never after it.
--
-- All functions use set search_path = '' to prevent search-path injection.

create function private.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and private.is_locality_member(e.locality_id)
      and (
        e.group_id is null
        or private.is_group_member(e.group_id)
        or exists (
          select 1
          from public.groups g
          where g.id = e.group_id
            and g.visibility = 'public'
        )
      )
  );
$$;

revoke all on function private.can_access_event(uuid) from public;
revoke all on function private.can_access_event(uuid) from anon;
revoke all on function private.can_access_event(uuid) from authenticated;

grant execute on function private.can_access_event(uuid) to authenticated;

drop policy event_rsvps_select_locality_member on public.event_rsvps;

create policy event_rsvps_select_locality_member
on public.event_rsvps
for select
to authenticated
using (
  private.can_access_event(event_id)
);

drop policy event_rsvps_insert_self on public.event_rsvps;

create policy event_rsvps_insert_self
on public.event_rsvps
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_event(event_id)
);

-- event_rsvps_update_self and the delete path stay own-row only and need no
-- scope gate: an existing RSVP already passed the gate on insert.
