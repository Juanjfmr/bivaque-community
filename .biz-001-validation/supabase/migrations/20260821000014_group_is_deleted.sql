-- 036: group admin cycle — is_deleted for soft delete (Wave F Task 8 Step 2).
--
-- The schema uses logical deletion in posts; groups follow the same pattern.
-- groups.is_deleted already exists (20260802001600_reports.sql), together with
-- the service_role-only toggle trigger — this migration only adds the select
-- filter. The existing groups_select_locality_member policy (as of
-- 20260805214709_community_scope.sql) also scopes a group inside a community
-- to that community's members; that condition is preserved here, not just the
-- visibility check, or a private community's groups would leak locality-wide.

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
  and is_deleted = false
);