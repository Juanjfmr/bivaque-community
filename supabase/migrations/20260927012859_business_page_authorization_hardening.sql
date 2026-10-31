-- Contact writes through the legacy civil client must obey the same availability
-- boundary as the details RPC. An explicit UPDATE OF contact fields is an intent
-- to change contact, even if the legacy mirror still contains the submitted value.
create or replace function private.sync_legacy_business_contact()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null
     and not private.business_page_manageable(new.id) then
    raise exception 'business owner unavailable' using errcode = '42501';
  end if;
  insert into private.business_page_details (provider_id, contact_mode, contact_phone, contact_is_public)
  values (new.id, case when new.contact_phone is null then 'app' else 'phone' end,
          new.contact_phone, new.contact_is_public and new.contact_phone is not null)
  on conflict (provider_id) do update set
    contact_mode = excluded.contact_mode, contact_phone = excluded.contact_phone,
    contact_is_public = excluded.contact_is_public, updated_at = now();
  return new;
end;
$$;

-- Civil forms use the private canonical contact without overwriting other details.
create function public.save_business_page_contact(
  p_provider_id uuid, p_contact_phone text default null,
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
  if p_contact_is_public is null then
    raise exception 'invalid business contact' using errcode = '22023';
  end if;
  insert into private.business_page_details (provider_id, contact_mode, contact_phone, contact_is_public)
  values (p_provider_id, case when nullif(btrim(p_contact_phone), '') is null then 'app' else 'phone' end,
    nullif(btrim(p_contact_phone), ''), p_contact_is_public)
  on conflict (provider_id) do update set
    contact_mode = excluded.contact_mode, contact_phone = excluded.contact_phone,
    contact_is_public = excluded.contact_is_public, updated_at = now();
end;
$$;
revoke all on function public.save_business_page_contact(uuid,text,boolean) from public, anon;
grant execute on function public.save_business_page_contact(uuid,text,boolean) to authenticated;

-- Deleting a page cannot silently turn its commercial listings into personal
-- listings. Explicit unlinking remains available. Deferred checking also permits
-- an account purge that deletes both the page and its listings in one transaction.
alter table public.listings drop constraint listings_provider_id_fkey;
alter table public.listings add constraint listings_provider_id_fkey
  foreign key (provider_id) references public.provider_profiles(id)
  on delete no action deferrable initially deferred;

create or replace function private.validate_listing_business()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.provider_id is null then return new; end if;
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
      and r.scope_type = 'locality' and r.source = 'free' and r.scope_id = new.locality_id
    join public.locality_memberships m on m.user_id = p.owner_user_id
      and m.locality_id = new.locality_id and m.kind = 'current' and m.access = 'active'
    where p.id = new.provider_id and p.owner_user_id = new.owner_user_id and not p.is_deleted
      and not exists (select 1 from public.provider_accounts a where a.auth_user_id = p.owner_user_id)
  ) or not private.business_page_manageable(new.provider_id) then
    raise exception 'business is outside listing locality' using errcode = '42501';
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
