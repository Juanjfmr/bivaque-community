-- Fix complete_event overload ambiguity (AUTHZ-AUTHUID-GAPS fallout).
--
-- 20260822015000_fix_complete_event_caller.sql used `create or replace`
-- with a NEW signature (uuid, uuid default auth.uid()). PostgreSQL does not
-- replace by signature, so the original complete_event(uuid) from
-- 20260806173535_event_completion.sql survived. Every call with a single
-- argument then failed with 42725 "function is not unique".
--
-- The old function checked auth.uid() internally and was service_role-only;
-- both properties are the bug this project removed. The new contract takes
-- p_caller_user_id and is granted to authenticated (see the caller in
-- events/[id]/page.tsx completeEventAction). Dropping the old signature is
-- the reconciliation step; no code path calls complete_event(uuid) anymore.

drop function if exists public.complete_event(uuid);
