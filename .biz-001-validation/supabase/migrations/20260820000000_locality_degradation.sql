-- Onda T Task 3: degradar, não quebrar.
--
-- The same principle as §7.8 requirement 3: failure degrades to the
-- smaller path, never cuts. Transfer is cancelled and delayed with
-- frequency, and a job that hard-cuts the holder on leaving_at would
-- punish people for a transfer order that changed — recovery needs the
-- dono da vila to re-approve.
--
-- This migration adds:
--   * is_active_locality_member + can_write_post_to: helpers that
--     combine the existing locality/community/group scope with the
--     new access='active' check.
--   * degrade_locality_origins(): the daily job. Flips access from
--     'active' to 'read_only' for every leaving row whose leaving_at
--     is strictly before current_date. Idempotent — running it twice
--     on the same day is a no-op.
--   * reverse_locality_transfer(): the user-facing escape hatch when
--     the order is cancelled. The destination row was created by the
--     transfer that the user is cancelling: it never represented a
--     real move, so removing it is the "sair de vez" of a cancelled
--     transfer. The origin row returns to current/active.
--   * the write-side policies of posts/comments/post_reactions gain
--     the active check, so a read_only holder can read forever but
--     cannot publish.
--
-- Rule 6 of §12: the access column, the helper, and the policies that
-- depend on it land in the same migration. The four leaks this
-- repository already produced came from ignoring that.

-- ── 1. The active-membership helpers ───────────────────────────────────────
-- is_active_locality_member: like is_locality_member, but requires the
-- row to be access='active'. A read_only holder is a member for reading
-- (is_locality_member keeps answering true) but cannot write.
create function private.is_active_locality_member(target_locality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locality_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.locality_id = target_locality_id
      and membership.access = 'active'
  );
$$;

revoke all on function private.is_active_locality_member(uuid) from public;
revoke all on function private.is_active_locality_member(uuid) from anon;
revoke all on function private.is_active_locality_member(uuid) from authenticated;
grant execute on function private.is_active_locality_member(uuid) to authenticated;

-- can_write_post_to: combines the post-scope helper (community and
-- group membership) with the active-membership requirement. The T3
-- write-side policies use this — they replace can_access_post_scope
-- everywhere a holder might be a read_only leaving member of the
-- locality.
create function private.can_write_post_to(
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
  select private.is_active_locality_member(p_locality_id)
    and private.can_access_post_scope(p_locality_id, p_community_id, p_group_id);
$$;

revoke all on function private.can_write_post_to(uuid, uuid, uuid) from public;
revoke all on function private.can_write_post_to(uuid, uuid, uuid) from anon;
revoke all on function private.can_write_post_to(uuid, uuid, uuid) from authenticated;
grant execute on function private.can_write_post_to(uuid, uuid, uuid) to authenticated;

-- ── 2. degrade_locality_origins — the daily job ────────────────────────────
-- service_role only. pg_cron calls this once a day; the row update
-- is small (one row per leaving user), idempotent, and never deletes.
create function public.degrade_locality_origins()
returns integer
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_count integer;
begin
  update public.locality_memberships
    set access = 'read_only'
    where kind = 'leaving'
      and access = 'active'
      and leaving_at is not null
      and leaving_at < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$func$;

revoke all on function public.degrade_locality_origins() from public;
revoke all on function public.degrade_locality_origins() from anon;
revoke all on function public.degrade_locality_origins() from authenticated;
grant execute on function public.degrade_locality_origins() to service_role;

-- ── 3. reverse_locality_transfer — cancel the move ────────────────────────
-- service_role only. The application calls this when the user tells us
-- the order was cancelled. The destination row was created by the
-- transfer; cancelling is the "sair de vez" of a transfer the person
-- never actually moved to. The origin row returns to current/active.
create function public.reverse_locality_transfer(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
begin
  if not exists (
    select 1
    from public.locality_memberships
    where user_id = p_user_id and kind = 'leaving'
  ) then
    raise exception 'no leaving row to reverse' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.locality_memberships
    where user_id = p_user_id and kind = 'current'
  ) then
    raise exception 'no current row to reverse' using errcode = '23514';
  end if;

  delete from public.locality_memberships
    where user_id = p_user_id and kind = 'current';

  update public.locality_memberships
    set kind = 'current', leaving_at = null, access = 'active'
    where user_id = p_user_id and kind = 'leaving';
end;
$func$;

revoke all on function public.reverse_locality_transfer(uuid) from public;
revoke all on function public.reverse_locality_transfer(uuid) from anon;
revoke all on function public.reverse_locality_transfer(uuid) from authenticated;
grant execute on function public.reverse_locality_transfer(uuid) to service_role;

-- ── 4. write-side policies: require access='active' + same scope ──────────
-- The select policies keep using can_access_post_scope (the read_only
-- holder still sees the feed; that is the point of degradation). Insert
-- and update of posts, comments, post_reactions gain the active check
-- through can_write_post_to (which adds is_active_locality_member to
-- the existing can_access_post_scope check).

-- posts — keep the original policy name; the guard at rls-or-column-
-- regression.test.sql:241 lists it verbatim and renaming would break
-- the contract without changing the actual RLS behaviour.
drop policy if exists posts_insert_locality_member on public.posts;
create policy posts_insert_locality_member
on public.posts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_write_post_to(locality_id, community_id, group_id)
);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
on public.posts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and private.can_write_post_to(locality_id, community_id, group_id)
);

-- comments — keep the original policy name for the same reason.
drop policy if exists comments_insert_member on public.comments;
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
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
);

drop policy if exists comments_update_own on public.comments;
create policy comments_update_own
on public.comments
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
);

-- post_reactions: insert only — keep the original policy name; the
-- guard for reactions lists it verbatim too.
drop policy if exists post_reactions_insert_self on public.post_reactions;
create policy post_reactions_insert_self
on public.post_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = post_reactions.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
);
