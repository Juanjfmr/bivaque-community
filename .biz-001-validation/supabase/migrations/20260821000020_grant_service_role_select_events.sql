-- Same shape as 20260821000016_grant_service_role_select_moderatable_content.sql,
-- found the same way: event-invites-actions.ts's listInvitableMembersAction
-- (onda F Task 3, marked "fechado" in PRODUCT_STATUS.md) reads
-- public.events through the service_role client to resolve the event's
-- locality/community/group scope, then loops candidates through
-- can_receive_invite_to_event. service_role never had SELECT on events —
-- RLS is bypassed for service_role (rolbypassrls), but the base table
-- grant is a separate check that bypass doesn't skip — so the very first
-- query in the action failed with "permission denied for table events",
-- the action discarded the error and returned an empty event, and the
-- whole invite list was empty for every event, for every organizer, this
-- whole time. Confirmed directly (not guessed): a standalone script using
-- the same service_role client and the same query reproduced the
-- permission-denied error before this grant, and returned real event data
-- immediately after.

grant select on table public.events to service_role;
