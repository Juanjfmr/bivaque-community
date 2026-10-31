-- Onda G — Task 2: convite de prestador atado ao e-mail.
--
-- A comunidade atesta o prestador: somente um membro aprovado daquela
-- comunidade pode convidar. O convite não concede membership nem cria perfil;
-- no aceite ele cria apenas a provider_account da Task 1.

create type private.provider_invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create table private.provider_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users (id) on delete restrict,
  community_id uuid not null references public.communities (id) on delete cascade,
  locality_id uuid not null references public.localities (id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 80),
  token_digest bytea not null unique check (octet_length(token_digest) = 32),
  invitee_email_digest bytea not null check (octet_length(invitee_email_digest) = 32),
  status private.provider_invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_user_id uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (
      status = 'accepted'
      and accepted_by_user_id is not null
      and accepted_at is not null
    )
    or (
      status <> 'accepted'
      and accepted_by_user_id is null
      and accepted_at is null
    )
  ),
  check (accepted_by_user_id is null or accepted_by_user_id <> inviter_user_id)
);

create index provider_invitations_inviter_pending_idx
  on private.provider_invitations (inviter_user_id)
  where status = 'pending';

alter table private.provider_invitations enable row level security;
alter table private.provider_invitations force row level security;

revoke all on table private.provider_invitations from public, anon, authenticated;

create function public.create_provider_invitation(
  p_community_id uuid,
  p_email text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inviter_user_id uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_display_name text := btrim(p_display_name);
  v_locality_id uuid;
  v_active_count integer;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_invitation_id uuid;
begin
  if v_inviter_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid provider e-mail' using errcode = '22023';
  end if;

  if char_length(v_display_name) not between 2 and 80 then
    raise exception 'provider display name must have between 2 and 80 characters'
      using errcode = '22023';
  end if;

  select c.locality_id
    into v_locality_id
    from public.communities c
    join public.community_memberships cm
      on cm.community_id = c.id
     and cm.user_id = v_inviter_user_id
     and cm.status = 'approved'
   where c.id = p_community_id
     and c.is_deleted = false;

  if v_locality_id is null then
    raise exception 'only approved community members can invite providers'
      using errcode = '42501';
  end if;

  -- Serializa a cota por autor para que duas requisições concorrentes não
  -- consigam criar o sexto convite.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_inviter_user_id::text, 0)
  );

  select count(*)::integer
    into v_active_count
    from private.provider_invitations pi
   where pi.inviter_user_id = v_inviter_user_id
     and pi.status = 'pending'
     and pi.expires_at > now();

  if v_active_count >= 5 then
    raise exception 'maximum 5 active provider invitations per member'
      using errcode = '54000';
  end if;

  insert into private.provider_invitations (
    inviter_user_id,
    community_id,
    locality_id,
    display_name,
    token_digest,
    invitee_email_digest,
    expires_at
  )
  values (
    v_inviter_user_id,
    p_community_id,
    v_locality_id,
    v_display_name,
    extensions.digest(decode(v_token, 'hex'), 'sha256'),
    extensions.digest(v_email, 'sha256'),
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  -- O token em claro existe apenas na mensagem operacional que precisa
  -- entregá-lo. A tabela de convites persiste somente o digest.
  insert into public.outbox (recipient, channel, type, payload)
  values (
    v_email,
    'email',
    'provider_invite',
    jsonb_build_object(
      'display_name', v_display_name,
      'invite_path', '/prestador-convite/' || v_token
    )
  );

  return v_invitation_id;
end;
$$;

revoke all on function public.create_provider_invitation(uuid, text, text)
  from public, anon;
grant execute on function public.create_provider_invitation(uuid, text, text)
  to authenticated;

create function public.accept_provider_invitation(
  p_token text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_invitation private.provider_invitations;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_token !~ '^[0-9A-Fa-f]{64}$' then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  -- O e-mail não vem da confiança do formulário: ele precisa ser o e-mail
  -- autenticado do caller e também casar com o digest do convite.
  if not exists (
    select 1
      from auth.users u
     where u.id = v_user_id
       and lower(u.email) = v_email
  ) then
    raise exception 'authenticated e-mail does not match' using errcode = '42501';
  end if;

  select pi.*
    into v_invitation
    from private.provider_invitations pi
   where pi.token_digest = extensions.digest(decode(lower(p_token), 'hex'), 'sha256')
   for update;

  if not found then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  if v_invitation.status = 'accepted' then
    raise exception 'provider invitation already accepted' using errcode = 'P0003';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'provider invitation is not pending' using errcode = 'P0003';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'provider invitation expired' using errcode = 'P0004';
  end if;

  if v_invitation.invitee_email_digest <> extensions.digest(v_email, 'sha256') then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  -- Prestador é papel sem membership (D37), nunca um segundo papel anexado
  -- a uma conta de membro existente.
  if exists (
    select 1 from public.locality_memberships lm where lm.user_id = v_user_id
  ) or exists (
    select 1 from public.community_memberships cm where cm.user_id = v_user_id
  ) then
    raise exception 'member accounts cannot accept provider invitations'
      using errcode = '42501';
  end if;

  insert into public.provider_accounts (
    auth_user_id,
    invited_by,
    community_id,
    locality_id
  )
  values (
    v_user_id,
    v_invitation.inviter_user_id,
    v_invitation.community_id,
    v_invitation.locality_id
  );

  update private.provider_invitations
     set status = 'accepted',
         accepted_by_user_id = v_user_id,
         accepted_at = now()
   where id = v_invitation.id;

  return v_user_id;
end;
$$;

revoke all on function public.accept_provider_invitation(text, text)
  from public, anon;
grant execute on function public.accept_provider_invitation(text, text)
  to authenticated;
