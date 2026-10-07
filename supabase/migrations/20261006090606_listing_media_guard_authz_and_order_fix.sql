-- FIGMA-002 — compensação dupla no caminho de mídia, append-only.
--
-- 1) private.listing_media_insert_guard disparava o limite de 12 fotos ANTES
--    de qualquer cheque de autorização (o trigger é security definer e não vê
--    RLS): um terceiro recebia "listing photo limit is 12" em anúncio alheio
--    cheio — erro de cota no lugar de negativa de acesso. Autorização primeiro
--    (dono da listagem), limite depois.
-- 2) public.listing_media_set_order usava SET CONSTRAINTS com nome não
--    qualificado sob search_path = '': a constraint deferrable não era
--    encontrada. Nome qualificado resolve.

create or replace function private.listing_media_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_count integer;
begin
  select owner_user_id into v_owner
  from public.listings
  where id = NEW.listing_id
  for update;
  if not found then
    raise exception 'listing does not exist' using errcode = '23514';
  end if;
  if v_owner is distinct from (select auth.uid()) then
    raise exception 'listing media writable only by owner' using errcode = '42501';
  end if;
  select count(*) into v_count
  from public.listing_media
  where listing_id = NEW.listing_id;
  if v_count >= 12 then
    raise exception 'listing photo limit is 12' using errcode = '23514';
  end if;
  if v_count = 0 then
    NEW.is_cover := true;
    NEW.position := 1;
  end if;
  return NEW;
end;
$$;

create or replace function public.listing_media_set_order(p_listing_id uuid, p_media_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.owner_user_id = (select auth.uid())
  ) then
    raise exception 'listing not editable by caller' using errcode = '42501';
  end if;

  select count(*) into v_count from public.listing_media where listing_id = p_listing_id;
  if v_count <> coalesce(array_length(p_media_ids, 1), 0) then
    raise exception 'order must cover every photo of the listing' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.listing_media m
    where m.listing_id = p_listing_id and m.id <> all (p_media_ids)
  ) or exists (
    select 1 from unnest(p_media_ids) uid
    where not exists (
      select 1 from public.listing_media m
      where m.id = uid and m.listing_id = p_listing_id
    )
  ) then
    raise exception 'order must cover every photo of the listing' using errcode = '22023';
  end if;

  set constraints public.listing_media_position_unique deferred;
  update public.listing_media m
  set position = ord.n
  from unnest(p_media_ids) with ordinality as ord(id, n)
  where m.id = ord.id and m.listing_id = p_listing_id;
  set constraints public.listing_media_position_unique immediate;
end;
$$;
