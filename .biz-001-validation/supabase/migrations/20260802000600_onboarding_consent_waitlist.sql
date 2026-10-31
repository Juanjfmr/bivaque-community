-- 006: Onboarding consent and outside-city waitlist
-- Never stores CPF, Portal payload, OM, rank, or residential address.

-- ── Consent tracking on public.profiles ──
alter table public.profiles
  add column consent_version integer not null default 0,
  add column consented_at timestamptz;

-- ── Outside-city waitlist ──
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  locality_id uuid not null references public.localities (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (email, locality_id)
);

create index waitlist_locality_email_idx on public.waitlist (locality_id, email);

-- ── RLS ──
alter table public.waitlist enable row level security;
alter table public.waitlist force row level security;

revoke all on table public.waitlist from anon, authenticated;

-- Only the submitting user (identified by email hash — service role inserts on behalf)
-- and authenticated operators can see waitlist entries. But since waitlist is for
-- non-members and the user has no session when they join, the insert is done by
-- service_role via the server API route. Anon/authenticated get no direct access.
grant insert on table public.waitlist to service_role;
grant select, delete on table public.waitlist to service_role;

create policy waitlist_service_role_all
on public.waitlist
for all
to service_role
using (true)
with check (true);

-- ── Waitlist RPC (service_role write path) ──
create function public.add_to_waitlist(
  p_email text,
  p_locality_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.waitlist (email, locality_id)
  values (p_email, p_locality_id)
  on conflict (email, locality_id) do nothing;
end;
$$;

revoke all on function public.add_to_waitlist(text, uuid) from public;
grant execute on function public.add_to_waitlist(text, uuid) to service_role;
