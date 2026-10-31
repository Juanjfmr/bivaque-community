-- Onda D2 Task 1 — Step 1: my_verification_status
--
-- The middleware at apps/web/middleware.ts needs to know the verification
-- state of the caller so it can route by the right destination (P0 Task 4
-- turned the two-phase admission into a real state machine: verified-without-
-- membership is not a bug, it is a step). The state lives in
-- private.verification_outcomes, which the Data API never exposes (AGENTS.md
-- §Supabase, §Portal). The plan's answer is a public RPC that does the
-- work — and the work is the only thing the function does, because
-- accepting a p_user_id parameter from a caller that the middleware just
-- authenticated is exactly the kind of decision the function should not
-- make.
--
-- Rule 6 of §12: the function, the policy that gates it, and the middleware
-- that calls it land in the same migration. The migration also revokes
-- the previous read path (`read_verification_status(p_user_id uuid)`,
-- service_role-only) from the function inventory that lives in this
-- migration as a comment — it stays in the schema for the API route at
-- apps/web/app/api/onboarding/status/route.ts, which still uses service_role
-- today. The D2 plan Task 8 will revisit that route.

create function public.my_verification_status()
returns table (
  status text,
  eligibility_class text,
  checked_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    status::text,
    eligibility_class::text,
    checked_at,
    updated_at
  from private.verification_outcomes
  where user_id = (select auth.uid());
$$;

revoke all on function public.my_verification_status() from public;
revoke all on function public.my_verification_status() from anon;
revoke all on function public.my_verification_status() from authenticated;

grant execute on function public.my_verification_status() to authenticated;
