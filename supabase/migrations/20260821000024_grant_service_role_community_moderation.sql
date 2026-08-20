-- Found investigating the community batch-approval checkbox: after fixing
-- the checkbox's own click-target-miss bug (a layout issue, not this
-- grant), the batch-approve submission finally reached the server and hit
-- "permission denied for function approve_community_member". Same recurring
-- gap as the event-invite and profile RPCs earlier this session:
-- apps/web/app/(owner)/communities/actions.ts calls every one of these
-- through service_role (createServiceClient()), but all four were only
-- ever granted execute to authenticated. None of the community moderation
-- actions — approve, remove, promote, demote — could ever have worked.

grant execute on function public.approve_community_member(uuid, uuid) to service_role;
grant execute on function public.remove_community_member(uuid, uuid) to service_role;
grant execute on function public.add_community_moderator(uuid, uuid) to service_role;
grant execute on function public.remove_community_moderator(uuid, uuid) to service_role;
