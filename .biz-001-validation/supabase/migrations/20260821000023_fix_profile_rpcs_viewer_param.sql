-- Found running the E2E realignment (member-profile-denials.spec.ts):
-- 20260821000022 granted service_role execute on the three profile RPCs
-- from 20260821000005, which fixed the "permission denied" error but
-- exposed the real bug underneath. All three read the viewer's identity
-- from `(select auth.uid())` internally — correct only when called by the
-- `authenticated` role with the caller's own JWT. The app
-- (apps/web/app/(shell)/profile/[userId]/page.tsx) calls them through
-- service_role, which carries no JWT, so auth.uid() was always NULL: every
-- membership-overlap check silently evaluated false, and every other
-- member's profile appeared not-visible / empty regardless of viewer. The
-- pgTAP suite never caught this because it (correctly, for what it tests)
-- calls these functions as `authenticated` with `set_config('request.jwt.
-- claim.sub', ...)`, not as service_role — the same shape of gap as the
-- event-invite RPCs (20260821000019/21).
--
-- Fix: an explicit p_viewer_user_id parameter, same pattern as
-- list_invitable_members_for_event(p_event_id, p_user_id). The caller
-- supplies the viewer's id (the page already reads it from
-- authClient.auth.getUser()); the function no longer needs a JWT.
--
-- apps/web/app/(shell)/profile/page.tsx (the SELF-profile page, distinct
-- from [userId]/page.tsx) calls profile_posts_for/profile_events_for
-- directly from the browser client (`authenticated`, real JWT) with
-- target = viewer = the caller's own id — an explicit parameter alone
-- would let any authenticated caller pass an arbitrary p_viewer_user_id
-- and see content scoped to someone else's memberships. Each function
-- guards against that: when called as `authenticated` (auth.uid() is not
-- null), the parameter must match the caller's own id; service_role calls
-- (auth.uid() is null — no JWT) are trusted, the same as every other
-- service_role-only RPC in this schema.

create or replace function public.profile_is_visible_to_viewer(
  p_target_user_id uuid,
  p_viewer_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  return exists (
    select 1
    from public.locality_memberships lm_target
    where lm_target.user_id = p_target_user_id
      and exists (
        select 1 from public.locality_memberships lm_viewer
        where lm_viewer.locality_id = lm_target.locality_id
          and lm_viewer.user_id = p_viewer_user_id
      )
  );
end;
$function$;

create or replace function public.profile_posts_for(
  p_target_user_id uuid,
  p_viewer_user_id uuid
)
returns table (
  id uuid, locality_id uuid, community_id uuid, group_id uuid,
  post_type post_type, content text, photo_path text, link_url text,
  poll_options jsonb, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  return query
  select
    p.id, p.locality_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at
  from public.posts p
  where p.user_id = p_target_user_id
    and p.is_deleted = false
    and (
      (p.community_id is null and p.group_id is null
       and exists (
         select 1 from public.locality_memberships lm
         where lm.locality_id = p.locality_id
           and lm.user_id = p_viewer_user_id
       ))
      or
      (p.community_id is not null
       and exists (
         select 1 from public.community_memberships cm
         where cm.community_id = p.community_id
           and cm.user_id = p_viewer_user_id
           and cm.status = 'approved'
       ))
      or
      (p.group_id is not null
       and exists (
         select 1 from public.group_memberships gm
         where gm.group_id = p.group_id
           and gm.user_id = p_viewer_user_id
           and gm.status = 'approved'
       ))
    )
  order by p.created_at desc
  limit 50;
end;
$function$;

create or replace function public.profile_events_for(
  p_target_user_id uuid,
  p_viewer_user_id uuid
)
returns table (id uuid, title text, starts_at timestamptz, locality_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  return query
  select e.id, e.title, e.starts_at, e.locality_id
  from public.events e
  where e.organizer_id = p_target_user_id
    and e.status = 'upcoming'
    and exists (
      select 1 from public.locality_memberships lm
      where lm.locality_id = e.locality_id
        and lm.user_id = p_viewer_user_id
    )
  order by e.starts_at asc
  limit 20;
end;
$function$;

-- Drop the old single-arg overloads: nothing may keep calling them (the
-- page.tsx call sites are updated in the same commit), and leaving a
-- broken auth.uid()-based overload around invites the same bug again.
drop function if exists public.profile_is_visible_to_viewer(uuid);
drop function if exists public.profile_posts_for(uuid);
drop function if exists public.profile_events_for(uuid);

revoke all on function public.profile_is_visible_to_viewer(uuid, uuid) from public, anon;
revoke all on function public.profile_posts_for(uuid, uuid) from public, anon;
revoke all on function public.profile_events_for(uuid, uuid) from public, anon;

-- Both roles: service_role for the other-member page ([userId]/page.tsx,
-- explicit viewer id, no JWT), authenticated for the self-profile page
-- (profile/page.tsx, real JWT, target = viewer = caller — enforced by the
-- guard above).
grant execute on function public.profile_is_visible_to_viewer(uuid, uuid) to service_role, authenticated;
grant execute on function public.profile_posts_for(uuid, uuid) to service_role, authenticated;
grant execute on function public.profile_events_for(uuid, uuid) to service_role, authenticated;
