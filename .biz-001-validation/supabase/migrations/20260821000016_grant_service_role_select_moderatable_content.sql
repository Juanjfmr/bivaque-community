-- 20260802001600_reports.sql granted service_role UPDATE (is_deleted) on
-- posts, comments and groups, so the operator report-hiding route
-- (api/admin/reports/[id]/route.ts) could soft-delete moderated content.
-- It never granted SELECT: an UPDATE with a WHERE id = ... clause needs
-- SELECT on the columns it reads to filter, so every service_role hide of
-- reported content failed with "permission denied for table" — RLS is
-- bypassed for service_role (rolbypassrls), but the base table grant is a
-- separate check RLS bypass doesn't skip.

grant select on table public.posts to service_role;
grant select on table public.comments to service_role;
grant select on table public.groups to service_role;
