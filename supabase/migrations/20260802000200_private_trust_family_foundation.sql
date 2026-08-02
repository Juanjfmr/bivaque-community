create schema private;

revoke all on schema private from public;

create type private.verification_status as enum (
  'pending',
  'verified',
  'rejected',
  'temporary_error'
);

create type private.eligibility_class as enum (
  'active_federal_military',
  'veteran',
  'military_pensioner'
);

create type private.family_invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create table private.verification_outcomes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status private.verification_status not null default 'pending',
  eligibility_class private.eligibility_class,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'verified' and eligibility_class is not null and checked_at is not null)
    or (status <> 'verified' and eligibility_class is null)
  )
);

create table private.family_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users (id) on delete cascade,
  token_digest bytea not null unique check (octet_length(token_digest) = 32),
  invitee_email_digest bytea not null check (octet_length(invitee_email_digest) = 32),
  status private.family_invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_user_id uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, inviter_user_id, accepted_by_user_id),
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

create index family_invitations_inviter_status_idx
  on private.family_invitations (inviter_user_id, status, expires_at);

create table private.family_account_links (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique,
  holder_user_id uuid not null references auth.users (id) on delete cascade,
  family_user_id uuid not null unique references auth.users (id) on delete cascade,
  linked_at timestamptz not null default now(),
  foreign key (invitation_id, holder_user_id, family_user_id)
    references private.family_invitations (
      id,
      inviter_user_id,
      accepted_by_user_id
    )
    on delete restrict,
  check (holder_user_id <> family_user_id)
);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger verification_outcomes_set_updated_at
before update on private.verification_outcomes
for each row execute function private.set_updated_at();

revoke all on function private.set_updated_at() from public;
