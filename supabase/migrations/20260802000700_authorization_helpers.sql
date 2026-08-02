-- 007: authorization helper functions for RLS policy checks
-- Security-definer functions covering the plan contexts: verified locality
-- membership (pilot), accepted-family status, and future-facing checks.
-- All functions use set search_path = '' to prevent search-path injection.

-- ── verified locality membership ────────────────────────────────────────────

-- true when auth.uid() is BOTH a verified holder AND a member of the locality.
-- Extends is_locality_member (003) with the verification gate required for
-- holder-only features.
create function private.is_verified_locality_member(target_locality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.verification_outcomes v
    join public.locality_memberships m
      on m.user_id = v.user_id
     and m.locality_id = target_locality_id
    where v.user_id = (select auth.uid())
      and v.status = 'verified'
  );
$$;

revoke all on function private.is_verified_locality_member(uuid) from public;
revoke all on function private.is_verified_locality_member(uuid) from anon;
revoke all on function private.is_verified_locality_member(uuid) from authenticated;

grant execute on function private.is_verified_locality_member(uuid) to authenticated;

-- ── accepted family relationship ────────────────────────────────────────────

-- true when family_user_id has an accepted family account link created by
-- holder_user_id (i.e. the holder invited them and they accepted).
create function private.has_accepted_family(
  p_holder_user_id uuid,
  p_family_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.family_account_links
    where holder_user_id = p_holder_user_id
      and family_user_id = p_family_user_id
  );
$$;

revoke all on function private.has_accepted_family(uuid, uuid) from public;
revoke all on function private.has_accepted_family(uuid, uuid) from anon;
revoke all on function private.has_accepted_family(uuid, uuid) from authenticated;

grant execute on function private.has_accepted_family(uuid, uuid) to authenticated;

-- ── is verified holder (no locality context) ────────────────────────────────

-- true when the given user has a verified verification outcome.
-- Useful as a building block for policy checks that need the holder gate
-- independent of locality membership.
create function private.is_verified_holder(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.verification_outcomes
    where user_id = target_user_id
      and status = 'verified'
  );
$$;

revoke all on function private.is_verified_holder(uuid) from public;
revoke all on function private.is_verified_holder(uuid) from anon;
revoke all on function private.is_verified_holder(uuid) from authenticated;

grant execute on function private.is_verified_holder(uuid) to authenticated;
