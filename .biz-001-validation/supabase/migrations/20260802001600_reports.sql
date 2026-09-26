-- 016: Reports and operator moderation workflow
-- Members can report posts, comments, groups, or messages. Reporter identity
-- is protected: only the reporter and service_role (operator dashboard) can
-- read reports. Resolution is operator-only and auditable.
-- Soft-delete columns on posts, comments, and groups allow operators to
-- suppress content without hard deletion.
-- All functions use set search_path = '' to prevent search-path injection.

-- ── Enums ────────────────────────────────────────────────────────────────────

create type public.report_target_type as enum (
  'post',
  'comment',
  'group',
  'message'
);

create type public.report_status as enum (
  'open',
  'resolved'
);

-- ── reports table ────────────────────────────────────────────────────────────

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status public.report_status not null default 'open',
  operator_note text check (operator_note is null or char_length(operator_note) > 0),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_reporter_idx
  on public.reports (reporter_user_id, created_at desc);

create index reports_target_idx
  on public.reports (target_type, target_id);

create index reports_status_idx
  on public.reports (status) where status = 'open';

-- Prevent duplicate open reports from the same reporter on the same target.
create unique index reports_one_open_per_reporter_target_idx
  on public.reports (reporter_user_id, target_type, target_id)
  where status = 'open';

-- ── Soft-delete columns on reportable targets ────────────────────────────────

alter table public.posts add column is_deleted boolean not null default false;
alter table public.comments add column is_deleted boolean not null default false;
alter table public.groups add column is_deleted boolean not null default false;

-- ── Self-report prevention trigger ───────────────────────────────────────────

create function private.reports_block_self()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  case new.target_type
    when 'post' then
      select user_id into v_owner_id
      from public.posts where id = new.target_id;
    when 'comment' then
      select user_id into v_owner_id
      from public.comments where id = new.target_id;
    when 'group' then
      select owner_user_id into v_owner_id
      from public.groups where id = new.target_id;
    else
      v_owner_id := null;
  end case;

  if v_owner_id is not null and v_owner_id = new.reporter_user_id then
    raise exception 'cannot report your own content';
  end if;

  return new;
end;
$$;

create trigger reports_block_self_trigger
  before insert on public.reports
  for each row
  execute function private.reports_block_self();

-- ── RLS enable + force ───────────────────────────────────────────────────────

alter table public.reports enable row level security;
alter table public.reports force row level security;

-- ── Minimal grants ───────────────────────────────────────────────────────────

revoke all on table public.reports from anon, authenticated;

grant insert, select, update on table public.reports to authenticated;
-- UPDATE grant is required so RLS can silently reject (no policy → 0 rows).

-- service_role has full access (operator dashboard)
grant select, update on table public.reports to service_role;

-- service_role can soft-delete content on target tables
grant update (is_deleted) on table public.posts to service_role;
grant update (is_deleted) on table public.comments to service_role;
grant update (is_deleted) on table public.groups to service_role;

-- Ensure authenticated can reach RLS for soft-delete rejection (no UPDATE policy
-- means 0 rows; the trigger below provides defence-in-depth for the is_deleted column).
grant update on table public.groups to authenticated;

-- ── RLS policies: reports ────────────────────────────────────────────────────

-- SELECT: reporter sees their own reports. service_role sees all (bypass RLS).
-- Ordinary members must never see other members' reports or reporter user IDs.
create policy reports_select_reporter_only
on public.reports
for select
to authenticated
using (reporter_user_id = (select auth.uid()));

-- INSERT: authenticated members can report content. Self-report blocked by
-- trigger above. Duplicates blocked by unique partial index.
create policy reports_insert_authenticated
on public.reports
for insert
to authenticated
with check (
  reporter_user_id = (select auth.uid())
  and exists (
    select 1 from public.locality_memberships
    where user_id = (select auth.uid())
  )
);

-- UPDATE: authenticated members cannot update reports. service_role resolves
-- them via the operator dashboard (service_role bypasses RLS).
-- No UPDATE policy for authenticated = effectively blocked.

-- DELETE: nobody can delete reports — they are an audit trail.
-- No DELETE policy = blocked for all roles including service_role.

-- ── Update feed_posts to filter soft-deleted posts ───────────────────────────

drop function if exists public.feed_posts(uuid, text);
create function public.feed_posts(
  p_locality_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.locality_id,
    p.user_id,
    p.group_id,
    p.post_type,
    p.content,
    p.photo_path,
    p.link_url,
    p.poll_options,
    p.created_at,
    coalesce(c_counts.cnt, 0) as comment_count,
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt
    from public.comments c
    where c.post_id = p.id
      and c.is_deleted = false
  ) c_counts on true
  left join public.profiles pr
    on pr.user_id = p.user_id
   and pr.locality_id = p.locality_id
  where p.locality_id = p_locality_id
    and p.is_deleted = false
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;

grant execute on function public.feed_posts(uuid, text) to authenticated;

-- ── Soft-delete protection: only service_role can toggle is_deleted ──────────

create function private.block_authenticated_soft_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    raise exception 'only service_role can toggle is_deleted';
  end if;
  return new;
end;
$$;

create trigger block_soft_delete_posts
before update of is_deleted on public.posts
for each row
when (new.is_deleted is distinct from old.is_deleted)
execute function private.block_authenticated_soft_delete();

create trigger block_soft_delete_comments
before update of is_deleted on public.comments
for each row
when (new.is_deleted is distinct from old.is_deleted)
execute function private.block_authenticated_soft_delete();

create trigger block_soft_delete_groups
before update of is_deleted on public.groups
for each row
when (new.is_deleted is distinct from old.is_deleted)
execute function private.block_authenticated_soft_delete();
