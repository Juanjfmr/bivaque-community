-- Found investigating community-invitations.spec.ts (part of the same
-- checkbox/moderation investigation as 20260821000024/25): the "Gerar link
-- de convite" button never appeared for anyone, in any community, ever.
-- apps/web/lib/community-invite-rpcs.ts and the invite section
-- (community-invite-actions.ts) call `is_community_member(p_community_id)`
-- through service_role — but this function was never actually created.
-- Every migration since 20260821000002 (community_invitations) assumed it
-- existed; grepping every migration confirms it does not. `getCommunityInviteDataAction`'s
-- own error handling swallowed the "function does not exist" error the same
-- way every other silently-failed RPC call this session did, so
-- `isMember` was always false and the button never rendered.

create function public.is_community_member(
  p_community_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = p_user_id
      and status = 'approved'
  );
$function$;

revoke all on function public.is_community_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_community_member(uuid, uuid) to service_role;
