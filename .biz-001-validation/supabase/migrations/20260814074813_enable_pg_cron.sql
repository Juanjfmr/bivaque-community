-- D1 Task 2: enable pg_cron for scheduled jobs — the foundation for the
-- outbox delivery worker (Task 3) and the pending-verification reconciliation
-- (D2). pg_net (0.20.3) is already available in the local stack for HTTP calls
-- from the database.

create extension if not exists pg_cron;

-- A trivial job proving scheduling works end to end; it no-ops. The pgTAP test
-- asserts the extension is enabled and this job exists, so a scheduling failure
-- surfaces immediately instead of when someone notices nothing runs.
select cron.schedule('bivaque-heartbeat', '* * * * *', 'select 1');
