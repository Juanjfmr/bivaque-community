-- 018: close the group-scope leak on the post surface
--
-- Migration 017 fixed this bug class for events ("the 012 policy exposed
-- group-scoped events to every locality member, including non-members of
-- private groups") but the post surface was left open. The 009 policy even
-- carried the note "or group if group-scoped in future" — that future never
-- landed. Two distinct holes are closed here:
--
--   1. Group scope. posts / comments / post_reactions / post_saves policies
--      gate only on private.is_locality_member(locality_id) and ignore
--      posts.group_id, so any Manaus member could read (and write) content
--      belonging to a PRIVATE group they are not a member of.
--
--   2. feed_posts() authorization. The function is security definer, takes
--      p_locality_id as an argument, is granted to `authenticated`, and never
--      checks membership at all — so ANY authenticated user (including one
--      with no locality membership and no verification) could enumerate the
--      whole locality feed by calling it directly, bypassing RLS entirely.
--
-- Access rule established here — a post is in scope when the caller is a
-- member of the post's locality AND the post is either locality-wide
-- (group_id is null), inside a public group, or inside a private group the
-- caller has APPROVED membership in (pending requests do not qualify).
--
-- Read and write share the same gate on purpose: this keeps public-group and
-- locality-wide behaviour identical to today and changes only what was
-- leaking. Tightening writes further (e.g. requiring membership to comment on
-- a public group) is a product decision, not a security fix, and is
-- deliberately left out of scope.
--
-- All functions use set search_path = '' to prevent search-path injection.

-- ── Scope helpers ────────────────────────────────────────────────────────────

-- Column-level variant: for policies on public.posts, which already carry
-- locality_id and group_id on the row being checked.
create function private.can_access_post_scope(
  p_locality_id uuid,
  p_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_locality_member(p_locality_id)
    and (
      p_group_id is null
      or private.is_group_member(p_group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.visibility = 'public'
      )
    );
$$;

revoke all on function private.can_access_post_scope(uuid, uuid) from public;
revoke all on function private.can_access_post_scope(uuid, uuid) from anon;
revoke all on function private.can_access_post_scope(uuid, uuid) from authenticated;

grant execute on function private.can_access_post_scope(uuid, uuid) to authenticated;

-- Post-id variant: for policies on child tables (comments, reactions, saves)
-- that reference a post rather than carrying its scope columns.
create function private.can_access_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and private.can_access_post_scope(p.locality_id, p.group_id)
  );
$$;

revoke all on function private.can_access_post(uuid) from public;
revoke all on function private.can_access_post(uuid) from anon;
revoke all on function private.can_access_post(uuid) from authenticated;

grant execute on function private.can_access_post(uuid) to authenticated;

-- ── posts ────────────────────────────────────────────────────────────────────

drop policy posts_select_locality_member on public.posts;

create policy posts_select_locality_member
on public.posts
for select
to authenticated
using (
  private.can_access_post_scope(locality_id, group_id)
);

drop policy posts_insert_locality_member on public.posts;

create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post_scope(locality_id, group_id)
);

-- UPDATE / DELETE policies stay author-scoped and are unchanged: an author is
-- necessarily inside the scope of their own post.

-- ── comments ─────────────────────────────────────────────────────────────────

drop policy comments_select_via_post on public.comments;

create policy comments_select_via_post
on public.comments
for select
to authenticated
using (
  private.can_access_post(post_id)
);

drop policy comments_insert_member on public.comments;

create policy comments_insert_member
on public.comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

-- ── post_reactions ───────────────────────────────────────────────────────────

drop policy post_reactions_select_locality_member on public.post_reactions;

create policy post_reactions_select_locality_member
on public.post_reactions
for select
to authenticated
using (
  private.can_access_post(post_id)
);

drop policy post_reactions_insert_locality_member on public.post_reactions;

create policy post_reactions_insert_locality_member
on public.post_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

-- ── post_saves ───────────────────────────────────────────────────────────────

-- SELECT / DELETE are already own-row only and need no scope gate.

drop policy post_saves_insert_own on public.post_saves;

create policy post_saves_insert_own
on public.post_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

-- ── feed_posts: enforce membership and group scope inside the RPC ────────────

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
  select
    p.id,
    p.locality_id,
    p.user_id,
    p.group_id,
    p.post_type,
    p.content,
    p.photo_path,
    p.link_url,
    p.poll_options,
    p.created_at,
    coalesce(c_counts.cnt, 0) as comment_count,
    coalesce(r_counts.cnt, 0) as reaction_count,
    coalesce(my_r.has_reacted, false) as my_reaction,
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt
    from public.comments c
    where c.post_id = p.id
      and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt
    from public.post_reactions r
    where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted
    from public.post_reactions r2
    where r2.post_id = p.id
      and r2.user_id = (select auth.uid())
    limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id
   and pr.locality_id = p.locality_id
  where p.locality_id = p_locality_id
    and p.is_deleted = false
    and private.can_access_post_scope(p.locality_id, p.group_id)
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;

grant execute on function public.feed_posts(uuid, text) to authenticated;
