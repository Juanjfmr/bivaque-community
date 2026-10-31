-- 027: Other-member profile RPCs (Wave E Task 7 Step 1).
--
-- The existing profile/page.tsx called feed_posts(PILOT_LOCALITY_ID) and
-- returned the city feed labeled as the user's history — a cross-user leak.
-- The correct shape: posts the TARGET user posted, filtered to what the
-- VIEWER can see. The check lives in the RPC, not the UI: if the query
-- returns a row, the row is already authorized.

-- Two functions:
--   profile_posts_for(p_target_user_id) — target user's posts visible to
--     the viewer. Visibility rules (same as feed_community):
--       - community_id IS NOT NULL AND viewer is approved in that community
--       - community_id IS NULL AND group_id IS NULL AND post.locality_id =
--         viewer's locality (city-reach posts visible locality-wide)
--       - group_id IS NOT NULL AND viewer is approved in that group
--   profile_events_for(p_target_user_id) — events organized by the target
--     user, in the viewer's locality.

create function public.profile_posts_for(p_target_user_id uuid)
returns table (
  id uuid,
  locality_id uuid,
  community_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.locality_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at
  from public.posts p
  where p.user_id = p_target_user_id
    and p.is_deleted = false
    and (
      -- City-reach post: visible if it is in the viewer's locality.
      (p.community_id is null and p.group_id is null
       and exists (
         select 1 from public.locality_memberships lm
         where lm.locality_id = p.locality_id
           and lm.user_id = (select auth.uid())
       ))
      or
      -- Community post: visible if the viewer is approved in that community.
      (p.community_id is not null
       and exists (
         select 1 from public.community_memberships cm
         where cm.community_id = p.community_id
           and cm.user_id = (select auth.uid())
           and cm.status = 'approved'
       ))
      or
      -- Group post: visible if the viewer is approved in that group.
      (p.group_id is not null
       and exists (
         select 1 from public.group_memberships gm
         where gm.group_id = p.group_id
           and gm.user_id = (select auth.uid())
           and gm.status = 'approved'
       ))
    )
  order by p.created_at desc
  limit 50;
$$;

revoke all on function public.profile_posts_for(uuid) from public;
revoke all on function public.profile_posts_for(uuid) from anon;
revoke all on function public.profile_posts_for(uuid) from authenticated;
grant execute on function public.profile_posts_for(uuid) to authenticated;

-- profile_events_for: events organized by p_target_user_id, filtered to the
-- viewer's locality (or to events where the viewer is approved in the
-- event's community, if any). We scope to the viewer's locality for the
-- cross-locality denials (Step 4 of the plan).
create function public.profile_events_for(p_target_user_id uuid)
returns table (
  id uuid,
  title text,
  starts_at timestamptz,
  locality_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.starts_at, e.locality_id
  from public.events e
  where e.organizer_id = p_target_user_id
    and e.status = 'upcoming'
    and exists (
      select 1 from public.locality_memberships lm
      where lm.locality_id = e.locality_id
        and lm.user_id = (select auth.uid())
    )
  order by e.starts_at asc
  limit 20;
$$;

revoke all on function public.profile_events_for(uuid) from public;
revoke all on function public.profile_events_for(uuid) from anon;
revoke all on function public.profile_events_for(uuid) from authenticated;
grant execute on function public.profile_events_for(uuid) to authenticated;

-- profile_is_visible_to_viewer: returns true iff the viewer can see the
-- target's profile (their locality membership overlaps). Used by the
-- /profile/[userId] page to decide between render and notFound().
create function public.profile_is_visible_to_viewer(p_target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locality_memberships lm_target
    where lm_target.user_id = p_target_user_id
      and exists (
        select 1 from public.locality_memberships lm_viewer
        where lm_viewer.locality_id = lm_target.locality_id
          and lm_viewer.user_id = (select auth.uid())
      )
  );
$$;

revoke all on function public.profile_is_visible_to_viewer(uuid) from public;
revoke all on function public.profile_is_visible_to_viewer(uuid) from anon;
revoke all on function public.profile_is_visible_to_viewer(uuid) from authenticated;
grant execute on function public.profile_is_visible_to_viewer(uuid) to authenticated;