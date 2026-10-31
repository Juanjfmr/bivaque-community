-- 03X: notify the reporter when a report is resolved.
--
-- Task 11 of the observability plan: the reporter is already inside the
-- product, so resolving a report must reach them as an in-app notification,
-- not as manual operator work.
--
-- The runbook §6 requires "sem revelar a ação tomada": the notification
-- confirms the analysis, never the outcome applied to the content. The
-- notifications table only carries structural references (recipient, actor,
-- type, action, target), so there is no column that could leak the reported
-- content, its author, or the action taken.
--
-- `alter type ... add value` cannot run inside a transaction block in some
-- Postgres versions, and the new value must not be used in the same
-- transaction that adds it. This migration only adds the value and the grant;
-- the value is first referenced by later migrations/runtime, never here.

alter type public.notification_type add value 'report_resolved';

-- The admin reports route (apps/web/app/api/admin/reports/[id]/route.ts) runs
-- as service_role and needs to insert the notification for the reporter.
grant insert on table public.notifications to service_role;