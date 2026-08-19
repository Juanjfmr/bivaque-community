-- 029: event_rsvp_status gains 'not_going' (Wave F Task 2 Step 1).
--
-- Postgres trap: a value added to an enum in a transaction CANNOT be used
-- in the same transaction. Migration A adds the value; Migration B adds the
-- trigger that uses it. The precedent for this two-migration dance is
-- 20260809184316_notify_report_resolved.sql:18 (adds without using).

alter type public.event_rsvp_status add value 'not_going';