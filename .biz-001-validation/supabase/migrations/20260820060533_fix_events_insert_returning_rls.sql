-- Found during manual browser QA of onda F Task 4: creating any event whose
-- client request asks PostgREST to return the created row (Prefer:
-- return=representation — e.g. supabase-js's `.insert(...).select()`, or
-- simply representation mode via a raw REST call) failed with
--   "new row violates row-level security policy for table \"events\""
-- even for a fully ordinary, non-recurring event from a verified, active
-- locality member. A plain `.insert(...)` without `.select()` (return=
-- minimal) worked, which is why this was never caught before: every event-
-- creation call site in this app happens to omit `.select()` today.
--
-- Root cause, reproduced directly in psql (no PostgREST involved):
--   insert into events (...) values (...) returning *;
-- fails, while the same insert followed by a SEPARATE select succeeds.
-- events_select_locality_member (20260805214709_community_scope.sql:411)
-- gates the locality-wide and group-event branches with
-- private.is_event_locality_member(id) — a STABLE function that re-queries
-- public.events BY THE SAME ROW'S OWN ID. A STABLE function's snapshot is
-- fixed for the duration of the statement, taken BEFORE the INSERT runs;
-- when RETURNING triggers the implicit SELECT-policy re-check within that
-- same statement, the self-query cannot see the row the statement itself
-- is in the middle of inserting, so the exists() it depends on comes back
-- false and RLS denies the row. A later, separate SELECT gets a fresh
-- snapshot that does see the committed row, which is why the two-statement
-- version in pgTAP fixtures (insert; then a plain select) never surfaced
-- this.
--
-- Fix: the policy does not need to re-look-up the row by id at all — it
-- already has the row's own locality_id column available directly, with no
-- subquery. private.is_locality_member(locality_id) is exactly the same
-- check is_event_locality_member was doing (a locality_memberships lookup
-- for the current user), minus the self-referencing indirection through
-- events. event_rsvps' own policies (20260802001200_events_rsvp.sql:147,
-- 162) also call is_event_locality_member, but they query public.events —
-- a table NOT being written by an event_rsvps insert — so they do not have
-- this snapshot problem and are left untouched.

drop policy events_select_locality_member on public.events;

create policy events_select_locality_member
on public.events
for select
to authenticated
using (
  (
    community_id is not null
    and private.is_community_member(community_id)
  )
  or (
    community_id is null
    and group_id is null
    and private.is_locality_member(locality_id)
  )
  or (
    community_id is null
    and group_id is not null
    and (
      private.is_group_member(group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = group_id
          and g.visibility = 'public'
          and (
            g.community_id is null
            or private.is_community_member(g.community_id)
          )
          and private.is_locality_member(locality_id)
      )
    )
  )
);
