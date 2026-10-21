-- SEC-001/H3: authors cannot rewrite or physically delete moderated evidence.
-- Keep all ownership/write-scope checks. Operators continue using the existing
-- guarded server service_role client (BYPASSRLS); account deletion continues via
-- its SECURITY DEFINER RPCs and GoTrue soft delete, preserving content FKs.
alter policy posts_update_own on public.posts
using (not is_deleted and user_id = (select auth.uid()))
with check (
  not is_deleted
  and user_id = (select auth.uid())
  and private.can_write_post_to(locality_id, community_id, group_id)
);

alter policy posts_delete_own on public.posts
using (not is_deleted and user_id = (select auth.uid()));

alter policy comments_update_own on public.comments
using (not is_deleted and user_id = (select auth.uid()))
with check (
  not is_deleted
  and user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
);

alter policy comments_delete_own on public.comments
using (not is_deleted and user_id = (select auth.uid()));

-- SEC-001/L4: security-definer scope helpers do not check moderation. Require
-- a live parent through SELECT/RLS too, keeping prior ownership/scope checks.
alter policy post_reactions_select_locality_member on public.post_reactions
using (
  private.can_access_post(post_id)
  and exists (select 1 from public.posts p where p.id = post_reactions.post_id and not p.is_deleted)
);

alter policy post_saves_select_own on public.post_saves
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_saves.post_id and not p.is_deleted)
);

alter policy post_follows_select_own on public.post_follows
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_follows.post_id and not p.is_deleted)
);
