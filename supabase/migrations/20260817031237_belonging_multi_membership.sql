-- P0 Task 3: the base of belonging — two primary keys.
--
-- Executes the schema base of ADR-20260816-transferencia-e-pertencimento:
-- a person has one profile, and belonging stops being exclusive. This is the
-- only irreversible part of the roadmap (PK changes after real users exist,
-- with no staging per D42), so it lands now, before the first member. The
-- transfer wave (deadline, reminder, degradation, selector) builds on this
-- base and is NOT built here.
--
-- Terminology guardrail (ADR national-localities):
--   * multi-locality of the PLATFORM: already the model; this removes the
--     coupling that blocked its use;
--   * current locality of a USER: one current + at most one leaving link —
--     the P0 delivers only the schema base of that;
--   * unlimited simultaneous multi-locality: NOT built here.

-- ── 1. locality_memberships accepts more than one row per user ──────────────
-- The PK becomes (user_id, locality_id). The unique (user_id, locality_id)
-- that lived beside the PK did nothing while user_id was PK — it is exactly
-- the key this step promotes, so the redundancy goes away with the promotion.
-- private.is_locality_member (20260802000300) is a set-membership test and
-- already works with N rows: it does not change one line.

-- ── 2. profiles loses the locality — the scope is bigger than a column ──────
-- One profile per person. locality_id leaves public.profiles together with
-- the composite FK to locality_memberships (user_id, locality_id) and the
-- profiles_locality_visibility_idx index.

-- 2a. The three policies that read locality_id from profiles must be dropped
-- before the column (Postgres refuses to alter a column a policy depends on).
-- They are recreated below with the new semantics.
drop policy if exists profiles_select_visible_in_locality on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

-- 2b. Drop the composite FK FIRST: it references the unique constraint
-- (user_id, locality_id) on locality_memberships, and dropping that
-- constraint below fails while the FK still depends on it. Then the index,
-- then the column.
alter table public.profiles
  drop constraint profiles_user_id_locality_id_fkey;

drop index if exists profiles_locality_visibility_idx;

alter table public.profiles
  drop column locality_id;

-- ── 1. locality_memberships accepts more than one row per user ──────────────
-- The PK becomes (user_id, locality_id). The unique (user_id, locality_id)
-- that lived beside the PK did nothing while user_id was PK — it is exactly
-- the key this step promotes, so the redundancy goes away with the promotion.
-- private.is_locality_member (20260802000300) is a set-membership test and
-- already works with N rows: it does not change one line.

alter table public.locality_memberships
  drop constraint locality_memberships_pkey;

alter table public.locality_memberships
  drop constraint locality_memberships_user_id_locality_id_key;

alter table public.locality_memberships
  add primary key (user_id, locality_id);

-- ── 3. "who can see my profile" becomes computed ────────────────────────────
-- profiles_select_visible_in_locality stops comparing a column and asks
-- whether the viewer shares ANY locality with the profile owner, through the
-- memberships. More correct than before — and the point where a bug becomes
-- a cross-city leak, so the negative test matters (member of Manaus must NOT
-- see a profile of a member who is only in Rio).
--
-- The helper is security definer for the same reason is_locality_member is:
-- inside the policy, a plain read of locality_memberships would be filtered
-- by locality_memberships_select_self (user_id = auth.uid()), and "theirs"
-- would only ever see the viewer's own rows — making the shared check
-- silently return false for everyone but the viewer themselves.

create function private.shares_locality_with(p_target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locality_memberships mine
    where mine.user_id = (select auth.uid())
      and exists (
        select 1
        from public.locality_memberships theirs
        where theirs.user_id = p_target_user_id
          and theirs.locality_id = mine.locality_id
      )
  );
$$;

revoke all on function private.shares_locality_with(uuid) from public;
revoke all on function private.shares_locality_with(uuid) from anon;
revoke all on function private.shares_locality_with(uuid) from authenticated;
grant execute on function private.shares_locality_with(uuid) to authenticated;

create policy profiles_select_visible_in_locality
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.shares_locality_with(user_id)
);

-- Insert and update are self-scoped only: the locality lives in the
-- membership, not in the profile, so there is no locality to assert here.
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ── 4. the nine joins pr.locality_id = p.locality_id become user_id-only ───
-- The last surviving definitions of the feed functions live in
-- 20260805215020_community_feeds.sql. They are recreated here with
-- drop + create (create or replace with returns table fails when any output
-- column name differs) and the revoke/grant is repeated — recreating drops
-- privileges, and forgetting it leaves authenticated without execute and the
-- whole feed blank.

drop function if exists public.feed_posts(uuid, text);
drop function if exists public.feed_community(uuid, text);
drop function if exists public.feed_group(uuid, text);

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
    on pr.user_id = p.user_id
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
    on pr.user_id = p.user_id
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
    on pr.user_id = p.user_id
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
