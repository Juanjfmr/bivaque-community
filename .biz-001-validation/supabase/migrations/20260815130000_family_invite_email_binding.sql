-- D2: family invitations are the only verification-free admission path,
-- so accepting one must prove the authenticated user is the intended
-- invitee. Before this migration, `accept_family_invitation` trusted the
-- caller's `p_accepted_by_user_id` and never compared it to the stored
-- `invitee_email_digest` — a forwarded link provisioned whoever opened it.

create extension if not exists pgcrypto;

create or replace function private.accept_family_invitation(
  p_token_digest bytea,
  p_accepted_by_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation private.family_invitations;
  v_invitee_email_digest bytea;
  v_link_id uuid;
begin
  select *
  into v_invitation
  from private.family_invitations
  where token_digest = p_token_digest
    and status = 'pending'
    and expires_at > now();

  if not found then
    raise exception 'invitation not found, already accepted, revoked, or expired';
  end if;

  -- The invitation is tied to a lower-cased, trimmed e-mail digest at
  -- creation time. The accepting Auth user must be that exact mailbox;
  -- a forwarded link with a different session must not be provisioned.
  select extensions.digest(lower(trim(email)), 'sha256')
  into v_invitee_email_digest
  from auth.users
  where id = p_accepted_by_user_id;

  if v_invitee_email_digest is null then
    raise exception 'accepting user not found';
  end if;

  if v_invitee_email_digest <> v_invitation.invitee_email_digest then
    raise exception 'invitation email does not match the authenticated user';
  end if;

  update private.family_invitations
  set
    status = 'accepted',
    accepted_by_user_id = p_accepted_by_user_id,
    accepted_at = now()
  where id = v_invitation.id;

  insert into private.family_account_links (
    invitation_id,
    holder_user_id,
    family_user_id
  )
  values (
    v_invitation.id,
    v_invitation.inviter_user_id,
    p_accepted_by_user_id
  )
  returning id into v_link_id;

  return v_link_id;
end;
$$;

revoke all on function private.accept_family_invitation(bytea, uuid) from public;
grant execute on function private.accept_family_invitation(bytea, uuid) to service_role;
