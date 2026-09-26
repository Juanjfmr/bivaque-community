-- 030: Public wrappers for the family invite write path.
--
-- private.create_family_invitation and private.revoke_family_invitation
-- are security definer in the private schema, granted only to
-- service_role. They expect p_inviter_user_id to be the verified
-- holder doing the action. The (shell)/profile UI calls them through
-- these public wrappers via Server Actions, passing the caller
-- (already validated by cookie auth). Caller responsibility: ensure
-- the user_id you pass is the same as the one in the session.
--
-- The underlying private guards (verified-holder check, max 5 active,
-- 7-day expiry, only-inviter-can-revoke) all carry through unchanged.
-- We do not weaken the security model here — we only expose a callable
-- surface that the route handler / Server Action can use without
-- having to know the private schema internals.

create function public.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest
  );
$$;

revoke all on function public.create_family_invitation(uuid, bytea, bytea) from public;
revoke all on function public.create_family_invitation(uuid, bytea, bytea) from anon;
revoke all on function public.create_family_invitation(uuid, bytea, bytea) from authenticated;

grant execute on function public.create_family_invitation(uuid, bytea, bytea) to service_role;

create function public.revoke_family_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.revoke_family_invitation(
    p_invitation_id,
    p_inviter_user_id
  );
$$;

revoke all on function public.revoke_family_invitation(uuid, uuid) from public;
revoke all on function public.revoke_family_invitation(uuid, uuid) from anon;
revoke all on function public.revoke_family_invitation(uuid, uuid) from authenticated;

grant execute on function public.revoke_family_invitation(uuid, uuid) to service_role;

create function public.list_pending_family_invitations(p_user_id uuid)
returns table (
  id uuid,
  invitee_email_digest bytea,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.list_pending_family_invitations(p_user_id);
$$;

revoke all on function public.list_pending_family_invitations(uuid) from public;
revoke all on function public.list_pending_family_invitations(uuid) from anon;
revoke all on function public.list_pending_family_invitations(uuid) from authenticated;

grant execute on function public.list_pending_family_invitations(uuid) to service_role;

create function public.is_verified_holder(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.check_verified_holder(p_user_id);
$$;

revoke all on function public.is_verified_holder(uuid) from public;
revoke all on function public.is_verified_holder(uuid) from anon;
revoke all on function public.is_verified_holder(uuid) from authenticated;

grant execute on function public.is_verified_holder(uuid) to service_role;