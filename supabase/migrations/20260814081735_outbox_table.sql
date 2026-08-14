-- D1 Task 3 (Step 1): the delivery outbox. The trigger never sends — it
-- enqueues. A channel column makes swapping the unofficial WhatsApp for the
-- Cloud API a new adapter, not a rewrite (§7.8 requirement 2). The worker and
-- the concrete channel adapters land in later tasks.

create type public.outbox_channel as enum ('email', 'whatsapp');

create type public.outbox_status as enum ('pending', 'sent', 'failed', 'skipped');

create table public.outbox (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  channel public.outbox_channel not null,
  type text not null check (char_length(type) between 1 and 50),
  payload jsonb not null default '{}'::jsonb,
  status public.outbox_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outbox_pending_created_idx
  on public.outbox (created_at)
  where status = 'pending';

-- Operational table: the payload carries notification content. RLS is forced,
-- and no Data API role has any privilege here.
alter table public.outbox enable row level security;
alter table public.outbox force row level security;

revoke all on table public.outbox from anon, authenticated;
grant all on table public.outbox to service_role;
