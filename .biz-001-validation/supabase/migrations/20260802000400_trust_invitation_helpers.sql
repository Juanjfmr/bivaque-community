-- 004: Trust invitation helpers and verification write-path
-- Security-definer functions for the private trust schema.
-- All functions use set search_path = '' to prevent search-path injection.

-- count active (pending + unexpired) invitations for a verified holder
create function private.verified_holder_active_invitations(holder_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from private.family_invitations
  where inviter_user_id = holder_user_id
    and status = 'pending'
    and expires_at > now();
$$;

revoke all on function private.verified_holder_active_invitations(uuid) from public;

-- create a family invitation with guards: verifier must be verified, max 5 active, 7-day expiry
create function private.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified boolean;
  v_active_count integer;
  v_invitation_id uuid;
begin
  select status = 'verified'
  into v_verified
  from private.verification_outcomes
  where user_id = p_inviter_user_id;

  if v_verified is not true then
    raise exception 'only verified holders can create invitations';
  end if;

  select count(*)::integer
  into v_active_count
  from private.family_invitations
  where inviter_user_id = p_inviter_user_id
    and status = 'pending'
    and expires_at > now();

  if v_active_count >= 5 then
    raise exception 'maximum 5 active invitations per holder';
  end if;

  insert into private.family_invitations (
    inviter_user_id,
    token_digest,
    invitee_email_digest,
    expires_at
  )
  values (
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

revoke all on function private.create_family_invitation(uuid, bytea, bytea) from public;

-- revoke a pending invitation (only by the inviter)
create function private.revoke_family_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.family_invitations
  set status = 'revoked'
  where id = p_invitation_id
    and inviter_user_id = p_inviter_user_id
    and status = 'pending';

  if not found then
    raise exception 'invitation not found or not revocable';
  end if;
end;
$$;

revoke all on function private.revoke_family_invitation(uuid, uuid) from public;

-- accept a family invitation by token digest, creates the account link
create function private.accept_family_invitation(
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

-- upsert a verification outcome (service_role write path for Portal result)
create function private.upsert_verification_outcome(
  p_user_id uuid,
  p_status private.verification_status,
  p_eligibility_class private.eligibility_class default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status = 'verified' and p_eligibility_class is null then
    raise exception 'verified status requires an eligibility class';
  end if;

  if p_status <> 'verified' and p_eligibility_class is not null then
    raise exception 'non-verified status must not carry an eligibility class';
  end if;

  insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
  values (
    p_user_id,
    p_status,
    p_eligibility_class,
    case when p_status = 'verified' then now() else null end
  )
  on conflict (user_id) do update
  set
    status = excluded.status,
    eligibility_class = excluded.eligibility_class,
    checked_at = case when excluded.status = 'verified' then now() else null end,
    updated_at = now();
end;
$$;

revoke all on function private.upsert_verification_outcome(uuid, private.verification_status, private.eligibility_class) from public;

-- grant execute only to service_role (server-side write path)
grant execute on function private.verified_holder_active_invitations(uuid) to service_role;
grant execute on function private.create_family_invitation(uuid, bytea, bytea) to service_role;
grant execute on function private.revoke_family_invitation(uuid, uuid) to service_role;
grant execute on function private.accept_family_invitation(bytea, uuid) to service_role;
grant execute on function private.upsert_verification_outcome(uuid, private.verification_status, private.eligibility_class) to service_role;
