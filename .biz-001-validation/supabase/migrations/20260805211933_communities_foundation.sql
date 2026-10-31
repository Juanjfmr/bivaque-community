-- 019: Community entity — the optional belonging circle between locality and group.
-- Membership is by circumstance (you live in the vila, you were in that turma),
-- never by interest — interest is what groups are for.
-- No visibility column: a public community would be a contradiction. Every
-- community behaves as private — metadata discoverable, content gated.
-- All functions use set search_path = '' to prevent search-path injection.

create type public.community_membership_role as enum (
  'member',
  'moderator',
  'owner'
);

create type public.community_membership_status as enum (
  'pending',
  'approved'
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  locality_id uuid not null references public.localities (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) between 1 and 500),
  created_by uuid not null references auth.users (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, locality_id)
);

create index communities_locality_idx
  on public.communities (locality_id) where is_deleted = false;

create table public.community_memberships (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.community_membership_role not null default 'member',
  status public.community_membership_status not null default 'pending',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index community_memberships_user_idx
  on public.community_memberships (user_id) where status = 'approved';

alter table public.communities enable row level security;
alter table public.communities force row level security;
alter table public.community_memberships enable row level security;
alter table public.community_memberships force row level security;

revoke all on table public.communities from anon, authenticated;
revoke all on table public.community_memberships from anon, authenticated;

grant select on table public.communities to authenticated;
grant select on table public.community_memberships to authenticated;

grant select, insert, update on table public.communities to service_role;
grant select, insert, update, delete on table public.community_memberships to service_role;

create function private.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
  );
$$;

revoke all on function private.is_community_member(uuid) from public;
revoke all on function private.is_community_member(uuid) from anon;
revoke all on function private.is_community_member(uuid) from authenticated;
grant execute on function private.is_community_member(uuid) to authenticated;

create function private.is_community_moderator(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
      and role in ('moderator', 'owner')
  );
$$;

revoke all on function private.is_community_moderator(uuid) from public;
revoke all on function private.is_community_moderator(uuid) from anon;
revoke all on function private.is_community_moderator(uuid) from authenticated;
grant execute on function private.is_community_moderator(uuid) to authenticated;

-- SELECT on communities: metadata is discoverable by any locality member so
-- they can find the vila and request entry. Content gating lives elsewhere.
create policy communities_select_locality_member
on public.communities
for select
to authenticated
using (
  private.is_locality_member(locality_id)
  and is_deleted = false
);

-- No INSERT / UPDATE / DELETE policy for authenticated. Provisioning is
-- service_role only (spec §7.1) and removal is is_deleted, never DELETE.

-- SELECT on memberships: approved members see the whole roster (spec D9),
-- and everyone sees their own row so a pending request is visible to its author.
create policy community_memberships_select_comember
on public.community_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_community_member(community_id)
);

-- No INSERT / UPDATE / DELETE policy for authenticated: all mutation goes
-- through the RPCs added in the community_rpcs migration.
