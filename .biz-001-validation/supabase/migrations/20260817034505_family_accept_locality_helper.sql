-- P0 Task 4: the family accept path derives the dependant locality from the
-- holder's CURRENT membership at acceptance time (ADR-20260816-national-
-- localities emenda; ADR-20260816-transferencia-e-pertencimento base). This
-- kills the last two PILOT_LOCALITY_ID calls in verifyAndProvision.ts.
--
-- The read lives in SQL because family_account_links is a private-schema
-- table: the Data API never exposes it, and a direct .from() call from the
-- service client would leak its name into database.generated.ts (the privacy
-- suite asserts no private table names appear there).
--
-- The wave of transferencia later adds the leaving-link precision
-- ("current, not outgoing"); here we resolve the holder's first membership,
-- which is the current one while the P0 still creates one per person.

create function private.holder_locality_at_acceptance(p_link_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.locality_id
  from private.family_account_links link
  join public.locality_memberships m
    on m.user_id = link.holder_user_id
  where link.id = p_link_id
  order by m.joined_at asc
  limit 1;
$$;

revoke all on function private.holder_locality_at_acceptance(uuid) from public;
revoke all on function private.holder_locality_at_acceptance(uuid) from anon;
revoke all on function private.holder_locality_at_acceptance(uuid) from authenticated;
grant execute on function private.holder_locality_at_acceptance(uuid) to service_role;

create function public.family_accept_holder_locality(p_link_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select private.holder_locality_at_acceptance(p_link_id);
$$;

revoke all on function public.family_accept_holder_locality(uuid) from public;
revoke all on function public.family_accept_holder_locality(uuid) from anon;
revoke all on function public.family_accept_holder_locality(uuid) from authenticated;
grant execute on function public.family_accept_holder_locality(uuid) to service_role;
