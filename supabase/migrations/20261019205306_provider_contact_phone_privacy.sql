-- SEC-002 / ADR-20261019-correcoes-de-seguranca-pre-lancamento.
-- RLS scopes rows, not columns. Keep ordinary profile reads under the existing
-- policies, but never expose the raw phone through SELECT (including * / JSON).
revoke select on table public.provider_profiles from public, anon, authenticated;
revoke select (contact_phone) on public.provider_profiles from public, anon, authenticated;
grant select (
  id, owner_user_id, display_name, category, bio, contact_is_public,
  is_deleted, created_at, updated_at
) on public.provider_profiles to authenticated;

-- The definer is needed solely to read the column denied above. Reapply the
-- existing profile SELECT boundary explicitly, then check phone visibility.
-- The caller supplies a profile ID, never a user ID or an authorization flag.
create function public.get_provider_contact_phone(p_provider_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.contact_phone
    from public.provider_profiles p
   where p.id = p_provider_id
     and (select auth.uid()) is not null
     and not p.is_deleted
     and private.can_see_provider(p.id)
     and (p.contact_is_public or p.owner_user_id = (select auth.uid()));
$$;

revoke all on function public.get_provider_contact_phone(uuid) from public, anon;
grant execute on function public.get_provider_contact_phone(uuid) to authenticated;

-- Authorized operations keep the existing server-only service_role table
-- access. No operator access is added to the authenticated role or the RPC.
