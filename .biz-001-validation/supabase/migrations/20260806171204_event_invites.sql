-- 033: Event invitations.
--
-- The events surface had no invite concept — the "Convidado" tab was a
-- placeholder ("em breve"). This table lets the organizer invite
-- community members to an event. Scope mirrors the DM context rules:
-- an organizer can invite anyone they share a group, community or
-- family link with; RLS limits reads to organizer + invitee.
--
-- The notification fan-out (notify the invitee) is deliberately out of
-- scope — the invitee sees the invitation in the events "Convidado"
-- tab (MAP 6a), a future notifications wave can wire the fan-out.

create type public.event_invite_status as enum (
  'pending',
  'accepted',
  'declined'
);

create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  invitee_user_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete cascade,
  status public.event_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (event_id, invitee_user_id)
);

alter table public.event_invites enable row level security;
alter table public.event_invites force row level security;

revoke all on table public.event_invites from anon, authenticated;

grant select, insert, update on table public.event_invites to authenticated;
grant select, insert, update, delete on table public.event_invites to service_role;

-- organizer can read invites on their event
create policy event_invites_select_organizer
on public.event_invites
for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and e.organizer_id = (select auth.uid())
  )
);

-- invitee can read their own invitation
create policy event_invites_select_invitee
on public.event_invites
for select
to authenticated
using (invitee_user_id = (select auth.uid()));

-- only the event organizer can create invitations
create policy event_invites_insert_organizer
on public.event_invites
for insert
to authenticated
with check (
  invited_by = (select auth.uid())
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.organizer_id = (select auth.uid())
  )
);

-- invitee can respond (accept/decline); organizer can revoke
create policy event_invites_update_participant
on public.event_invites
for update
to authenticated
using (
  invitee_user_id = (select auth.uid())
  or exists (
    select 1 from public.events e
    where e.id = event_id
      and e.organizer_id = (select auth.uid())
  )
)
with check (
  invitee_user_id = (select auth.uid())
  or exists (
    select 1 from public.events e
    where e.id = event_id
      and e.organizer_id = (select auth.uid())
  )
);