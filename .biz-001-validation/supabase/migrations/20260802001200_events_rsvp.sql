-- 012: Events with locality/group scope and RSVP
-- Security: RLS enabled+forced, minimal grants, security-definer helpers.
-- Venue column CHECK prevents personal/residential/military addresses.
-- No ticket, payment, public-alert, video-event, or sponsor columns.

create type public.event_status as enum ('upcoming', 'cancelled');

create type public.event_rsvp_status as enum ('interested', 'going');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users (id) on delete cascade,
  locality_id uuid not null references public.localities (id) on delete cascade,
  group_id uuid,
  title text not null check (char_length(title) between 2 and 200),
  description text check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text check (
    venue is null
    or (
      venue !~* '\m(rua|avenida|travessa|alameda|quadra|lote|cep|número|numero|apartamento|apto\b|bloco\s+\d|residencial|residência|residencia|condomínio|condominio|endereço|endereco|logradouro|bairro|complemento|referência|referencia|militar\s|quartel|batalhão|batalhao|regimento|base\s+aérea|base\s+aerea|base\s+naval|arsenal|depósito\s+militar|deposito\s+militar)\M'
    )
  ),
  status public.event_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.event_rsvp_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Block RSVP to your own event (CHECK constraints cannot reference other
-- rows, so this uses a trigger).
create function private.event_rsvps_block_self()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.events e
    where e.id = new.event_id
      and e.organizer_id = new.user_id
  ) then
    raise exception 'organizer cannot RSVP to their own event';
  end if;
  return new;
end;
$$;

create trigger event_rsvps_block_self_trigger
before insert or update on public.event_rsvps
for each row
execute function private.event_rsvps_block_self();

create index events_locality_id_idx on public.events (locality_id);
create index events_group_id_idx on public.events (group_id) where group_id is not null;
create index events_organizer_id_idx on public.events (organizer_id);
create index events_starts_at_idx on public.events (starts_at);
create index event_rsvps_event_id_idx on public.event_rsvps (event_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.events enable row level security;
alter table public.events force row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_rsvps force row level security;

revoke all on table public.events from anon, authenticated;
revoke all on table public.event_rsvps from anon, authenticated;

grant select, insert, update on table public.events to authenticated;
grant select, insert, update on table public.event_rsvps to authenticated;

-- ── RLS helper: is the auth.uid() a member of the event's parent locality ───

create function private.is_event_locality_member(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.locality_memberships m
      on m.locality_id = e.locality_id
     and m.user_id = (select auth.uid())
    where e.id = target_event_id
  );
$$;

revoke all on function private.is_event_locality_member(uuid) from public;
revoke all on function private.is_event_locality_member(uuid) from anon;
revoke all on function private.is_event_locality_member(uuid) from authenticated;

grant execute on function private.is_event_locality_member(uuid) to authenticated;

-- ── RLS policies: events ─────────────────────────────────────────────────────

-- locality-members can see events in their locality (locality-scoped or
-- group-scoped within their locality). Group-scoped events default to
-- locality-member visibility until group-membership RLS is wired by the
-- groups migration (todo 13).

create policy events_select_locality_member
on public.events
for select
to authenticated
using (private.is_event_locality_member(id));

-- verified locality members can insert events into their locality.
-- Organizer must be the authenticated user and a verified member.

create policy events_insert_verified_member
on public.events
for insert
to authenticated
with check (
  organizer_id = (select auth.uid())
  and private.is_verified_locality_member(locality_id)
);

-- organizer can update their own events (edit/cancel).

create policy events_update_organizer
on public.events
for update
to authenticated
using (organizer_id = (select auth.uid()))
with check (organizer_id = (select auth.uid()));

-- ── RLS policies: event_rsvps ────────────────────────────────────────────────

-- locality members can see RSVPs for events in their locality.

create policy event_rsvps_select_locality_member
on public.event_rsvps
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_rsvps.event_id
      and private.is_event_locality_member(e.id)
  )
);

-- user can insert their own RSVP (cannot RSVP to own event, enforced by CHECK).

create policy event_rsvps_insert_self
on public.event_rsvps
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_event_locality_member(event_id)
);

-- user can update their own RSVP status.

create policy event_rsvps_update_self
on public.event_rsvps
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
