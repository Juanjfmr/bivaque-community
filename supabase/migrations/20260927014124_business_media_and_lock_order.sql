-- Contact RPCs and direct profile writes already lock the profile before Auth.
-- A listing association uses the same order, rather than reversing those locks.
create or replace function private.serialize_business_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if new.provider_id is not null then
    select owner_user_id into v_user from public.provider_profiles
    where id = new.provider_id for update;
    perform 1 from auth.users where id = v_user for update;
  end if;
  return new;
end;
$$;

-- This also covers new signed-URL requests with previously known object paths.
create policy business_provider_media_available on storage.objects
as restrictive for select to authenticated
using (
  bucket_id <> 'provider-photos' or exists (
    select 1 from public.provider_profiles p
    where p.id::text = (storage.foldername(storage.objects.name))[1]
      and (private.business_page_visible(p.id) or private.business_page_manageable(p.id))
  )
);
