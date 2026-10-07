-- FIGMA-002 — posição de foto por MENOR LACUNA, não count+1.
--
-- Achado da coordenação em 06/10/2026 sobre a migration 20261006092246: com
-- posições 1,2,3 e DELETE da 2, count=2 e a próxima foto recebia 3 — colisão
-- com a unique (listing_id, position); com 12 fotos e DELETE da 1, count=11 e a
-- reposição recebia 12 — também colisão, travando reposição após remoção.
--
-- A atribuição agora é a menor posição livre em 1..12, calculada sob o MESMO
-- lock da linha do anúncio que serializa a cota: inserts concorrentes nunca
-- pegam a mesma lacuna. Unique, range 1..12 e cota 12 permanecem intactos;
-- listing_media_set_order continua sendo o caminho de reordenar (renumera
-- contíguo). A promoção de capa após DELETE continua no trigger próprio.

create or replace function private.listing_media_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_count integer;
  v_position integer;
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
  select min(gap.pos) into v_position
  from generate_series(1, 12) as gap(pos)
  where not exists (
    select 1 from public.listing_media m
    where m.listing_id = NEW.listing_id and m.position = gap.pos
  );
  NEW.position := v_position::smallint;
  if v_count = 0 then
    NEW.is_cover := true;
  end if;
  return NEW;
end;
$$;
