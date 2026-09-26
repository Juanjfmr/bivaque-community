-- D2 Task 9 — the two consoles of administration (founder and community
-- owner). The founder console already exists at (admin)/ and the gate is
-- already applied by is_current_user_operator() in the shell. This migration
-- adds the public helper the community-owner console needs: a stable,
-- service-role-only check that takes an explicit user id (the shell runs as
-- service_role and authenticates the caller from the session).
--
-- Rule 6 of §12: the helper and the policies that read it land in the same
-- migration. The policies that gate approve_community_member, remove, add
-- moderator and transfer_ownership already read private.is_community_moderator
-- internally; the new public wrapper is the single shape the app uses to
-- ask "is this user a moderator of this community right now?".

create function public.is_current_user_community_moderator(
  p_community_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = p_user_id
      and status = 'approved'
      and role in ('moderator', 'owner')
  );
$$;

revoke all on function public.is_current_user_community_moderator(uuid, uuid) from public;
revoke all on function public.is_current_user_community_moderator(uuid, uuid) from anon;
revoke all on function public.is_current_user_community_moderator(uuid, uuid) from authenticated;
grant execute on function public.is_current_user_community_moderator(uuid, uuid) to service_role;
