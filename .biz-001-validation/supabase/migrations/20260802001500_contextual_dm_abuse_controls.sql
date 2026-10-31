-- 015: Contextual direct messages with abuse controls
-- Conversations allowed only after a shared group, shared event,
-- recommendation thread participation, or accepted family invitation.
-- No global people search, no open unsolicited inbox, no realtime
-- dependency, no third-user read access.
-- Abuse primitives: block and report (report workflow in todo 18).

-- ── conversation context type ────────────────────────────────────────────────

create type public.dm_context_type as enum (
  'shared_group',
  'shared_event',
  'recommendation_thread',
  'accepted_family'
);

-- ── tables ───────────────────────────────────────────────────────────────────

create table public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users (id) on delete cascade,
  participant_b uuid not null references auth.users (id) on delete cascade,
  context_type public.dm_context_type not null,
  context_id uuid not null,
  created_at timestamptz not null default now(),
  constraint dm_conversations_ordered check (participant_a < participant_b),
  constraint dm_conversations_unique_pair unique (participant_a, participant_b)
);

create index dm_conversations_participant_a_idx
  on public.dm_conversations (participant_a, created_at desc);

create index dm_conversations_participant_b_idx
  on public.dm_conversations (participant_b, created_at desc);

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint dm_message_no_pii check (
    content !~* '\m(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}|cpf|patente|posto\s+militar|gradua[cç][aã]o\s+militar|OM\s|organiza[cç][aã]o\s+militar|endere[cç]o|resid[eê]ncia|residencia|rua\s+\w+|avenida\s+\w+|quadra\s+\d|lote\s+\d|cep\s+\d|bairro\s+\w+|logradouro|portal\s+da\s+transpar[eê]ncia)\M'
  )
);

create index dm_messages_conversation_idx
  on public.dm_messages (conversation_id, created_at);

create index dm_messages_sender_idx
  on public.dm_messages (sender_id, created_at);

create table public.dm_blocks (
  blocker_user_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint dm_blocks_no_self check (blocker_user_id <> blocked_user_id)
);

create index dm_blocks_blocked_idx
  on public.dm_blocks (blocked_user_id);

create table public.dm_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.dm_messages (id) on delete cascade,
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 500),
  created_at timestamptz not null default now()
);

create index dm_reports_message_idx
  on public.dm_reports (message_id);

create index dm_reports_reporter_idx
  on public.dm_reports (reporter_user_id);

-- ── RLS enable + force ───────────────────────────────────────────────────────

alter table public.dm_conversations enable row level security;
alter table public.dm_conversations force row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_messages force row level security;
alter table public.dm_blocks enable row level security;
alter table public.dm_blocks force row level security;
alter table public.dm_reports enable row level security;
alter table public.dm_reports force row level security;

-- ── minimal table grants ─────────────────────────────────────────────────────

revoke all on table public.dm_conversations from anon, authenticated;
revoke all on table public.dm_messages from anon, authenticated;
revoke all on table public.dm_blocks from anon, authenticated;
revoke all on table public.dm_reports from anon, authenticated;

grant select, insert on table public.dm_conversations to authenticated;
grant select, insert on table public.dm_messages to authenticated;
grant select, insert, delete on table public.dm_blocks to authenticated;
grant select, insert on table public.dm_reports to authenticated;

-- ── private helper: can_dm_between ───────────────────────────────────────────
-- true when two users share a group, event RSVP, recommendation thread, or
-- accepted family link. Auth context is NOT used — the function is a pure
-- relationship check between two explicit user IDs.

create function private.can_dm_between(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.group_memberships a
      join public.group_memberships b
        on b.group_id = a.group_id
       and b.user_id = p_user_b
      where a.user_id = p_user_a
        and a.status = 'approved'
        and b.status = 'approved'
    )
    or exists (
      select 1
      from public.event_rsvps a
      join public.event_rsvps b
        on b.event_id = a.event_id
       and b.user_id = p_user_b
      where a.user_id = p_user_a
    )
    or exists (
      select 1
      from public.recommendation_replies ra
      join public.recommendation_replies rb
        on rb.request_id = ra.request_id
       and rb.author_id = p_user_b
      where ra.author_id = p_user_a
      union
      select 1
      from public.recommendation_requests r
      join public.recommendation_replies rep
        on rep.request_id = r.id
      where (r.author_id = p_user_a and rep.author_id = p_user_b)
         or (r.author_id = p_user_b and rep.author_id = p_user_a)
    )
    or exists (
      select 1
      from private.family_account_links
      where (holder_user_id = p_user_a and family_user_id = p_user_b)
         or (holder_user_id = p_user_b and family_user_id = p_user_a)
    );
$$;

revoke all on function private.can_dm_between(uuid, uuid) from public;
revoke all on function private.can_dm_between(uuid, uuid) from anon;
revoke all on function private.can_dm_between(uuid, uuid) from authenticated;

grant execute on function private.can_dm_between(uuid, uuid) to authenticated;

-- ── helper: is participant in a conversation ─────────────────────────────────

create function private.is_dm_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dm_conversations c
    where c.id = p_conversation_id
      and (c.participant_a = (select auth.uid())
           or c.participant_b = (select auth.uid()))
  );
$$;

revoke all on function private.is_dm_participant(uuid) from public;
revoke all on function private.is_dm_participant(uuid) from anon;
revoke all on function private.is_dm_participant(uuid) from authenticated;

grant execute on function private.is_dm_participant(uuid) to authenticated;

-- ── helper: is blocked by the other participant ──────────────────────────────

create function private.is_dm_blocked_by_other(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dm_conversations c
    join public.dm_blocks b
      on b.blocker_user_id = case
        when c.participant_a = (select auth.uid()) then c.participant_b
        else c.participant_a
      end
     and b.blocked_user_id = (select auth.uid())
    where c.id = p_conversation_id
  );
$$;

revoke all on function private.is_dm_blocked_by_other(uuid) from public;
revoke all on function private.is_dm_blocked_by_other(uuid) from anon;
revoke all on function private.is_dm_blocked_by_other(uuid) from authenticated;

grant execute on function private.is_dm_blocked_by_other(uuid) to authenticated;

-- ── RLS: dm_conversations ────────────────────────────────────────────────────

-- Participants can see their own conversations.
create policy dm_conversations_select_participant
on public.dm_conversations
for select
to authenticated
using (
  participant_a = (select auth.uid())
  or participant_b = (select auth.uid())
);

-- Insert only when the authenticated user is participant_a, the other is
-- participant_b, a valid context exists, and no block between them.
create policy dm_conversations_insert_context_gated
on public.dm_conversations
for insert
to authenticated
with check (
  participant_a = (select auth.uid())
  and private.can_dm_between(participant_a, participant_b)
  and not exists (
    select 1
    from public.dm_blocks
    where (blocker_user_id = participant_a and blocked_user_id = participant_b)
       or (blocker_user_id = participant_b and blocked_user_id = participant_a)
  )
);

-- ── RLS: dm_messages ─────────────────────────────────────────────────────────

-- Only conversation participants can read messages.
create policy dm_messages_select_participant
on public.dm_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (c.participant_a = (select auth.uid())
           or c.participant_b = (select auth.uid()))
  )
);

-- Participants can send messages to conversations they're in, unless the
-- other participant has blocked them.
create policy dm_messages_insert_sender
on public.dm_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_dm_participant(conversation_id)
  and not private.is_dm_blocked_by_other(conversation_id)
);

-- ── RLS: dm_blocks ───────────────────────────────────────────────────────────

-- Users can see blocks they have created (both directions for awareness).
create policy dm_blocks_select_self
on public.dm_blocks
for select
to authenticated
using (
  blocker_user_id = (select auth.uid())
  or blocked_user_id = (select auth.uid())
);

-- Users can block another user.
create policy dm_blocks_insert_self
on public.dm_blocks
for insert
to authenticated
with check (blocker_user_id = (select auth.uid()));

-- Users can unblock (delete their own blocks).
create policy dm_blocks_delete_self
on public.dm_blocks
for delete
to authenticated
using (blocker_user_id = (select auth.uid()));

-- ── RLS: dm_reports ──────────────────────────────────────────────────────────

-- Users can see their own reports.
create policy dm_reports_select_own
on public.dm_reports
for select
to authenticated
using (reporter_user_id = (select auth.uid()));

-- Users can report messages from conversations they participate in.
create policy dm_reports_insert_own
on public.dm_reports
for insert
to authenticated
with check (
  reporter_user_id = (select auth.uid())
  and exists (
    select 1
    from public.dm_messages m
    join public.dm_conversations c
      on c.id = m.conversation_id
    where m.id = dm_reports.message_id
      and (c.participant_a = (select auth.uid())
           or c.participant_b = (select auth.uid()))
  )
);
