-- 032: Notification preferences.
--
-- One row per user, booleans per channel. RLS enabled + forced,
-- own-row-only policies. The avatars bucket already exists (migration
-- 005, storage_buckets) — the Onda 4 upload UI reuses it, no storage
-- work in this migration.

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages boolean not null default true,
  comments boolean not null default true,
  events boolean not null default true,
  mentions boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;

revoke all on table public.notification_preferences from anon, authenticated;

grant select, insert, update on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.notification_preferences to service_role;

create policy notification_preferences_select_own
on public.notification_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

create policy notification_preferences_insert_own
on public.notification_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy notification_preferences_update_own
on public.notification_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));