-- The locality catalog is larger than PostgREST's default 1,000-row response
-- limit. Querying localities directly for distinct state codes therefore
-- returned only the first states alphabetically in /api/localities.
-- Keep the distinct operation in Postgres so the API receives one row per UF.

create or replace function public.list_locality_state_codes()
returns table (state_code text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct l.state_code
  from public.localities as l
  order by l.state_code
$$;

revoke all on function public.list_locality_state_codes() from public;
grant execute on function public.list_locality_state_codes() to service_role;
