-- 017: scope group events to group membership
-- The 012 events_select_locality_member policy exposed group-scoped events
-- to every locality member, including non-members of private groups.
-- Replace it with a policy that grants group events only to group members
-- (or locality members when the group is public), keeping locality-wide
-- events on the locality-membership gate.

drop policy events_select_locality_member on public.events;

create policy events_select_locality_member
on public.events
for select
to authenticated
using (
  (
    group_id is null
    and private.is_event_locality_member(id)
  )
  or (
    group_id is not null
    and (
      private.is_group_member(group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = group_id
          and g.visibility = 'public'
          and private.is_event_locality_member(id)
      )
    )
  )
);
