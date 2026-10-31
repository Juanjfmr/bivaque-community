-- 009: Community feed — posts and comments core
-- Locality-scoped posts (text, photo, link, poll) and threaded comments.
-- group_id is nullable for future group-scoped posts (todo 13).
-- Forbidden content types (anonymous, video, marketplace, AI-generated,
-- public verification labels, OM/rank/address) are blocked at the schema level.
-- All functions use set search_path = '' to prevent search-path injection.

-- ── post type enum ─────────────────────────────────────────────────────────

create type public.post_type as enum (
  'text',
  'photo',
  'link',
  'poll'
);

-- ── posts table ────────────────────────────────────────────────────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  locality_id uuid not null references public.localities (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid,
  post_type public.post_type not null,
  content text not null check (char_length(content) between 1 and 2000),
  photo_path text,
  link_url text check (
    link_url is null
    or link_url ~ '^https?://[^\s/$.?#].[^\s]*$'
  ),
  poll_options jsonb,
  created_at timestamptz not null default now(),
  -- structural integrity: only the matching post type may carry its payload
  constraint post_photo_requires_photo_type
    check (photo_path is null or post_type = 'photo'),
  constraint post_link_requires_link_type
    check (link_url is null or post_type = 'link'),
  constraint post_poll_requires_poll_type
    check (poll_options is null or post_type = 'poll'),
  -- forbidden content guards: do not persist prohibited content types/terms
  constraint post_no_forbidden_terms
    check (
      content !~* '\m(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|OM\b|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|CEP\b|CPF\b)\M'
    ),
  -- link_url must be present for link posts
  constraint post_link_type_requires_url
    check (post_type <> 'link' or link_url is not null)
);

create index posts_locality_created_idx
  on public.posts (locality_id, created_at desc);

create index posts_user_id_idx
  on public.posts (user_id);

-- ── comments table ─────────────────────────────────────────────────────────

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  -- same forbidden-content guard as posts
  constraint comment_no_forbidden_terms
    check (
      content !~* '\m(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|OM\b|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|CEP\b|CPF\b)\M'
    )
);

create index comments_post_id_created_idx
  on public.comments (post_id, created_at asc);

create index comments_user_id_idx
  on public.comments (user_id);

-- ── RLS enable + force ─────────────────────────────────────────────────────

alter table public.posts enable row level security;
alter table public.posts force row level security;
alter table public.comments enable row level security;
alter table public.comments force row level security;

-- ── minimal grants ─────────────────────────────────────────────────────────

revoke all on table public.posts from anon, authenticated;
revoke all on table public.comments from anon, authenticated;

grant select, insert on table public.posts to authenticated;
grant select, insert on table public.comments to authenticated;

-- Only the author may update or delete their own posts/comments.
grant update, delete on table public.posts to authenticated;
grant update, delete on table public.comments to authenticated;

-- ── feed helper: deterministic ranking (relevance then recency) ────────────

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
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt
    from public.comments c
    where c.post_id = p.id
  ) c_counts on true
  left join public.profiles pr
    on pr.user_id = p.user_id
   and pr.locality_id = p.locality_id
  where p.locality_id = p_locality_id
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;

grant execute on function public.feed_posts(uuid, text) to authenticated;

-- ── RLS policies: posts ────────────────────────────────────────────────────

-- SELECT: member of the post's locality (or group if group-scoped in future)
create policy posts_select_locality_member
on public.posts
for select
to authenticated
using (
  private.is_locality_member(locality_id)
);

-- INSERT: must be a member of the locality, and the post is authored by self
create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_locality_member(locality_id)
);

-- UPDATE: own posts only
create policy posts_update_own
on public.posts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- DELETE: own posts only
create policy posts_delete_own
on public.posts
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ── RLS policies: comments ─────────────────────────────────────────────────

-- SELECT: member of the post's locality
create policy comments_select_via_post
on public.comments
for select
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and private.is_locality_member(p.locality_id)
  )
);

-- INSERT: author is self and is a member of the post's locality
create policy comments_insert_member
on public.comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and private.is_locality_member(p.locality_id)
  )
);

-- UPDATE: own comments only
create policy comments_update_own
on public.comments
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- DELETE: own comments only
create policy comments_delete_own
on public.comments
for delete
to authenticated
using (user_id = (select auth.uid()));
