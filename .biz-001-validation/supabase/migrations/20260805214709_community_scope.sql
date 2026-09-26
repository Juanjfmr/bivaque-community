-- 020: Community scope on the content surface. ATOMIC BY DESIGN.
-- The scope column and every policy that reads it land in the same migration.
-- posts.group_id shipped in 009 with a policy comment promising group scoping
-- "in future"; that future arrived nine migrations later as a P0 leak (018).
-- Not repeating it.
--
-- Access rule — "public" is relative to the container:
--   group without community + public  -> locality members
--   group without community + private -> group members
--   group in community C   + public   -> members of C
--   group in community C   + private  -> group members
--
-- Scope is exclusive (group_id XOR community_id) and inherited transitively:
-- membership in a group inside a community requires approved community
-- membership, so is_group_member already implies community membership.

alter table public.groups
  add column community_id uuid references public.communities (id) on delete restrict;

alter table public.groups
  add constraint groups_community_same_locality
  foreign key (community_id, locality_id)
  references public.communities (id, locality_id);

alter table public.posts
  add column community_id uuid references public.communities (id) on delete restrict;

alter table public.posts
  add constraint posts_community_same_locality
  foreign key (community_id, locality_id)
  references public.communities (id, locality_id);

alter table public.posts
  add constraint posts_single_scope
  check (num_nonnulls(group_id, community_id) <= 1);

alter table public.events
  add column community_id uuid references public.communities (id) on delete restrict;

alter table public.events
  add constraint events_community_same_locality
  foreign key (community_id, locality_id)
  references public.communities (id, locality_id);

alter table public.events
  add constraint events_single_scope
  check (num_nonnulls(group_id, community_id) <= 1);

create index groups_community_idx on public.groups (community_id);
create index posts_community_idx on public.posts (community_id, created_at desc);
create index events_community_idx on public.events (community_id);

-- ── D8: groups.community_id is immutable for every role ──────────────────────
-- Unlike block_authenticated_soft_delete in 016, service_role gets no escape
-- hatch: moving a group without reconciling memberships produces exactly the
-- leak this rule prevents. An escape hatch that produces the bug is not a hatch.

create function private.block_group_community_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'groups.community_id is immutable';
end;
$$;

create trigger block_group_community_change_trigger
before update of community_id on public.groups
for each row
when (new.community_id is distinct from old.community_id)
execute function private.block_group_community_change();

-- ── I3: group membership inside a community requires community membership ────

create function private.enforce_group_community_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_community_id uuid;
begin
  select community_id into v_community_id
  from public.groups
  where id = new.group_id;

  if v_community_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.community_memberships
    where community_id = v_community_id
      and user_id = new.user_id
      and status = 'approved'
  ) then
    raise exception 'group belongs to a community the user is not an approved member of';
  end if;

  return new;
end;
$$;

create trigger enforce_group_community_membership_trigger
before insert or update on public.group_memberships
for each row
execute function private.enforce_group_community_membership();

-- ── D7: leaving a community cascades out of its groups ───────────────────────
-- Groups the leaver owned transfer to the community owner, who is NOT NULL and
-- therefore always exists. Removal never fails: a rule that blocks removal
-- would turn group ownership into a shield against expulsion.

create function private.cascade_community_membership_loss()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_user_id uuid;
begin
  select owner_user_id into v_owner_user_id
  from public.communities
  where id = old.community_id;

  if old.user_id = v_owner_user_id then
    raise exception 'transfer community ownership before removing the owner';
  end if;

  update public.groups g
  set owner_user_id = v_owner_user_id
  where g.community_id = old.community_id
    and g.owner_user_id = old.user_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  select g.id, v_owner_user_id, 'owner', 'approved'
  from public.groups g
  where g.community_id = old.community_id
    and g.owner_user_id = v_owner_user_id
  on conflict (group_id, user_id)
  do update set role = 'owner', status = 'approved';

  delete from public.group_memberships gm
  using public.groups g
  where gm.group_id = g.id
    and g.community_id = old.community_id
    and gm.user_id = old.user_id;

  return old;
end;
$$;

create trigger cascade_community_membership_loss_trigger
after delete on public.community_memberships
for each row
execute function private.cascade_community_membership_loss();

create function private.cascade_community_membership_downgrade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.group_memberships gm
  using public.groups g
  where gm.group_id = g.id
    and g.community_id = new.community_id
    and gm.user_id = new.user_id;

  return new;
end;
$$;

create trigger cascade_community_membership_downgrade_trigger
after update of status on public.community_memberships
for each row
when (old.status = 'approved' and new.status <> 'approved')
execute function private.cascade_community_membership_downgrade();

-- ── Scope helper v2 ──────────────────────────────────────────────────────────
-- ORDER MATTERS. RLS policies create a hard dependency on the functions they
-- call, so DROP FUNCTION fails with "other objects depend on it" while any
-- policy still references it. Every dependent policy comes down first, then
-- the helpers, then everything is recreated. Do not reorder these blocks.

drop policy posts_select_locality_member on public.posts;
drop policy posts_insert_locality_member on public.posts;
drop policy comments_select_via_post on public.comments;
drop policy comments_insert_member on public.comments;
drop policy post_reactions_select_locality_member on public.post_reactions;
drop policy post_reactions_insert_locality_member on public.post_reactions;
drop policy post_saves_insert_own on public.post_saves;
drop function if exists public.feed_posts(uuid, text);

drop function private.can_access_post(uuid);
drop function private.can_access_post_scope(uuid, uuid);

create function private.can_access_post_scope(
  p_locality_id uuid,
  p_community_id uuid,
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
      p_community_id is null
      or private.is_community_member(p_community_id)
    )
    and (
      p_group_id is null
      or private.is_group_member(p_group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.visibility = 'public'
          and (
            g.community_id is null
            or private.is_community_member(g.community_id)
          )
      )
    );
$$;

revoke all on function private.can_access_post_scope(uuid, uuid, uuid) from public;
revoke all on function private.can_access_post_scope(uuid, uuid, uuid) from anon;
revoke all on function private.can_access_post_scope(uuid, uuid, uuid) from authenticated;
grant execute on function private.can_access_post_scope(uuid, uuid, uuid) to authenticated;

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
      and private.can_access_post_scope(p.locality_id, p.community_id, p.group_id)
  );
$$;

revoke all on function private.can_access_post(uuid) from public;
revoke all on function private.can_access_post(uuid) from anon;
revoke all on function private.can_access_post(uuid) from authenticated;
grant execute on function private.can_access_post(uuid) to authenticated;

-- ── posts ────────────────────────────────────────────────────────────────────

create policy posts_select_locality_member
on public.posts
for select
to authenticated
using (
  private.can_access_post_scope(locality_id, community_id, group_id)
);

create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post_scope(locality_id, community_id, group_id)
);

-- ── comments / post_reactions / post_saves ───────────────────────────────────
-- Recreated byte-identical to 018. They only had to come down so the helper
-- could be dropped; can_access_post keeps its signature, so community scope
-- reaches them for free through the rewritten helper.

create policy comments_select_via_post
on public.comments
for select
to authenticated
using (
  private.can_access_post(post_id)
);

create policy comments_insert_member
on public.comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

create policy post_reactions_select_locality_member
on public.post_reactions
for select
to authenticated
using (
  private.can_access_post(post_id)
);

create policy post_reactions_insert_locality_member
on public.post_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

create policy post_saves_insert_own
on public.post_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
);

-- ── groups: a group inside a community is not discoverable city-wide ─────────

drop policy if exists groups_select_locality_member on public.groups;

create policy groups_select_locality_member
on public.groups
for select
to authenticated
using (
  private.is_locality_member(locality_id)
  and (
    community_id is null
    or private.is_community_member(community_id)
  )
);

-- ── events: same container rule, extending 017 ───────────────────────────────
-- ORDER MATTERS AGAIN. Migration 019 introduced private.can_access_event, and
-- both event_rsvps policies depend on it — so it cannot be dropped while they
-- exist. Same trap as the post helpers above.

drop policy event_rsvps_select_locality_member on public.event_rsvps;
drop policy event_rsvps_insert_self on public.event_rsvps;
drop function private.can_access_event(uuid);

create function private.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and private.is_locality_member(e.locality_id)
      and (
        e.community_id is null
        or private.is_community_member(e.community_id)
      )
      and (
        e.group_id is null
        or private.is_group_member(e.group_id)
        or exists (
          select 1
          from public.groups g
          where g.id = e.group_id
            and g.visibility = 'public'
            and (
              g.community_id is null
              or private.is_community_member(g.community_id)
            )
        )
      )
  );
$$;

revoke all on function private.can_access_event(uuid) from public;
revoke all on function private.can_access_event(uuid) from anon;
revoke all on function private.can_access_event(uuid) from authenticated;
grant execute on function private.can_access_event(uuid) to authenticated;

create policy event_rsvps_select_locality_member
on public.event_rsvps
for select
to authenticated
using (
  private.can_access_event(event_id)
);

create policy event_rsvps_insert_self
on public.event_rsvps
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_access_event(event_id)
);

drop policy events_select_locality_member on public.events;

create policy events_select_locality_member
on public.events
for select
to authenticated
using (
  (
    community_id is not null
    and private.is_community_member(community_id)
  )
  or (
    community_id is null
    and group_id is null
    and private.is_event_locality_member(id)
  )
  or (
    community_id is null
    and group_id is not null
    and (
      private.is_group_member(group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = group_id
          and g.visibility = 'public'
          and (
            g.community_id is null
            or private.is_community_member(g.community_id)
          )
          and private.is_event_locality_member(id)
      )
    )
  )
);

-- ── feed_posts: the city feed must not surface community content ─────────────
-- Converted to set-based in the community_feeds migration; here it only gains
-- the exclusion, so the leak is closed in the same migration as the column.

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
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt
    from public.post_reactions r
    where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted
    from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid())
    limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id and pr.locality_id = p.locality_id
  where p.locality_id = p_locality_id
    and p.is_deleted = false
    and p.community_id is null
    and private.can_access_post_scope(p.locality_id, p.community_id, p.group_id)
    and (
      p.group_id is null
      or exists (
        select 1 from public.groups g
        where g.id = p.group_id and g.community_id is null
      )
    )
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;
grant execute on function public.feed_posts(uuid, text) to authenticated;

-- ── profiles: ADDITIVE policy only (spec §8.2) ───────────────────────────────
-- Permissive policies are OR'd, so this only widens for community co-members.
-- The existing profiles_select_* policies are untouched and their suites stay
-- valid. Any solution that needs to EDIT profiles_select_* is wrong.

create policy profiles_select_community_comember
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.community_memberships mine
    join public.community_memberships theirs
      on theirs.community_id = mine.community_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'approved'
      and theirs.user_id = profiles.user_id
      and theirs.status = 'approved'
  )
);
