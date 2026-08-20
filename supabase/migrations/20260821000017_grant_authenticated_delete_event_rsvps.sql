-- 20260819010000_self_delete_policies.sql added event_rsvps_delete_self
-- (RLS policy for DELETE, to authenticated) but never granted the base
-- DELETE privilege — 20260802001200_events_rsvp.sql only granted select,
-- insert, update. Without the table-level grant, every "cancel my RSVP"
-- attempt fails with 42501 "permission denied for table event_rsvps"
-- before RLS is even evaluated.

grant delete on table public.event_rsvps to authenticated;
