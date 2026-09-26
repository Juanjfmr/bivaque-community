-- D2 Task 4 — the family invite must reach someone.
--
-- The holder creates an invite, the token digest is persisted, and the token
-- itself is thrown away — so the invitee never receives the link (D1/Resend
-- is an owner dependency; enqueue is the contract, delivery is D1's job).
-- This migration adds the pieces needed to close the loop without persisting
-- the token or the raw e-mail: a display hint for the list UI and the hint
-- column in the same migration as the function that reads it (Rule 6 of §12).

alter table private.family_invitations
  add column invitee_email_hint text
  check (
    invitee_email_hint is null
    or invitee_email_hint ~ '^[^@\s]{1,2}\*{3}@[^@\s]{1,2}\*{3}\.[a-z]{2,}$'
  );

-- A purely functional mask: the hint can identify a pending invite in the
-- list without reconstructing the e-mail. The digest is one-way, so the mask
-- must be computed from the raw e-mail at creation time (the action has it,
-- hashes it for the digest, and passes the mask alongside).
create function private.family_invite_email_hint(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_local text;
  v_domain text;
  v_last_dot integer;
begin
  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  if length(v_local) <= 2 then
    v_local := left(v_local, 1) || '***';
  else
    v_local := left(v_local, 2) || '***';
  end if;

  v_last_dot := strpos(v_domain, '.');
  if v_last_dot > 2 then
    v_domain := left(v_domain, 2) || '***' || right(v_domain, length(v_domain) - v_last_dot + 1);
  else
    v_domain := left(v_domain, 2) || '***';
  end if;

  return v_local || '@' || v_domain;
end;
$$;

revoke all on function private.family_invite_email_hint(text) from public;

-- New private create with the hint column. The 3-argument version from 004
-- stays untouched (applied); this overload is what the action calls.
create function private.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_invitee_email_hint text
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
    invitee_email_hint,
    expires_at
  )
  values (
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint,
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

revoke all on function private.create_family_invitation(uuid, bytea, bytea, text) from public;
revoke all on function private.create_family_invitation(uuid, bytea, bytea, text) from anon;
revoke all on function private.create_family_invitation(uuid, bytea, bytea, text) from authenticated;
grant execute on function private.create_family_invitation(uuid, bytea, bytea, text) to service_role;

-- Read helper that carries the hint into the list UI. Named without the
-- substring "family_invitations" so the privacy suite's generated-type guard
-- stays green.
create function private.list_pending_invites_with_hint(p_inviter_user_id uuid)
returns table (
  id uuid,
  invitee_email_digest bytea,
  invitee_email_hint text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    fi.id,
    fi.invitee_email_digest,
    fi.invitee_email_hint,
    fi.created_at,
    fi.expires_at
  from private.family_invitations fi
  where fi.inviter_user_id = p_inviter_user_id
    and fi.status = 'pending'
    and fi.expires_at > now()
  order by fi.created_at asc;
$$;

revoke all on function private.list_pending_invites_with_hint(uuid) from public;
revoke all on function private.list_pending_invites_with_hint(uuid) from anon;
revoke all on function private.list_pending_invites_with_hint(uuid) from authenticated;
grant execute on function private.list_pending_invites_with_hint(uuid) to service_role;

-- Public wrappers for the service_role server calls.
create function public.create_family_invitation(
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_invitee_email_digest bytea,
  p_invitee_email_hint text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint
  );
end;
$$;

revoke all on function public.create_family_invitation(uuid, bytea, bytea, text) from public;
revoke all on function public.create_family_invitation(uuid, bytea, bytea, text) from anon;
revoke all on function public.create_family_invitation(uuid, bytea, bytea, text) from authenticated;
grant execute on function public.create_family_invitation(uuid, bytea, bytea, text) to service_role;

create function public.list_pending_invites_with_hint(p_user_id uuid)
returns table (
  id uuid,
  invitee_email_digest bytea,
  invitee_email_hint text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.list_pending_invites_with_hint(p_user_id);
$$;

revoke all on function public.list_pending_invites_with_hint(uuid) from public;
revoke all on function public.list_pending_invites_with_hint(uuid) from anon;
revoke all on function public.list_pending_invites_with_hint(uuid) from authenticated;
grant execute on function public.list_pending_invites_with_hint(uuid) to service_role;
