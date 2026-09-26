-- 032: notification_type gains 'recommendation_reply' (Wave F Task 5 Step 1).
--
-- Postgres trap: a value added to an enum in a transaction CANNOT be used
-- in the same transaction. This migration only ADDS the value; the trigger
-- that uses it lives in migration 033.

alter type public.notification_type add value 'recommendation_reply';