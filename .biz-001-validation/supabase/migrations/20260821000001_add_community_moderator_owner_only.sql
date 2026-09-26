-- 023: tighten add_community_moderator authorization — E5 achado.
-- Wave E Task 5, Step 5: o plano mandou conferir se a RPC permitia um moderador
-- promover outro membro. Permite: is_community_moderator() retorna true tanto
-- para role = 'owner' quanto 'moderator', então a checagem que authorize
-- promoção é a mesma que autoriza aprovar — um moderador pode promover
-- arbitrariamente. Achado documentado e corrigido aqui.
--
-- A correção é trocar a checagem por uma direta em communities.owner_user_id,
-- igual à que transfer_community_ownership e remove_community_moderator já
-- usam. Apenas o dono promove.
--
-- Sem o fix: uma vila que escala para dois moderadores antes da E5 fecha
-- deixava cada moderador livre para criar uma estrutura paralela de
-- moderadores. A D48 diz que a vila é concedida pelo dono — promover sem o
-- dono é uma escalada que precisa de migração, não de decisão em código.

drop function if exists public.add_community_moderator(uuid, uuid);

create function public.add_community_moderator(
  p_community_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = (select auth.uid())
  ) then
    raise exception 'only the owner can add moderators';
  end if;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'approved'
    and role = 'member';
end;
$$;

revoke all on function public.add_community_moderator(uuid, uuid) from public;
revoke all on function public.add_community_moderator(uuid, uuid) from anon;
revoke all on function public.add_community_moderator(uuid, uuid) from authenticated;
grant execute on function public.add_community_moderator(uuid, uuid) to authenticated;
