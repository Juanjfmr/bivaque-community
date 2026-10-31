-- Onda F Task 4, Step 5: the recurring-event reminder needs its own
-- notification_type value. A value added by ALTER TYPE cannot be used in
-- the same transaction (the precedent this repo keeps hitting — see
-- 20260809184316_notify_report_resolved.sql:18) — this migration only adds
-- the value; 20260820052745_recurring_events.sql is the one that uses it.

alter type public.notification_type add value 'event_reminder';
