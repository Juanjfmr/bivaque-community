-- SEC-001: same scope as before, with moderation enforced for direct SELECT.
-- No author exception: consistent with 20260821000033_hideable_targets.sql.
-- Operators read through the existing server-only service_role client after
-- the operator guard (app/(admin)/reports); its BYPASSRLS and grants are unchanged.
alter policy posts_select_locality_member on public.posts
using (
  not is_deleted
  and private.can_access_post_scope(locality_id, community_id, group_id)
);

alter policy comments_select_via_post on public.comments
using (
  not is_deleted
  and private.can_access_post(post_id)
  and exists (select 1 from public.posts p where p.id = comments.post_id and not p.is_deleted)
);
