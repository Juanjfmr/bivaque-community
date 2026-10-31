-- 029: Server-side read RPC for the onboarding status route.
--
-- The handler at apps/web/app/api/onboarding/status/route.ts runs as
-- service_role and authenticates the caller via Bearer JWT before invoking
-- this function. It passes the validated authUser.id as p_user_id; the
-- function just reads that one row.
--
-- Why a public RPC instead of .schema("private").from(...) in JS:
-- database.generated.ts ships only the public schema (AGENTS.md). The typed
-- Supabase client does not know about private tables, so a direct query
-- would require type suppression (forbidden by repo style). The RPC name
-- lives in public, so supabase.rpc(...) types correctly without losing
-- safety.
--
-- security definer bypasses RLS on private.verification_outcomes, which is
-- enabled and forced for that table. service_role-only because the function
-- trusts its caller to have already authenticated and filtered by user. The
-- typed route passes authUser.id; nothing else gets in.

create function public.read_verification_status(p_user_id uuid)
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
  where user_id = p_user_id;
$$;

revoke all on function public.read_verification_status(uuid) from public;
revoke all on function public.read_verification_status(uuid) from anon;
revoke all on function public.read_verification_status(uuid) from authenticated;

grant execute on function public.read_verification_status(uuid) to service_role;