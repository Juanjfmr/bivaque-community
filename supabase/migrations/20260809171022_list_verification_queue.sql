-- 030: Operator-only read RPC for the admissions queue.
--
-- The handler at apps/web/app/api/admin/admissions/route.ts runs as
-- service_role and authenticates the caller via Bearer JWT, then checks
-- is_current_user_operator, before invoking this function. The operator
-- panel page apps/web/app/(admin)/admissions/page.tsx reads through the
-- same function behind the admin layout gate.
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
-- trusts its caller to have already authenticated and proven operator.
--
-- The queue is the admission backlog: pending (never answered), rejected
-- (refused) and temporary_error (infrastructure failure, distinct from a
-- rejection). Ordered oldest first — the person who has waited longest is
-- the one most likely to give up.
--
-- Only public-safe fields are returned: the user id, the display name when
-- a profile exists, the status, and the created_at timestamp. verification_outcomes
-- has no error-code column; there is nothing more to expose, and no CPF,
-- CPF hash, or Portal payload ever leaves this function.

create function public.list_verification_queue()
returns table (
  user_id uuid,
  display_name text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.user_id,
    p.display_name,
    v.status::text,
    v.created_at
  from private.verification_outcomes v
  left join public.profiles p on p.user_id = v.user_id
  where v.status in ('pending', 'temporary_error', 'rejected')
  order by v.created_at asc;
$$;

revoke all on function public.list_verification_queue() from public;
revoke all on function public.list_verification_queue() from anon;
revoke all on function public.list_verification_queue() from authenticated;

grant execute on function public.list_verification_queue() to service_role;
