-- Operator check used by the (admin) layout and admin route handlers.
--
-- The layout and route handlers run as service_role (which bypasses RLS),
-- but the operator identity is the caller, not the service_role key.
-- The caller must be authenticated via Supabase cookies/JWT; the layout
-- reads auth.uid() from the cookie session, then passes that id here.
-- We cannot trust auth.uid() inside the function body when called via
-- service_role (it is NULL), so the function takes p_user_id explicitly.
--
-- The caller is responsible for authentication and passing the user
-- they identified. This function trusts the caller — like every other
-- service_role-only RPC in this schema (read_verification_status is the
-- precedent).
--
-- security definer is not strictly needed (no RLS bypass), but it is the
-- project convention and protects against any future RLS tightening on
-- public.operators.

create function public.is_current_user_operator(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operators
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;

revoke all on function public.is_current_user_operator(uuid) from public;
revoke all on function public.is_current_user_operator(uuid) from anon;
revoke all on function public.is_current_user_operator(uuid) from authenticated;

grant execute on function public.is_current_user_operator(uuid) to service_role;