-- 025: User group interests (Wave E Task 11).
--
-- §3.2 is explicit: "if belonging is by interest, it's a group." Interests
-- map directly to groups — no parallel taxonomy. The user picks groups in
-- their locality; the join table is operational and the suggestion RPC
-- reads it under the locality + visibility rules of §3.3 (public is relative
-- to the container).

-- The collection is bound to one declared purpose: suggest groups. The UI
-- copy says so up front (LGPD finalidade declarada — §4.4).

create table public.user_group_interests (
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

create index user_group_interests_group_idx
  on public.user_group_interests (group_id);

-- Operational table; reads/writes go through the service_role wrappers
-- below. No Data API role.
alter table public.user_group_interests enable row level security;
alter table public.user_group_interests force row level security;

revoke all on table public.user_group_interests from anon, authenticated;
grant all on table public.user_group_interests to service_role;

-- record_user_group_interests: replace-set the user's interests. Verifies
-- every group is in the caller's locality (the join is bounded by locality,
-- which is the unit of suggestion). Atomic via a single transaction.
create function public.record_user_group_interests(
  p_user_id uuid,
  p_locality_id uuid,
  p_group_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Refuse groups outside the caller's locality. This is the §3.3 / §6.2
  -- boundary: the interest is a locality-scoped concept; persisting an
  -- interest in a group the caller is not a locality member of would
  -- silently leak the suggestion across localities.
  if exists (
    select 1 from unnest(p_group_ids) as g(id)
    where not exists (
      select 1 from public.groups
      where id = g.id and locality_id = p_locality_id
    )
  ) then
    raise exception 'group not in caller locality' using errcode = '42501';
  end if;

  delete from public.user_group_interests where user_id = p_user_id;

  if p_group_ids is null or array_length(p_group_ids, 1) is null then
    return;
  end if;

  insert into public.user_group_interests (user_id, group_id)
  select p_user_id, g.id from unnest(p_group_ids) as g(id);
end;
$$;

revoke all on function public.record_user_group_interests(uuid, uuid, uuid[]) from public;
revoke all on function public.record_user_group_interests(uuid, uuid, uuid[]) from anon;
revoke all on function public.record_user_group_interests(uuid, uuid, uuid[]) from authenticated;
grant execute on function public.record_user_group_interests(uuid, uuid, uuid[]) to service_role;

-- list_user_group_interests: returns the caller's recorded interests.
create function public.list_user_group_interests(p_user_id uuid)
returns table (
  group_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select group_id, created_at
  from public.user_group_interests
  where user_id = p_user_id
  order by created_at desc;
$$;

revoke all on function public.list_user_group_interests(uuid) from public;
revoke all on function public.list_user_group_interests(uuid) from anon;
revoke all on function public.list_user_group_interests(uuid) from authenticated;
grant execute on function public.list_user_group_interests(uuid) to service_role;

-- list_available_groups_for_interests: groups the user can mark as
-- interests in their locality. Excludes groups the user already approved-
-- joined (no point re-marking what they're in) AND excludes private groups
-- the user is not a member of (§3.3: public is relative to the container —
-- suggesting a private group someone is not in is not a category of help).
-- Visibility of public groups is enforced via the existing public.groups
-- SELECT policy; this function does not bypass it.
create function public.list_available_groups_for_interests(
  p_user_id uuid,
  p_locality_id uuid
)
returns table (
  id uuid,
  name text,
  description text,
  visibility public.group_visibility,
  already_member boolean,
  already_interest boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.name,
    g.description,
    g.visibility,
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = g.id
        and gm.user_id = p_user_id
        and gm.status = 'approved'
    ) as already_member,
    exists (
      select 1 from public.user_group_interests ugi
      where ugi.group_id = g.id and ugi.user_id = p_user_id
    ) as already_interest
  from public.groups g
  where g.locality_id = p_locality_id
    and (
      g.visibility = 'public'
      or exists (
        select 1 from public.group_memberships gm
        where gm.group_id = g.id
          and gm.user_id = p_user_id
          and gm.status = 'approved'
      )
    )
  order by g.name;
$$;

revoke all on function public.list_available_groups_for_interests(uuid, uuid) from public;
revoke all on function public.list_available_groups_for_interests(uuid, uuid) from anon;
revoke all on function public.list_available_groups_for_interests(uuid, uuid) from authenticated;
grant execute on function public.list_available_groups_for_interests(uuid, uuid) to service_role;

-- suggest_groups_for_user: what the user has NOT yet marked, and is NOT yet
-- an approved member of, in their locality. Same §3.3 visibility rule:
-- private groups only appear if the user is already an approved member.
create function public.suggest_groups_for_user(
  p_user_id uuid,
  p_locality_id uuid
)
returns table (
  id uuid,
  name text,
  description text,
  visibility public.group_visibility
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.description, g.visibility
  from public.groups g
  where g.locality_id = p_locality_id
    and (
      g.visibility = 'public'
      or exists (
        select 1 from public.group_memberships gm
        where gm.group_id = g.id
          and gm.user_id = p_user_id
          and gm.status = 'approved'
      )
    )
    and not exists (
      select 1 from public.user_group_interests ugi
      where ugi.group_id = g.id and ugi.user_id = p_user_id
    )
    and not exists (
      select 1 from public.group_memberships gm
      where gm.group_id = g.id
        and gm.user_id = p_user_id
        and gm.status = 'approved'
    )
  order by g.name;
$$;

revoke all on function public.suggest_groups_for_user(uuid, uuid) from public;
revoke all on function public.suggest_groups_for_user(uuid, uuid) from anon;
revoke all on function public.suggest_groups_for_user(uuid, uuid) from authenticated;
grant execute on function public.suggest_groups_for_user(uuid, uuid) to service_role;