-- Found running the E2E realignment (member-profile-denials.spec.ts):
-- apps/web/app/(shell)/profile/[userId]/page.tsx calls profile_is_visible_to_viewer,
-- profile_posts_for and profile_events_for through the service_role client
-- (createServiceClient()), the same way event-invites-actions.ts calls
-- list_invitable_members_for_event (fixed in 20260821000019/20/21). None of
-- the three were granted execute to service_role in 20260821000005 — only to
-- authenticated, which nothing here ever calls as. Every visit to another
-- member's profile page threw "permission denied for function
-- profile_is_visible_to_viewer" server-side.

grant execute on function public.profile_is_visible_to_viewer(uuid) to service_role;
grant execute on function public.profile_posts_for(uuid) to service_role;
grant execute on function public.profile_events_for(uuid) to service_role;
