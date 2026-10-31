-- The auth row is a shared serialization point for contact writes and changes
-- to their authorization. A writer rechecks eligibility after acquiring it.
create function private.serialize_business_availability()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row jsonb; v_user uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_table_name = 'provider_accounts' then
    v_user := (v_row->>'auth_user_id')::uuid;
  elsif tg_table_name = 'provider_profiles' then
    v_user := (v_row->>'owner_user_id')::uuid;
  elsif tg_table_name in ('provider_reach', 'business_page_details') then
    select owner_user_id into v_user from public.provider_profiles
    where id = (v_row->>'provider_id')::uuid;
  else
    v_user := (v_row->>'user_id')::uuid;
  end if;
  perform 1 from auth.users where id = v_user for update;
  if tg_table_name = 'business_page_details'
     and current_setting('role', true) = 'authenticated'
     and not private.business_page_manageable((v_row->>'provider_id')::uuid) then
    raise exception 'business owner unavailable' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.serialize_business_availability() from public, anon, authenticated;
create trigger serialize_business_contact before insert or update on private.business_page_details
for each row execute function private.serialize_business_availability();
create trigger serialize_business_suspension before insert or update or delete on public.profile_suspensions
for each row execute function private.serialize_business_availability();
create trigger serialize_business_deletion before insert or update or delete on public.account_deletion_requests
for each row execute function private.serialize_business_availability();
create trigger serialize_business_civil before insert or update or delete on public.provider_accounts
for each row execute function private.serialize_business_availability();
create trigger serialize_business_reach before insert or update or delete on public.provider_reach
for each row execute function private.serialize_business_availability();
create trigger serialize_business_membership before insert or update or delete on public.locality_memberships
for each row execute function private.serialize_business_availability();
create trigger serialize_business_profile before update or delete on public.provider_profiles
for each row execute function private.serialize_business_availability();

-- Linking a listing is also a sensitive write. Trigger names order this lock
-- before validation so availability is checked after the shared lock.
create function private.serialize_business_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if new.provider_id is not null then
    select owner_user_id into v_user from public.provider_profiles where id = new.provider_id;
    perform 1 from auth.users where id = v_user for update;
  end if;
  return new;
end;
$$;
revoke all on function private.serialize_business_listing() from public, anon, authenticated;
create trigger a_serialize_business_listing before insert or update on public.listings
for each row execute function private.serialize_business_listing();
