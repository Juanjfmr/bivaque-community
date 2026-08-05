-- 022: Community RPCs.
-- create_community is service_role only: provisioning is a runbook step until
-- the admin panel exists. Authorization lives in the GRANT and the RPC, never
-- in the data — swapping delegated creation for a quorum path later must be a
-- new RPC with a different grant, not a migration on membership or scope.

create function public.create_community(
  p_name text,
  p_description text,
  p_locality_id uuid,
  p_owner_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_community_id uuid;
begin
  if not exists (
    select 1 from public.locality_memberships
    where user_id = p_owner_user_id and locality_id = p_locality_id
  ) then
    raise exception 'owner must be a member of the locality';
  end if;

  insert into public.communities (
    locality_id, name, description, created_by, owner_user_id
  )
  values (
    p_locality_id, p_name, p_description, p_owner_user_id, p_owner_user_id
  )
  returning id into v_community_id;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (v_community_id, p_owner_user_id, 'owner', 'approved');

  return v_community_id;
end;
$$;

revoke all on function public.create_community(text, text, uuid, uuid) from public;
revoke all on function public.create_community(text, text, uuid, uuid) from anon;
revoke all on function public.create_community(text, text, uuid, uuid) from authenticated;
grant execute on function public.create_community(text, text, uuid, uuid) to service_role;

create function public.request_community_membership(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locality_id uuid;
begin
  select locality_id into v_locality_id
  from public.communities
  where id = p_community_id and is_deleted = false;

  if v_locality_id is null then
    raise exception 'community not found';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'not a member of this locality';
  end if;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (p_community_id, (select auth.uid()), 'member', 'pending')
  on conflict (community_id, user_id) do nothing;
end;
$$;

revoke all on function public.request_community_membership(uuid) from public;
revoke all on function public.request_community_membership(uuid) from anon;
grant execute on function public.request_community_membership(uuid) to authenticated;

create function public.approve_community_member(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_community_moderator(p_community_id) then
    raise exception 'only moderators can approve members';
  end if;

  update public.community_memberships
  set status = 'approved'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'pending';
end;
$$;

revoke all on function public.approve_community_member(uuid, uuid) from public;
revoke all on function public.approve_community_member(uuid, uuid) from anon;
grant execute on function public.approve_community_member(uuid, uuid) to authenticated;

create function public.remove_community_member(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_community_moderator(p_community_id) then
    raise exception 'only moderators can remove members';
  end if;

  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.remove_community_member(uuid, uuid) from public;
revoke all on function public.remove_community_member(uuid, uuid) from anon;
grant execute on function public.remove_community_member(uuid, uuid) to authenticated;

create function public.add_community_moderator(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_community_moderator(p_community_id) then
    raise exception 'only moderators can add moderators';
  end if;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'approved'
    and role = 'member';
end;
$$;

revoke all on function public.add_community_moderator(uuid, uuid) from public;
revoke all on function public.add_community_moderator(uuid, uuid) from anon;
grant execute on function public.add_community_moderator(uuid, uuid) to authenticated;

create function public.remove_community_moderator(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = (select auth.uid())
  ) then
    raise exception 'only the owner can remove moderators';
  end if;

  update public.community_memberships
  set role = 'member'
  where community_id = p_community_id
    and user_id = p_user_id
    and role = 'moderator';
end;
$$;

revoke all on function public.remove_community_moderator(uuid, uuid) from public;
revoke all on function public.remove_community_moderator(uuid, uuid) from anon;
grant execute on function public.remove_community_moderator(uuid, uuid) to authenticated;

create function public.transfer_community_ownership(
  p_community_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = (select auth.uid())
  ) then
    raise exception 'only the owner can transfer ownership';
  end if;

  if not exists (
    select 1 from public.community_memberships
    where community_id = p_community_id
      and user_id = p_new_owner_user_id
      and status = 'approved'
  ) then
    raise exception 'new owner must be an approved member';
  end if;

  update public.communities
  set owner_user_id = p_new_owner_user_id
  where id = p_community_id;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = (select auth.uid());

  update public.community_memberships
  set role = 'owner'
  where community_id = p_community_id
    and user_id = p_new_owner_user_id;
end;
$$;

revoke all on function public.transfer_community_ownership(uuid, uuid) from public;
revoke all on function public.transfer_community_ownership(uuid, uuid) from anon;
grant execute on function public.transfer_community_ownership(uuid, uuid) to authenticated;

-- Separate function rather than adding a parameter to create_group: the
-- existing signature is referenced by the app and by groups-public-private.sql.
create function public.create_group_in_community(
  p_name text,
  p_description text,
  p_visibility public.group_visibility,
  p_community_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_locality_id uuid;
begin
  if not private.is_community_member(p_community_id) then
    raise exception 'only approved community members can create groups here';
  end if;

  select locality_id into v_locality_id
  from public.communities
  where id = p_community_id and is_deleted = false;

  insert into public.groups (
    name, description, visibility, locality_id, community_id, created_by, owner_user_id
  )
  values (
    p_name, p_description, p_visibility, v_locality_id, p_community_id,
    (select auth.uid()), (select auth.uid())
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, (select auth.uid()), 'owner', 'approved');

  return v_group_id;
end;
$$;

revoke all on function public.create_group_in_community(text, text, public.group_visibility, uuid) from public;
revoke all on function public.create_group_in_community(text, text, public.group_visibility, uuid) from anon;
grant execute on function public.create_group_in_community(text, text, public.group_visibility, uuid) to authenticated;
