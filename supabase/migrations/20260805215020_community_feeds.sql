-- 021: Set-based feed functions.
-- The scope helper is the right shape inside RLS, where there is no
-- alternative, but wrong inside a feed RPC: it is a function call with
-- subqueries per row. These resolve the caller's memberships once and join.
-- feed_posts is converted to the same shape.

drop function if exists public.feed_posts(uuid, text);

create function public.feed_posts(
  p_locality_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with am_member as (
    select 1
    from public.locality_memberships
    where user_id = (select auth.uid())
      and locality_id = p_locality_id
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.locality_id = p_locality_id
      and g.community_id is null
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where exists (select 1 from am_member)
    and p.locality_id = p_locality_id
    and p.is_deleted = false
    and p.community_id is null
    and (p.group_id is null or p.group_id in (select id from visible_groups))
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;
grant execute on function public.feed_posts(uuid, text) to authenticated;

create function public.feed_community(
  p_community_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  community_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with am_member as (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.community_id = p_community_id
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where exists (select 1 from am_member)
    and p.is_deleted = false
    and (
      p.community_id = p_community_id
      or p.group_id in (select id from visible_groups)
    )
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_community(uuid, text) from public;
revoke all on function public.feed_community(uuid, text) from anon;
revoke all on function public.feed_community(uuid, text) from authenticated;
grant execute on function public.feed_community(uuid, text) to authenticated;

create function public.feed_group(
  p_group_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with can_see as (
    select 1
    from public.groups g
    where g.id = p_group_id
      and private.is_locality_member(g.locality_id)
      and (g.community_id is null or private.is_community_member(g.community_id))
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where exists (select 1 from can_see)
    and p.group_id = p_group_id
    and p.is_deleted = false
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_group(uuid, text) from public;
revoke all on function public.feed_group(uuid, text) from anon;
revoke all on function public.feed_group(uuid, text) from authenticated;
grant execute on function public.feed_group(uuid, text) to authenticated;
