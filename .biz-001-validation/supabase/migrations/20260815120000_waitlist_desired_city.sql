-- D2: the outside-city waitlist must collect the desired city, not write the
-- pilot locality (Manaus) into every row. Rows for a future locality keep
-- locality_id NULL until that city becomes a real locality.

alter table public.waitlist
  alter column locality_id drop not null,
  add column city_name text,
  add column state_code text;

alter table public.waitlist
  add constraint waitlist_city_check check (
    city_name is null or char_length(btrim(city_name)) between 2 and 80
  ),
  add constraint waitlist_state_check check (
    state_code is null or state_code ~ '^[A-Z]{2}$'
  );

create unique index waitlist_email_city_state_idx
  on public.waitlist (email, city_name, state_code)
  where locality_id is null;

drop function public.add_to_waitlist(text, uuid);

create function public.add_to_waitlist(
  p_email text,
  p_city_name text,
  p_state_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_city text := btrim(p_city_name);
  v_state text := upper(btrim(coalesce(p_state_code, '')));
begin
  if v_city = '' then
    raise exception 'city_name is required';
  end if;

  if v_state <> '' and v_state !~ '^[A-Z]{2}$' then
    raise exception 'state_code must have two letters';
  end if;

  insert into public.waitlist (email, locality_id, city_name, state_code)
  values (lower(btrim(p_email)), null, v_city, nullif(v_state, ''))
  on conflict do nothing;
end;
$$;

revoke all on function public.add_to_waitlist(text, text, text) from public;
grant execute on function public.add_to_waitlist(text, text, text) to service_role;
