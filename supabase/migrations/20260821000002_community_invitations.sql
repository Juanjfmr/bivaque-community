-- 024: Member invitation flow (Wave E Task 6).
--
-- Semantics are the OPPOSITE of the family invite (§5.4). The family invite
-- is the alternative path that DOES NOT require verification; the member
-- invite REQUIRES it (D15). A leaked member invite yields a pending entry
-- request, never direct access (§5.2 / D14).
--
-- The table is operational: the raw token is never stored, only its
-- sha256 digest (32 bytes). The link is shown exactly once, in the response
-- to the create action; the digest is the only persisted form.
--
-- Scope column: community_id is the scope. RLS + the RPCs read it on every
-- path. Rule 6 of §12: the column and the policies that read it ship in the
-- same migration. This repository has shipped that mistake four times; this
-- migration does not.

create type public.community_invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create table public.community_invitations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  inviter_user_id uuid not null references auth.users (id) on delete cascade,
  token_digest bytea not null unique check (octet_length(token_digest) = 32),
  status public.community_invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_user_id uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'accepted' and accepted_by_user_id is not null and accepted_at is not null)
    or (status <> 'accepted' and accepted_by_user_id is null and accepted_at is null)
  )
);

create index community_invitations_community_idx
  on public.community_invitations (community_id, created_at desc)
  where status = 'pending';

create index community_invitations_inviter_idx
  on public.community_invitations (inviter_user_id, created_at desc)
  where status = 'pending';

-- Operational: no Data API role. Reads/writes go through the service_role
-- wrappers below (create_community_invitation, accept_community_invitation,
-- revoke_community_invitation, list_pending_community_invitations).
alter table public.community_invitations enable row level security;
alter table public.community_invitations force row level security;

revoke all on table public.community_invitations from anon, authenticated;
grant all on table public.community_invitations to service_role;

-- create_community_invitation: inviter must be verified AND approved member
-- of the community. The action layer mints the token; this RPC persists only
-- the digest.
create function public.create_community_invitation(
  p_community_id uuid,
  p_inviter_user_id uuid,
  p_token_digest bytea,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if octet_length(p_token_digest) <> 32 then
    raise exception 'token_digest must be 32 bytes (sha256)' using errcode = '22023';
  end if;

  if p_expires_at <= now() then
    raise exception 'expires_at must be in the future' using errcode = '22023';
  end if;

  if not private.is_verified_holder(p_inviter_user_id) then
    raise exception 'only verified members can invite' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.community_memberships
    where community_id = p_community_id
      and user_id = p_inviter_user_id
      and status = 'approved'
  ) then
    raise exception 'only approved members can invite to this community' using errcode = '42501';
  end if;

  insert into public.community_invitations (
    community_id, inviter_user_id, token_digest, expires_at
  ) values (
    p_community_id, p_inviter_user_id, p_token_digest, p_expires_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_community_invitation(uuid, uuid, bytea, timestamptz) from public;
revoke all on function public.create_community_invitation(uuid, uuid, bytea, timestamptz) from anon;
revoke all on function public.create_community_invitation(uuid, uuid, bytea, timestamptz) from authenticated;
grant execute on function public.create_community_invitation(uuid, uuid, bytea, timestamptz) to service_role;

-- accept_community_invitation: THE D15 gate. Non-verified callers get NO
-- state change. The pgTAP test asserts this directly. Without it the
-- member invite becomes an alternative verification path, which is exactly
-- what D16 reserves for the family invite.
--
-- When verified, we create a pending community_membership. The dono still
-- approves (D14). Three gains (per the plan):
--   1. A leaked link yields a pending request, not access.
--   2. The dono sees who invited the request (§5.2 attribution).
--   3. The invite cannot cross communities: the digest is global but the
--      row's community_id is checked atomically here.
create function public.accept_community_invitation(
  p_token_digest bytea,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.community_invitations;
  v_community_id uuid;
begin
  select * into v_invite
  from public.community_invitations
  where token_digest = p_token_digest
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'invitation already %', v_invite.status using errcode = 'P0003';
  end if;

  if v_invite.expires_at <= now() then
    update public.community_invitations
    set status = 'expired'
    where id = v_invite.id;
    raise exception 'invitation expired' using errcode = 'P0004';
  end if;

  if not private.is_verified_holder(p_user_id) then
    raise exception 'verification required' using errcode = '42501';
  end if;

  v_community_id := v_invite.community_id;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (v_community_id, p_user_id, 'member', 'pending')
  on conflict (community_id, user_id) do nothing;

  update public.community_invitations
  set status = 'accepted',
      accepted_by_user_id = p_user_id,
      accepted_at = now()
  where id = v_invite.id;

  return v_community_id;
end;
$$;

revoke all on function public.accept_community_invitation(bytea, uuid) from public;
revoke all on function public.accept_community_invitation(bytea, uuid) from anon;
revoke all on function public.accept_community_invitation(bytea, uuid) from authenticated;
grant execute on function public.accept_community_invitation(bytea, uuid) to service_role;

-- revoke_community_invitation: the inviter revokes a pending invite.
create function public.revoke_community_invitation(
  p_invitation_id uuid,
  p_inviter_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.community_invitations
    set status = 'revoked'
  where id = p_invitation_id
    and inviter_user_id = p_inviter_user_id
    and status = 'pending';

  if not found then
    raise exception 'invitation not found or not revocable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.revoke_community_invitation(uuid, uuid) from public;
revoke all on function public.revoke_community_invitation(uuid, uuid) from anon;
revoke all on function public.revoke_community_invitation(uuid, uuid) from authenticated;
grant execute on function public.revoke_community_invitation(uuid, uuid) to service_role;

-- list_pending_community_invitations: the inviter's pending invites, scoped
-- to a community. Used by the UI to render the queue with copy + revoke.
create function public.list_pending_community_invitations(
  p_inviter_user_id uuid,
  p_community_id uuid
)
returns table (
  id uuid,
  community_id uuid,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select id, community_id, expires_at, created_at
  from public.community_invitations
  where inviter_user_id = p_inviter_user_id
    and community_id = p_community_id
    and status = 'pending'
    and expires_at > now()
  order by created_at desc;
$$;

revoke all on function public.list_pending_community_invitations(uuid, uuid) from public;
revoke all on function public.list_pending_community_invitations(uuid, uuid) from anon;
revoke all on function public.list_pending_community_invitations(uuid, uuid) from authenticated;
grant execute on function public.list_pending_community_invitations(uuid, uuid) to service_role;

-- The D1 quota (memberInvite = 5/h) is enforced at the action layer via
-- Upstash (packages/domain LIMITS.memberInvite). SQL has no counter; the
-- plan §Task 6 step 2 explicitly forbids introducing one.