-- Remove broad event-photos policies left by the original storage_buckets migration.
-- The more restrictive policies in 20260821000015_event_photos_bucket.sql are
-- sufficient; keeping both causes OR-bypass because PostgreSQL combines RLS
-- policies with logical OR.
--
-- Old wide policies from 20260802000500_storage_buckets.sql:
--   event_photos_insert_member  — any locality member could upload anything
--   event_photos_select_member  — any locality member could read anything
-- These were replaced by stricter rules requiring ownership + locality for
-- inserts and post-scoped visibility for selects in the later migration.

drop policy if exists event_photos_insert_member on storage.objects;
drop policy if exists event_photos_select_member on storage.objects;
