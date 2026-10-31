-- BIZ-002: full business-page details and explicit Market association.
-- Contact numbers never travel through table SELECT for authenticated users.

create table private.business_page_details (
  provider_id uuid primary key references public.provider_profiles(id) on delete cascade,
  neighborhood text check (neighborhood is null or char_length(neighborhood) between 1 and 80),
  service_area text check (service_area is null or char_length(service_area) between 1 and 200),
  opening_hours text check (opening_hours is null or char_length(opening_hours) between 1 and 300),
  community_discount text check (community_discount is null or char_length(community_discount) between 1 and 300),
  contact_mode text not null default 'app' check (contact_mode in ('app', 'phone', 'whatsapp')),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9]{10,15}$'),
  contact_is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint business_contact_explicit check (
    not contact_is_public or (contact_mode <> 'app' and contact_phone is not null)
  )
);
alter table private.business_page_details enable row level security;
alter table private.business_page_details force row level security;
revoke all on private.business_page_details from public, anon, authenticated;
grant all on private.business_page_details to service_role;

create function private.business_account_available(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user_id is not null
    and not private.account_deletion_requested(p_user_id)
    and not exists (select 1 from public.profile_suspensions s where s.user_id = p_user_id)
    and exists (select 1 from auth.users u where u.id = p_user_id and u.deleted_at is null);
$$;
revoke all on function private.business_account_available(uuid) from public, anon, authenticated;

create function private.business_page_visible(p_provider_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.business_account_available((select auth.uid())) and exists (
    select 1 from public.provider_profiles p
    where p.id = p_provider_id and not p.is_deleted
      and private.business_account_available(p.owner_user_id)
      and private.can_see_provider(p.id)
      and (
        (exists (select 1 from public.provider_accounts a
                  where a.auth_user_id = p.owner_user_id and a.revoked_at is null)
         and exists (select 1 from public.provider_reach r where r.provider_id = p.id and r.active))
        or (
          not exists (select 1 from public.provider_accounts a where a.auth_user_id = p.owner_user_id)
          and exists (
            select 1 from public.provider_reach r
            join public.locality_memberships o on o.user_id = p.owner_user_id
              and o.locality_id = r.scope_id and o.kind = 'current' and o.access = 'active'
            join public.locality_memberships v on v.user_id = (select auth.uid())
              and v.locality_id = r.scope_id and v.kind = 'current' and v.access = 'active'
            where r.provider_id = p.id and r.scope_type = 'locality' and r.source = 'free' and r.active
          )
        )
      )
  );
$$;
revoke all on function private.business_page_visible(uuid) from public, anon, authenticated;

create function private.business_page_manageable(p_provider_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.business_account_available((select auth.uid())) and exists (
    select 1 from public.provider_profiles p where p.id = p_provider_id
      and not p.is_deleted and p.owner_user_id = (select auth.uid())
      and public.can_manage_provider_profile(p.id)
  );
$$;
revoke all on function private.business_page_manageable(uuid) from public, anon, authenticated;

-- Preserve the civil owner's existing opt-in, while moving reads behind projection RPCs.
insert into private.business_page_details (provider_id, contact_mode, contact_phone, contact_is_public)
select id, case when contact_phone is null then 'app' else 'phone' end,
       contact_phone, contact_is_public and contact_phone is not null
from public.provider_profiles where contact_phone is not null;

create function private.sync_legacy_business_contact()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.contact_phone is not distinct from old.contact_phone
     and new.contact_is_public is not distinct from old.contact_is_public then return new; end if;
  insert into private.business_page_details (provider_id, contact_mode, contact_phone, contact_is_public)
  values (new.id, case when new.contact_phone is null then 'app' else 'phone' end,
          new.contact_phone, new.contact_is_public and new.contact_phone is not null)
  on conflict (provider_id) do update set
    contact_mode = excluded.contact_mode, contact_phone = excluded.contact_phone,
    contact_is_public = excluded.contact_is_public, updated_at = now();
  return new;
end;
$$;
revoke all on function private.sync_legacy_business_contact() from public, anon, authenticated;
create trigger sync_legacy_business_contact after insert or update of contact_phone, contact_is_public
on public.provider_profiles for each row execute function private.sync_legacy_business_contact();

-- A table grant overrides column restrictions: revoke it before safe column grants.
revoke select on public.provider_profiles from authenticated;
grant select (id, owner_user_id, display_name, category, bio, contact_is_public,
              is_deleted, created_at, updated_at) on public.provider_profiles to authenticated;

create function public.get_own_business_page_details(p_provider_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_details private.business_page_details%rowtype;
begin
  if not private.business_page_manageable(p_provider_id) then return null; end if;
  select * into v_details from private.business_page_details where provider_id = p_provider_id;
  return jsonb_build_object(
    'neighborhood', v_details.neighborhood, 'service_area', v_details.service_area,
    'opening_hours', v_details.opening_hours, 'community_discount', v_details.community_discount,
    'contact_mode', coalesce(v_details.contact_mode, 'app'), 'contact_phone', v_details.contact_phone,
    'contact_is_public', coalesce(v_details.contact_is_public, false)
  );
end;
$$;
revoke all on function public.get_own_business_page_details(uuid) from public, anon;
grant execute on function public.get_own_business_page_details(uuid) to authenticated;

create function public.get_business_page_details(p_provider_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_details private.business_page_details%rowtype; v_visible boolean;
begin
  if not private.business_page_visible(p_provider_id) then return null; end if;
  select * into v_details from private.business_page_details where provider_id = p_provider_id;
  v_visible := coalesce(v_details.contact_is_public, false) and v_details.contact_mode <> 'app';
  return jsonb_build_object(
    'neighborhood', v_details.neighborhood, 'service_area', v_details.service_area,
    'opening_hours', v_details.opening_hours, 'community_discount', v_details.community_discount,
    'contact_mode', case when v_visible then v_details.contact_mode else 'app' end,
    'contact_phone', case when v_visible then v_details.contact_phone else null end,
    'contact_is_public', coalesce(v_visible, false)
  );
end;
$$;
revoke all on function public.get_business_page_details(uuid) from public, anon;
grant execute on function public.get_business_page_details(uuid) to authenticated;

create function public.save_business_page_details(
  p_provider_id uuid, p_neighborhood text default null, p_service_area text default null,
  p_opening_hours text default null, p_community_discount text default null,
  p_contact_mode text default 'app', p_contact_phone text default null,
  p_contact_is_public boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.business_page_manageable(p_provider_id) then
    raise exception 'business owner unavailable' using errcode = '42501';
  end if;
  perform 1 from public.provider_profiles where id = p_provider_id for update;
  perform 1 from public.locality_memberships where user_id = (select auth.uid())
    and kind = 'current' and access = 'active' for update;
  if not private.business_page_manageable(p_provider_id) then
    raise exception 'business owner unavailable' using errcode = '42501';
  end if;
  if p_contact_mode is null or p_contact_mode not in ('app', 'phone', 'whatsapp')
     or p_contact_is_public is null then
    raise exception 'invalid business contact' using errcode = '22023';
  end if;
  insert into private.business_page_details (
    provider_id, neighborhood, service_area, opening_hours, community_discount,
    contact_mode, contact_phone, contact_is_public
  ) values (
    p_provider_id, nullif(btrim(p_neighborhood), ''), nullif(btrim(p_service_area), ''),
    nullif(btrim(p_opening_hours), ''), nullif(btrim(p_community_discount), ''),
    p_contact_mode, nullif(btrim(p_contact_phone), ''), p_contact_is_public
  ) on conflict (provider_id) do update set
    neighborhood = excluded.neighborhood, service_area = excluded.service_area,
    opening_hours = excluded.opening_hours, community_discount = excluded.community_discount,
    contact_mode = excluded.contact_mode, contact_phone = excluded.contact_phone,
    contact_is_public = excluded.contact_is_public, updated_at = now();
end;
$$;
revoke all on function public.save_business_page_details(uuid,text,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.save_business_page_details(uuid,text,text,text,text,text,text,boolean) to authenticated;

alter table public.listings add column provider_id uuid
references public.provider_profiles(id) on delete set null;
create index listings_business_active_idx on public.listings(provider_id, published_at desc)
where provider_id is not null and status = 'active';

create function private.validate_listing_business()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Unlinking is allowed by the existing listing owner policy, including after transfer.
  if new.provider_id is null then return new; end if;
  -- Existing commercial labels are retained after lost eligibility; other lifecycle edits
  -- must remain possible (pause/close/purge). A new or changed link is strictly checked.
  if tg_op = 'UPDATE' and new.provider_id is not distinct from old.provider_id
     and new.owner_user_id is not distinct from old.owner_user_id
     and new.kind is not distinct from old.kind
     and new.locality_id is not distinct from old.locality_id
     and new.community_id is not distinct from old.community_id then return new; end if;
  if not private.business_page_manageable(new.provider_id)
     or new.owner_user_id <> (select auth.uid()) or new.kind <> 'item'
     or new.community_id is not null or new.locality_id is null then
    raise exception 'invalid business listing owner or audience' using errcode = '42501';
  end if;
  perform 1 from public.provider_profiles where id = new.provider_id for update;
  perform 1 from public.locality_memberships where user_id = (select auth.uid())
    and kind = 'current' and access = 'active' for update;
  if not exists (
    select 1 from public.provider_profiles p
    join public.provider_reach r on r.provider_id = p.id and r.active
      and r.scope_type = 'locality' and r.scope_id = new.locality_id
    where p.id = new.provider_id and p.owner_user_id = new.owner_user_id and not p.is_deleted
  ) or not private.business_page_manageable(new.provider_id) then
    raise exception 'business is outside listing locality' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_listing_business() from public, anon, authenticated;
create trigger validate_listing_business before insert or update on public.listings
for each row execute function private.validate_listing_business();

notify pgrst, 'reload schema';
