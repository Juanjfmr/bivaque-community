-- Business pages may belong to an admitted member or an active civil provider.
-- A member's locality is derived from the authenticated current membership.

alter table public.provider_profiles
  drop constraint provider_profiles_owner_user_id_fkey;

alter table public.provider_profiles
  add constraint provider_profiles_owner_user_id_fkey
  foreign key (owner_user_id) references auth.users (id) on delete cascade;

create or replace function public.can_manage_provider_profile(p_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.provider_profiles p
     where p.id = p_provider_id
       and p.owner_user_id = (select auth.uid())
       and (
         exists (
           select 1
             from public.provider_accounts pa
            where pa.auth_user_id = p.owner_user_id
              and pa.revoked_at is null
         )
         or (
           not exists (
             select 1 from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
           )
           and exists (
             select 1
               from public.provider_reach r
               join public.locality_memberships lm
                 on lm.user_id = p.owner_user_id
                and lm.locality_id = r.scope_id
              where r.provider_id = p.id
                and r.scope_type = 'locality'
                and r.source = 'free'
                and r.active
                and lm.kind = 'current'
                and lm.access = 'active'
           )
         )
       )
  );
$$;

revoke all on function public.can_manage_provider_profile(uuid) from public, anon;
grant execute on function public.can_manage_provider_profile(uuid) to authenticated, service_role;

create or replace function private.can_see_provider(p_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.provider_profiles p
     where p.id = p_provider_id
       and p.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
      from public.provider_profiles p
      join public.provider_reach r
        on r.provider_id = p.id
       and r.active
     where p.id = p_provider_id
       and p.is_deleted = false
       and (
         (
           exists (
             select 1
               from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
                and pa.revoked_at is null
           )
           and (
             (
               r.scope_type = 'community'
               and exists (
                 select 1
                   from public.community_memberships cm
                  where cm.community_id = r.scope_id
                    and cm.user_id = (select auth.uid())
                    and cm.status = 'approved'
               )
             )
             or (
               r.scope_type = 'locality'
               and exists (
                 select 1
                   from public.locality_memberships lm
                  where lm.locality_id = r.scope_id
                    and lm.user_id = (select auth.uid())
               )
             )
           )
         )
         or (
           not exists (
             select 1 from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
           )
           and r.scope_type = 'locality'
           and r.source = 'free'
           and exists (
             select 1
               from public.locality_memberships owner_membership
              where owner_membership.user_id = p.owner_user_id
                and owner_membership.locality_id = r.scope_id
                and owner_membership.kind = 'current'
                and owner_membership.access = 'active'
           )
           and exists (
           select 1
               from public.locality_memberships viewer_membership
              where viewer_membership.user_id = (select auth.uid())
                and viewer_membership.locality_id = r.scope_id
                and viewer_membership.kind = 'current'
                and viewer_membership.access = 'active'
         )
         )
       )
  );
$$;

-- Direct profile INSERT remains restricted to invited civil provider accounts.
drop policy if exists provider_profiles_update_owner on public.provider_profiles;
create policy provider_profiles_update_owner
on public.provider_profiles
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  and private.is_provider_account((select auth.uid()))
)
with check (
  owner_user_id = (select auth.uid())
  and private.is_provider_account((select auth.uid()))
);

drop policy if exists provider_profiles_delete_owner on public.provider_profiles;
create policy provider_profiles_delete_owner
on public.provider_profiles
for delete
to authenticated
using (public.can_manage_provider_profile(id));

drop policy if exists provider_catalog_items_insert_owner on public.provider_catalog_items;
create policy provider_catalog_items_insert_owner
on public.provider_catalog_items
for insert
to authenticated
with check (public.can_manage_provider_profile(provider_id));

drop policy if exists provider_catalog_items_update_owner on public.provider_catalog_items;
create policy provider_catalog_items_update_owner
on public.provider_catalog_items
for update
to authenticated
using (public.can_manage_provider_profile(provider_id))
with check (public.can_manage_provider_profile(provider_id));

drop policy if exists provider_catalog_items_delete_owner on public.provider_catalog_items;
create policy provider_catalog_items_delete_owner
on public.provider_catalog_items
for delete
to authenticated
using (public.can_manage_provider_profile(provider_id));

drop policy if exists provider_portfolio_photos_insert_owner on public.provider_portfolio_photos;
create policy provider_portfolio_photos_insert_owner
on public.provider_portfolio_photos
for insert
to authenticated
with check (public.can_manage_provider_profile(provider_id));

drop policy if exists provider_portfolio_photos_update_owner on public.provider_portfolio_photos;
create policy provider_portfolio_photos_update_owner
on public.provider_portfolio_photos
for update
to authenticated
using (public.can_manage_provider_profile(provider_id))
with check (public.can_manage_provider_profile(provider_id));

drop policy if exists provider_portfolio_photos_delete_owner on public.provider_portfolio_photos;
create policy provider_portfolio_photos_delete_owner
on public.provider_portfolio_photos
for delete
to authenticated
using (public.can_manage_provider_profile(provider_id));

drop policy if exists provider_photos_insert_owner on storage.objects;
create policy provider_photos_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-photos'
  and owner = (select auth.uid())
  and public.can_manage_provider_profile(
    ((storage.foldername(storage.objects.name))[1])::uuid
  )
);

create function public.create_member_business_page(
  p_display_name text,
  p_category public.provider_category,
  p_bio text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_locality_id uuid;
  v_provider_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = v_user_id
  ) then
    raise exception 'civil provider accounts use the existing profile flow'
      using errcode = '42501';
  end if;

  select lm.locality_id
    into v_locality_id
    from public.locality_memberships lm
   where lm.user_id = v_user_id
     and lm.kind = 'current'
     and lm.access = 'active'
   for update;

  if v_locality_id is null then
    raise exception 'an active current locality membership is required'
      using errcode = '42501';
  end if;

  if p_display_name is null
     or char_length(btrim(p_display_name)) not between 2 and 80
     or p_category is null
     or (p_bio is not null and char_length(btrim(p_bio)) not between 1 and 800)
  then
    raise exception 'invalid business profile fields' using errcode = '22023';
  end if;

  select p.id into v_provider_id
    from public.provider_profiles p
   where p.owner_user_id = v_user_id;

  if v_provider_id is not null then
    return v_provider_id;
  end if;

  insert into public.provider_profiles (
    owner_user_id, display_name, category, bio
  ) values (
    v_user_id,
    btrim(p_display_name),
    p_category,
    nullif(btrim(p_bio), '')
  )
  returning id into v_provider_id;

  insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
  values (v_provider_id, 'locality', v_locality_id, 'free', true);

  return v_provider_id;
end;
$$;

revoke all on function public.create_member_business_page(
  text, public.provider_category, text
) from public, anon;
grant execute on function public.create_member_business_page(
  text, public.provider_category, text
) to authenticated;

create function public.update_member_business_page(
  p_provider_id uuid,
  p_display_name text,
  p_category public.provider_category,
  p_bio text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = v_user_id
  ) or not public.can_manage_provider_profile(p_provider_id) then
    raise exception 'only the active member owner may update this page'
      using errcode = '42501';
  end if;

  perform 1
    from public.locality_memberships lm
   where lm.user_id = v_user_id
     and lm.kind = 'current'
     and lm.access = 'active'
   for update;
  if not found then
    raise exception 'an active current locality membership is required'
      using errcode = '42501';
  end if;

  if p_display_name is null
     or char_length(btrim(p_display_name)) not between 2 and 80
     or p_category is null
     or (p_bio is not null and char_length(btrim(p_bio)) not between 1 and 800)
  then
    raise exception 'invalid business profile fields' using errcode = '22023';
  end if;

  update public.provider_profiles
     set display_name = btrim(p_display_name),
         category = p_category,
         bio = nullif(btrim(p_bio), '')
   where id = p_provider_id
     and owner_user_id = v_user_id;

  if not found then
    raise exception 'business page not found' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_member_business_page(
  uuid, text, public.provider_category, text
) from public, anon;
grant execute on function public.update_member_business_page(
  uuid, text, public.provider_category, text
) to authenticated;
