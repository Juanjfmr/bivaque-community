-- Found fixing the HeroUI Checkbox in event-invite-fanout-section.tsx: the
-- whole event-invite feature (onda F Task 3, marked "fechado" in
-- PRODUCT_STATUS.md) has never actually worked. The organizer's invite
-- list was always empty, for every event, for every organizer.
--
-- Root cause: 20260821000009_event_invite_fanout.sql defined
-- private.can_receive_invite_to_event(event_id, user_id) and granted it to
-- `authenticated` — correct for the RLS policy that calls it internally,
-- but the client-side action (event-invites-actions.ts:147) calls it via
-- `supabase.rpc("can_receive_invite_to_event", ...)`, which goes through
-- PostgREST's Data API. The `private` schema is never exposed there by
-- design (AGENTS.md: "private schema is never exposed via Data API") — the
-- call always fails with "function not found in schema cache", the action
-- discards the error and treats a null result as "not eligible", and the
-- invite list silently stays empty forever. Verified directly: the
-- function did not exist under any name PostgREST could resolve.
--
-- Fix: the same public-wrapper pattern already used everywhere else in
-- this schema (e.g. public.is_current_user_community_moderator wrapping
-- private.is_community_moderator) — a thin public function with the exact
-- name the client already calls, delegating to the real check. Granted to
-- service_role only: event-invites-actions.ts's listInvitableMembersAction
-- runs server-side with the service_role client, same as every other
-- action in that file.

create function public.can_receive_invite_to_event(
  p_event_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_receive_invite_to_event(p_event_id, p_user_id);
$$;

revoke all on function public.can_receive_invite_to_event(uuid, uuid) from public;
revoke all on function public.can_receive_invite_to_event(uuid, uuid) from anon;
revoke all on function public.can_receive_invite_to_event(uuid, uuid) from authenticated;
grant execute on function public.can_receive_invite_to_event(uuid, uuid) to service_role;
