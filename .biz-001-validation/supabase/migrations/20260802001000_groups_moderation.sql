-- 010: Community Groups with public/private admission and moderation
-- Any verified Manaus member can create groups. Creator becomes the first
-- owner/moderator. Public groups are directly joinable; private group metadata
-- is discoverable but contents and members require approved membership.
-- Moderators (and owners) can add and remove co-moderators and approve pending
-- private-group requests. Successor handling via ownership transfer.
-- Never: secret groups, institutional roles, OM filter.

-- ── Enums ────────────────────────────────────────────────────────────────────

create type public.group_visibility as enum (
  'public',
  'private'
);

create type public.group_membership_role as enum (
  'member',
  'moderator',
  'owner'
);

create type public.group_membership_status as enum (
  'pending',
  'approved'
);

-- ── Tables ───────────────────────────────────────────────────────────────────

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) between 1 and 500),
  visibility public.group_visibility not null default 'public',
  locality_id uuid not null references public.localities (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index groups_locality_visibility_idx
  on public.groups (locality_id, visibility);

create table public.group_memberships (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.group_membership_role not null default 'member',
  status public.group_membership_status not null default 'approved',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_memberships_user_idx
  on public.group_memberships (user_id);

-- ── RLS enable + force ───────────────────────────────────────────────────────

alter table public.groups enable row level security;
alter table public.groups force row level security;
alter table public.group_memberships enable row level security;
alter table public.group_memberships force row level security;

-- ── Minimum table grants ─────────────────────────────────────────────────────

revoke all on table public.groups from anon, authenticated;
revoke all on table public.group_memberships from anon, authenticated;

grant select on table public.groups to authenticated;
grant insert on table public.groups to authenticated;

grant select, insert, update, delete
  on table public.group_memberships to authenticated;

-- ── Private helpers (security definer, set search_path = '') ─────────────────

create function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and status = 'approved'
  );
$$;

revoke all on function private.is_group_member(uuid) from public;
revoke all on function private.is_group_member(uuid) from anon;
revoke all on function private.is_group_member(uuid) from authenticated;

grant execute on function private.is_group_member(uuid) to authenticated;

create function private.is_group_moderator(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role in ('moderator', 'owner')
      and status = 'approved'
  );
$$;

revoke all on function private.is_group_moderator(uuid) from public;
revoke all on function private.is_group_moderator(uuid) from anon;
revoke all on function private.is_group_moderator(uuid) from authenticated;

grant execute on function private.is_group_moderator(uuid) to authenticated;

-- ── RLS: groups ──────────────────────────────────────────────────────────────

-- Any locality member can read group metadata (public + private groups
-- are both discoverable within the locality).
create policy groups_select_locality_member
on public.groups
for select
to authenticated
using (private.is_locality_member(locality_id));

-- Only verified locality members can insert a group row. The matching
-- membership row is created atomically by public.create_group.
create policy groups_insert_verified_member
on public.groups
for insert
to authenticated
with check (
  private.is_verified_locality_member(locality_id)
  and created_by = (select auth.uid())
  and owner_user_id = (select auth.uid())
);

-- Only the group owner can update the group row.
create policy groups_update_owner
on public.groups
for update
to authenticated
using (private.is_group_member(id) and private.is_group_moderator(id));

-- Only the group owner can delete (cascades to memberships).
create policy groups_delete_owner
on public.groups
for delete
to authenticated
using (owner_user_id = (select auth.uid()));

-- ── RLS: group_memberships ───────────────────────────────────────────────────

-- For public groups every locality member sees the member list.
-- For private groups only approved members see the member list.
create policy group_memberships_select
on public.group_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_memberships.group_id
      and (
        g.visibility = 'public'
        or private.is_group_member(g.id)
      )
  )
);

-- Insert via join/request. Public groups may be joined directly with
-- approved status; private groups must start as pending.
create policy group_memberships_insert_self
on public.group_memberships
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'member'
  and exists (
    select 1
    from public.groups g
    where g.id = group_memberships.group_id
      and private.is_locality_member(g.locality_id)
  )
  and status = case
    when exists (
      select 1
      from public.groups g
      where g.id = group_memberships.group_id
        and g.visibility = 'public'
    ) then 'approved'::public.group_membership_status
    else 'pending'::public.group_membership_status
  end
);

-- Self: leave group (delete own membership).
create policy group_memberships_delete_self
on public.group_memberships
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Moderator: update role / status of members within their group.
create policy group_memberships_update_moderator
on public.group_memberships
for update
to authenticated
using (private.is_group_moderator(group_id))
with check (private.is_group_moderator(group_id));

-- Moderator: remove members from their group.
create policy group_memberships_delete_moderator
on public.group_memberships
for delete
to authenticated
using (private.is_group_moderator(group_id));

-- ── Public RPC: create group (atomic group + initial membership) ─────────────

create function public.create_group(
  p_name text,
  p_visibility public.group_visibility,
  p_locality_id uuid,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if not private.is_verified_locality_member(p_locality_id) then
    raise exception 'only verified locality members can create groups';
  end if;

  insert into public.groups (
    name, description, visibility, locality_id, created_by, owner_user_id
  )
  values (
    p_name, p_description, p_visibility, p_locality_id, auth.uid(), auth.uid()
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, auth.uid(), 'owner', 'approved');

  return v_group_id;
end;
$$;

revoke all on function public.create_group(text, public.group_visibility, uuid, text)
  from public;
revoke all on function public.create_group(text, public.group_visibility, uuid, text)
  from anon;
revoke all on function public.create_group(text, public.group_visibility, uuid, text)
  from authenticated;

grant execute on function public.create_group(
  text, public.group_visibility, uuid, text
) to authenticated;

-- ── Public RPC: join / request membership ────────────────────────────────────

create function public.join_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locality_id uuid;
  v_visibility public.group_visibility;
  v_status public.group_membership_status;
begin
  select locality_id, visibility
  into v_locality_id, v_visibility
  from public.groups
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'must be a locality member to join groups';
  end if;

  v_status := case
    when v_visibility = 'public' then 'approved'::public.group_membership_status
    else 'pending'::public.group_membership_status
  end;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (p_group_id, auth.uid(), 'member', v_status)
  on conflict (group_id, user_id) do nothing;
end;
$$;

revoke all on function public.join_group(uuid) from public;
revoke all on function public.join_group(uuid) from anon;
revoke all on function public.join_group(uuid) from authenticated;

grant execute on function public.join_group(uuid) to authenticated;

-- ── Public RPC: approve pending membership (moderator / owner only) ──────────

create function public.approve_group_member(
  p_group_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can approve members';
  end if;

  update public.group_memberships
  set status = 'approved'
  where group_id = p_group_id
    and user_id = p_user_id
    and status = 'pending';

  if not found then
    raise exception 'pending membership not found for this user';
  end if;
end;
$$;

revoke all on function public.approve_group_member(uuid, uuid) from public;
revoke all on function public.approve_group_member(uuid, uuid) from anon;
revoke all on function public.approve_group_member(uuid, uuid) from authenticated;

grant execute on function public.approve_group_member(uuid, uuid)
  to authenticated;

-- ── Public RPC: add co-moderator (owner / moderator only) ────────────────────

create function public.add_group_moderator(
  p_group_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can add co-moderators';
  end if;

  update public.group_memberships
  set role = 'moderator'
  where group_id = p_group_id
    and user_id = p_user_id
    and status = 'approved'
    and role = 'member';

  if not found then
    raise exception 'user is not an approved member of this group';
  end if;
end;
$$;

revoke all on function public.add_group_moderator(uuid, uuid) from public;
revoke all on function public.add_group_moderator(uuid, uuid) from anon;
revoke all on function public.add_group_moderator(uuid, uuid) from authenticated;

grant execute on function public.add_group_moderator(uuid, uuid)
  to authenticated;

-- ── Public RPC: remove co-moderator (owner / moderator only) ─────────────────

create function public.remove_group_moderator(
  p_group_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can remove co-moderators';
  end if;

  -- Cannot remove the owner.
  if exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = p_user_id
      and role = 'owner'
  ) then
    raise exception 'cannot demote the group owner';
  end if;

  update public.group_memberships
  set role = 'member'
  where group_id = p_group_id
    and user_id = p_user_id
    and role = 'moderator';

  if not found then
    raise exception 'user is not a moderator of this group';
  end if;
end;
$$;

revoke all on function public.remove_group_moderator(uuid, uuid) from public;
revoke all on function public.remove_group_moderator(uuid, uuid) from anon;
revoke all on function public.remove_group_moderator(uuid, uuid) from authenticated;

grant execute on function public.remove_group_moderator(uuid, uuid)
  to authenticated;

-- ── Private helper: is_group_owner ───────────────────────────────────────────

create function private.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role = 'owner'
      and status = 'approved'
  );
$$;

revoke all on function private.is_group_owner(uuid) from public;
revoke all on function private.is_group_owner(uuid) from anon;
revoke all on function private.is_group_owner(uuid) from authenticated;

grant execute on function private.is_group_owner(uuid) to authenticated;

-- ── Public RPC: transfer group ownership (owner only) ────────────────────────

create function public.transfer_group_ownership(
  p_group_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can transfer ownership';
  end if;

  if not exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = p_new_owner_user_id
      and status = 'approved'
  ) then
    raise exception 'new owner must be an approved member of this group';
  end if;

  -- Demote current owner to moderator.
  update public.group_memberships
  set role = 'moderator'
  where group_id = p_group_id
    and user_id = (select auth.uid());

  -- Promote new owner.
  update public.group_memberships
  set role = 'owner'
  where group_id = p_group_id
    and user_id = p_new_owner_user_id;

  -- Update the owner_user_id column on the group.
  update public.groups
  set owner_user_id = p_new_owner_user_id
  where id = p_group_id;
end;
$$;

revoke all on function public.transfer_group_ownership(uuid, uuid) from public;
revoke all on function public.transfer_group_ownership(uuid, uuid) from anon;
revoke all on function public.transfer_group_ownership(uuid, uuid) from authenticated;

grant execute on function public.transfer_group_ownership(uuid, uuid)
  to authenticated;
