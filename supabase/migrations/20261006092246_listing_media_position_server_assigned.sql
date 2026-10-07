-- FIGMA-002 — posição de foto é atribuída pelo SERVIDOR, nunca pelo caller.
--
-- O guard de 20261006083013 só corrigia a posição da primeira foto; um insert
-- com position arbitrária passava (e a server action grava 0 como marcador de
-- "acrescentar"). Com atribuição autoritativa (count + 1 sob o lock do
-- anúncio), a ordem de entrada é determinística mesmo com uploads concorrentes
-- do mesmo dono, e reordenar continua sendo papel de listing_media_set_order.

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
  NEW.position := (v_count + 1)::smallint;
  if v_count = 0 then
    NEW.is_cover := true;
  end if;
  return NEW;
end;
$$;
