-- post_reactions: lightweight reaction support for feed posts
-- A member of the post's locality (or group) can react once per post.
-- All functions use set search_path = '' to prevent search-path injection.

-- ── post_reactions table ────────────────────────────────────────────────────

create table public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create index post_reactions_post_id_idx
  on public.post_reactions (post_id);

create index post_reactions_user_id_idx
  on public.post_reactions (user_id);

-- ── RLS enable + force ───────────────────────────────────────────────────────

alter table public.post_reactions enable row level security;
alter table public.post_reactions force row level security;

-- ── minimal grants ───────────────────────────────────────────────────────────

revoke all on table public.post_reactions from anon, authenticated;

grant select, insert, delete on table public.post_reactions to authenticated;

-- ── RLS policies ─────────────────────────────────────────────────────────────

-- SELECT: can see reactions on posts the caller is a locality member of
create policy post_reactions_select_locality_member
on public.post_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and private.is_locality_member(p.locality_id)
  )
);

-- INSERT: must be a member of the post's locality, and reaction is authored by self
create policy post_reactions_insert_locality_member
on public.post_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and private.is_locality_member(p.locality_id)
  )
);

-- DELETE: own reactions only
create policy post_reactions_delete_own
on public.post_reactions
for delete
to authenticated
using (
  user_id = (select auth.uid())
);

-- ── updated feed_posts with reaction_count + my_reaction ─────────────────────

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
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;

grant execute on function public.feed_posts(uuid, text) to authenticated;
