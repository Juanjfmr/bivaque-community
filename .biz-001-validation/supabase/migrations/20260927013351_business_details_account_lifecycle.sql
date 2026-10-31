-- A new member page has no contact and receives its reach later in the same
-- creation transaction. It needs no contact synchronization at that point.
create or replace function private.sync_legacy_business_contact()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.contact_phone is null then return new; end if;
  if current_setting('role', true) = 'authenticated'
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

-- The existing purge keeps auth.users and page identity for attribution. Remove
-- the new private details and legacy contact before recording finalization.
create function private.purge_business_page_details()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.finalized_at is not null and old.finalized_at is null then
    update public.provider_profiles set contact_phone = null, contact_is_public = false
    where owner_user_id = new.user_id;
    delete from private.business_page_details d using public.provider_profiles p
    where d.provider_id = p.id and p.owner_user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function private.purge_business_page_details() from public, anon, authenticated;
create trigger purge_business_page_details before update of finalized_at
on public.account_deletion_requests for each row execute function private.purge_business_page_details();

-- Availability is enforced again at the actual content read, including direct
-- Data API reads, rather than relying on an earlier application guard.
create policy business_catalog_available on public.provider_catalog_items
as restrictive for select to authenticated
using (private.business_page_visible(provider_id) or private.business_page_manageable(provider_id));
create policy business_portfolio_available on public.provider_portfolio_photos
as restrictive for select to authenticated
using (private.business_page_visible(provider_id) or private.business_page_manageable(provider_id));

-- Policy helpers must be executable by the role evaluating RLS; they return
-- only a boolean and never expose contact or account lifecycle data.
grant execute on function private.business_page_visible(uuid) to authenticated;
grant execute on function private.business_page_manageable(uuid) to authenticated;
notify pgrst, 'reload schema';
