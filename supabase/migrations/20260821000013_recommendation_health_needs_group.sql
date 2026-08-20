-- 035: health requests must start inside a group (Wave F Task 7 Step 1).
--
-- The form already picks the scope, but the rule lives only on the client.
-- Validation only on the client is not validation — the insert goes through
-- the browser under RLS, and a tampered request bypasses the UI guard. The
-- server enforces: a request with category='saude_bem_estar' must have a
-- group_id (Saúde começa em grupo, §7 — privacy boundary for health signals).
--
-- The constraint fires Postgres 23514 (check_violation), which matches
-- `recommendations-scope-denials.sql` test 10's expectation. Adding this
-- constraint does not change 23514's contract — the existing scope CHECK
-- already raises 23514 on (locality, group) XOR violations; this new CHECK
-- raises 23514 on (category=saude AND group_id IS NULL) violations.

alter table public.recommendation_requests
  add constraint recommendation_health_needs_group
  check (category <> 'saude_bem_estar' or group_id is not null);