-- RUN-138 / ADR-20261112-cep-sem-coordenada (R3, aceito por delegação).
--
-- O CEP que as fontes conhecem mas não sabem localizar deixa de travar a
-- pessoa com um 422 falso. O CEP passa a ser guardado SEM posição — nunca com
-- coordenada inventada, que o ADR de localização proíbe. Coordenada sem CEP
-- continua proibida e latitude e longitude continuam andando juntas.
--
-- Três mudanças, todas nesta migration:
--
-- 1. A restrição `profiles_location_all_or_nothing` vira
--    `profiles_location_pair`: CEP sozinho é válido; coordenada exige CEP; as
--    duas coordenadas aparecem juntas ou não aparecem. A faixa de
--    `profiles_location_range` continua valendo.
-- 2. `set_member_location` aceita CEP com as duas coordenadas nulas e passa a
--    recusar coordenada órfã (só latitude ou só longitude) com 22023, em vez de
--    gravar meia posição.
-- 3. `get_my_profile_location` passa a devolver `com_coordenada`, para a rota
--    marcar a localização sem posição. O booleano é tudo que sai: latitude e
--    longitude continuam sem caminho de leitura fora do banco.

begin;

-- ---------------------------------------------------------------------------
-- 1. Restrição: CEP sozinho é localização válida, meia coordenada não
-- ---------------------------------------------------------------------------

alter table public.profiles
  drop constraint profiles_location_all_or_nothing;

alter table public.profiles
  add constraint profiles_location_pair
  check (
    (latitude is null) = (longitude is null)
    and (cep is not null or latitude is null)
  );

comment on constraint profiles_location_pair on public.profiles is
  'CEP sem coordenada é válido (CEP conhecido que nenhuma fonte localiza). Coordenada exige CEP, e latitude e longitude andam juntas.';

-- ---------------------------------------------------------------------------
-- 2. Leitura do dono: CEP, "definida" e se há posição
-- ---------------------------------------------------------------------------

-- A assinatura muda, então a função é recriada: `create or replace` não troca
-- tipo de retorno. O `drop` leva junto o grant, que volta abaixo.
drop function public.get_my_profile_location();

create function public.get_my_profile_location()
returns table (cep text, definida boolean, com_coordenada boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.cep,
    (p.cep is not null),
    (p.latitude is not null and p.longitude is not null)
  from public.profiles p
  where p.user_id = (select auth.uid());
$$;

comment on function public.get_my_profile_location() is
  'CEP do próprio perfil, se a localização está definida e se há coordenada. Devolve só do auth.uid(); nunca latitude/longitude.';

revoke all on function public.get_my_profile_location() from public, anon;
grant execute on function public.get_my_profile_location() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Escrita: as duas coordenadas juntas, ou nenhuma
-- ---------------------------------------------------------------------------

create or replace function public.set_member_location(
  p_user_id uuid,
  p_cep text,
  p_latitude numeric,
  p_longitude numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cep text;
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p where p.user_id = p_user_id
  ) then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_cep is null then
    if p_latitude is not null or p_longitude is not null then
      raise exception 'coordinate without cep' using errcode = '22023';
    end if;

    update public.profiles
       set cep = null,
           latitude = null,
           longitude = null,
           updated_at = now()
     where user_id = p_user_id;
    return;
  end if;

  -- Normaliza para 8 dígitos ("69057-000" e "69057 000" viram "69057000").
  v_cep := pg_catalog.regexp_replace(p_cep, '[^0-9]', '', 'g');

  if v_cep !~ '^[0-9]{8}$' then
    raise exception 'invalid cep' using errcode = '22023';
  end if;

  -- Meia posição nunca é gravada: ou as duas coordenadas, ou nenhuma (CEP
  -- conhecido que nenhuma fonte localiza).
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'latitude and longitude go together' using errcode = '22023';
  end if;

  if p_latitude is not null
     and (p_latitude not between -90 and 90 or p_longitude not between -180 and 180) then
    raise exception 'coordinate out of range' using errcode = '22023';
  end if;

  update public.profiles
     set cep = v_cep,
         latitude = p_latitude,
         longitude = p_longitude,
         updated_at = now()
   where user_id = p_user_id;
end;
$$;

comment on function public.set_member_location(uuid, text, numeric, numeric) is
  'Grava CEP e coordenada do perfil. CEP com coordenadas nulas é válido (CEP conhecido sem posição). Só service_role, com o id vindo da sessão do servidor. Único caminho de escrita da coordenada.';

revoke all on function public.set_member_location(uuid, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.set_member_location(uuid, text, numeric, numeric)
  to service_role;

commit;
