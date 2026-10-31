-- Sensitive writes acquire profile -> current membership -> Auth. Membership
-- mutations already hold their row before their availability trigger locks Auth.
-- Acquiring Auth ahead of membership in a listing link reverses that order.
create or replace function private.serialize_business_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if new.provider_id is not null then
    select owner_user_id into v_user from public.provider_profiles
    where id = new.provider_id for update;
    perform 1 from public.locality_memberships
    where user_id = v_user and kind = 'current' and access = 'active' for update;
    perform 1 from auth.users where id = v_user for update;
  end if;
  return new;
end;
$$;
