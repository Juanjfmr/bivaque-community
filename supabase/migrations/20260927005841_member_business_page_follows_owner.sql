-- A página do negócio do membro segue o dono quando ele muda de cidade
-- (decisão do dono, 27/09/2026; ADR-20260925-pagina-do-negocio, contrato da
-- primeira fatia).
--
-- Antes, o alcance gratuito ficava na cidade em que a página nasceu. Depois de
-- declare_locality_transfer a filiação antiga vira `leaving` e a página sumia
-- para todos; como can_manage_provider_profile exige o dono `current` na cidade
-- do alcance, o dono também perdia edição, catálogo, fotos e até a exclusão, e
-- create_member_business_page devolvia a ficha sem refazer o alcance.
--
-- Agora o alcance gratuito da página de um membro acompanha a filiação atual e
-- ativa do dono. A regra de quem vê e de quem edita não muda: continua derivada
-- do alcance e da filiação atual, e a cidade nunca vem do cliente. O prestador
-- civil (provider_accounts) fica de fora: o alcance dele tem fluxo próprio.

create function private.move_member_business_reach(p_user_id uuid, p_locality_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = p_user_id
  ) then
    return;
  end if;

  update public.provider_reach r
     set scope_id = p_locality_id
    from public.provider_profiles p
   where p.id = r.provider_id
     and p.owner_user_id = p_user_id
     and r.scope_type = 'locality'
     and r.source = 'free'
     and r.scope_id <> p_locality_id;
end;
$$;

revoke all on function private.move_member_business_reach(uuid, uuid)
  from public, anon, authenticated;

create function private.member_business_reach_follows_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'current' and new.access = 'active' then
    perform private.move_member_business_reach(new.user_id, new.locality_id);
  end if;
  return new;
end;
$$;

revoke all on function private.member_business_reach_follows_owner()
  from public, anon, authenticated;

create trigger member_business_reach_follows_owner
after insert or update of kind, locality_id, access on public.locality_memberships
for each row execute function private.member_business_reach_follows_owner();

-- Uma página que já existe também se acerta quando o dono pede para criá-la de
-- novo: o alcance vai para a cidade atual, e se ele não existir mais, é refeito.
create or replace function public.create_member_business_page(
  p_display_name text,
  p_category public.provider_category,
  p_bio text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_locality_id uuid;
  v_provider_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = v_user_id
  ) then
    raise exception 'civil provider accounts use the existing profile flow'
      using errcode = '42501';
  end if;

  select lm.locality_id
    into v_locality_id
    from public.locality_memberships lm
   where lm.user_id = v_user_id
     and lm.kind = 'current'
     and lm.access = 'active'
   for update;

  if v_locality_id is null then
    raise exception 'an active current locality membership is required'
      using errcode = '42501';
  end if;

  if p_display_name is null
     or char_length(btrim(p_display_name)) not between 2 and 80
     or p_category is null
     or (p_bio is not null and char_length(btrim(p_bio)) not between 1 and 800)
  then
    raise exception 'invalid business profile fields' using errcode = '22023';
  end if;

  select p.id into v_provider_id
    from public.provider_profiles p
   where p.owner_user_id = v_user_id;

  if v_provider_id is not null then
    perform private.move_member_business_reach(v_user_id, v_locality_id);
    insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
    select v_provider_id, 'locality', v_locality_id, 'free', true
     where not exists (
       select 1 from public.provider_reach r
        where r.provider_id = v_provider_id
          and r.scope_type = 'locality'
          and r.source = 'free'
     );
    return v_provider_id;
  end if;

  insert into public.provider_profiles (
    owner_user_id, display_name, category, bio
  ) values (
    v_user_id,
    btrim(p_display_name),
    p_category,
    nullif(btrim(p_bio), '')
  )
  returning id into v_provider_id;

  insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
  values (v_provider_id, 'locality', v_locality_id, 'free', true);

  return v_provider_id;
end;
$$;

revoke all on function public.create_member_business_page(
  text, public.provider_category, text
) from public, anon;
grant execute on function public.create_member_business_page(
  text, public.provider_category, text
) to authenticated;

-- Páginas que ficaram presas numa cidade antiga antes desta migration.
select private.move_member_business_reach(lm.user_id, lm.locality_id)
  from public.locality_memberships lm
  join public.provider_profiles p on p.owner_user_id = lm.user_id
 where lm.kind = 'current'
   and lm.access = 'active';
