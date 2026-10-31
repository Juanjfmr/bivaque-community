-- Found investigating the community batch-approval checkbox (globals.css,
-- 8888f7f, and the pending-page layout fix in the same commit as this
-- migration): after fixing the checkbox itself and the missing
-- service_role grants (20260821000024), the batch approve action still
-- failed — "only moderators can approve members" for the community's own
-- owner. Root cause: private.is_community_moderator(p_community_id) reads
-- the caller's identity from `(select auth.uid())`, which is NULL for
-- service_role (no JWT) — the same shape of bug as the profile RPCs
-- (20260821000023) and the event-invite RPCs, but here it sat *inside*
-- four SECURITY DEFINER functions (approve_community_member,
-- remove_community_member, add_community_moderator,
-- remove_community_moderator) that always deny every caller. None of the
-- four has ever worked when called the way this app actually calls them.
--
-- Fix: each function gains an explicit p_caller_user_id parameter, same
-- pattern as public.is_current_user_community_moderator(p_community_id,
-- p_user_id) — which already exists, already correct, and is what these
-- four should have delegated to from the start instead of duplicating the
-- check via the broken private.is_community_moderator.

create or replace function public.approve_community_member(
  p_community_id uuid,
  p_user_id uuid,
  p_caller_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_current_user_community_moderator(p_community_id, p_caller_user_id) then
    raise exception 'only moderators can approve members';
  end if;

  update public.community_memberships
  set status = 'approved'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'pending';
end;
$function$;

create or replace function public.remove_community_member(
  p_community_id uuid,
  p_user_id uuid,
  p_caller_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_current_user_community_moderator(p_community_id, p_caller_user_id) then
    raise exception 'only moderators can remove members';
  end if;

  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = p_user_id;
end;
$function$;

create or replace function public.add_community_moderator(
  p_community_id uuid,
  p_user_id uuid,
  p_caller_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = p_caller_user_id
  ) then
    raise exception 'only the owner can add moderators';
  end if;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'approved'
    and role = 'member';
end;
$function$;

create or replace function public.remove_community_moderator(
  p_community_id uuid,
  p_user_id uuid,
  p_caller_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = p_caller_user_id
  ) then
    raise exception 'only the owner can remove moderators';
  end if;

  update public.community_memberships
  set role = 'member'
  where community_id = p_community_id
    and user_id = p_user_id
    and role = 'moderator';
end;
$function$;

-- Old three-arg-missing overloads: drop, do not leave a working-by-accident
-- auth.uid() path lying around for a future service_role caller to trip on.
drop function if exists public.approve_community_member(uuid, uuid);
drop function if exists public.remove_community_member(uuid, uuid);
drop function if exists public.add_community_moderator(uuid, uuid);
drop function if exists public.remove_community_moderator(uuid, uuid);
drop function if exists private.is_community_moderator(uuid);

revoke all on function public.approve_community_member(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_community_member(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_community_moderator(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_community_moderator(uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.approve_community_member(uuid, uuid, uuid) to service_role;
grant execute on function public.remove_community_member(uuid, uuid, uuid) to service_role;
grant execute on function public.add_community_moderator(uuid, uuid, uuid) to service_role;
grant execute on function public.remove_community_moderator(uuid, uuid, uuid) to service_role;
