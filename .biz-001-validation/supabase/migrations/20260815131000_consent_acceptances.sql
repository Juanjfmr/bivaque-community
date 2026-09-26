-- D2/D12: consent and code of conduct are the contractual basis for the
-- community rules, so accepting them must be recorded server-side with the
-- version that was shown. The browser cookie only gates navigation; this
-- table is the durable, auditable trail a moderation decision can point to.

create table public.consent_acceptances (
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_version integer not null check (consent_version > 0),
  code_of_conduct_version integer not null check (code_of_conduct_version > 0),
  accepted_at timestamptz not null default now(),
  primary key (user_id, consent_version, code_of_conduct_version)
);

alter table public.consent_acceptances enable row level security;
alter table public.consent_acceptances force row level security;

revoke all on table public.consent_acceptances from anon, authenticated;
grant all on table public.consent_acceptances to service_role;

create policy consent_acceptances_service_role_all
on public.consent_acceptances
for all
to service_role
using (true)
with check (true);

-- Server-side write path. The versions come from the deployed application
-- constants, not from the caller, so the browser cannot downgrade its own
-- acceptance record.
create function public.record_consent_acceptance(
  p_user_id uuid,
  p_consent_version integer,
  p_code_of_conduct_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_consent_version < 1 then
    raise exception 'consent_version must be positive';
  end if;

  if p_code_of_conduct_version < 1 then
    raise exception 'code_of_conduct_version must be positive';
  end if;

  insert into public.consent_acceptances (
    user_id,
    consent_version,
    code_of_conduct_version
  )
  values (
    p_user_id,
    p_consent_version,
    p_code_of_conduct_version
  )
  on conflict (user_id, consent_version, code_of_conduct_version) do nothing;
end;
$$;

revoke all on function public.record_consent_acceptance(uuid, integer, integer) from public;
revoke all on function public.record_consent_acceptance(uuid, integer, integer) from anon;
revoke all on function public.record_consent_acceptance(uuid, integer, integer) from authenticated;
grant execute on function public.record_consent_acceptance(uuid, integer, integer) to service_role;

-- Used by the onboarding route to reject a forged browser cookie: the
-- current versions must have a real acceptance record for this user.
create function public.has_accepted_consent(
  p_user_id uuid,
  p_consent_version integer,
  p_code_of_conduct_version integer
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.consent_acceptances
    where user_id = p_user_id
      and consent_version = p_consent_version
      and code_of_conduct_version = p_code_of_conduct_version
  );
$$;

revoke all on function public.has_accepted_consent(uuid, integer, integer) from public;
revoke all on function public.has_accepted_consent(uuid, integer, integer) from anon;
revoke all on function public.has_accepted_consent(uuid, integer, integer) from authenticated;
grant execute on function public.has_accepted_consent(uuid, integer, integer) to service_role;
