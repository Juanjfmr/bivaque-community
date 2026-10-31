-- Onda F Task 1 Step 2b: the missing delete policy for event_rsvps.
--
-- group_memberships_delete_self already exists (20260802001000). The
-- snapshot test recorded its presence; this commit does not duplicate it.
--
-- event_rsvps has no delete policy for authenticated. cancelRsvpAction
-- became a visible RLS denial when the action moved to the authenticated
-- client. This migration adds the policy that scopes the denial: the
-- holder can delete their own RSVP (user_id = auth.uid()), nothing
-- else.
--
-- Rule 6 of §12: the policy and the action that depends on it land
-- together.

create policy event_rsvps_delete_self
on public.event_rsvps
for delete
to authenticated
using (user_id = (select auth.uid()));
