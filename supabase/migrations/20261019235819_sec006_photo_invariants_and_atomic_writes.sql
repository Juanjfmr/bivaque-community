-- SEC-006 (reconferência de 2026-10-19) — invariantes e escritas atômicas das fotos.
--
-- Quatro defeitos desta confirmação dependem do banco, não da tela:
--   * `listing_photos` aceitava posições repetidas e fora da faixa, então
--     `uploadPropertyPhotoAction` podia gravar várias fotos em `position = 0`;
--   * Moradia criava `listings` e `property_details` em duas chamadas e a
--     compensação não conferia se o `delete` funcionou;
--   * a troca da foto do Mercado limpava as linhas antes de inserir a nova,
--     deixando uma janela sem foto e perdendo a anterior quando a inserção falhava;
--   * o anexo do pedido fazia upload e `ignoreDuplicates`: um retry PNG mantinha
--     o JPEG antigo na linha, respondia "ok" e deixava o objeto novo órfão.
--
-- A migration NÃO apaga fotos antigas. Duplicadas de `listing_photos` são
-- renumeradas na ordem em que já apareciam (posição, criação, id). Se um anúncio
-- antigo tiver mais de 12 linhas, as excedentes continuam existindo e legíveis:
-- o check de faixa entra como NOT VALID, então ele vale para toda escrita nova
-- sem invalidar o histórico. Unicidade + faixa limitam as novas escritas a 12.

-- ── 1. Renumeração sem perda ─────────────────────────────────────────────────

create or replace function private.renumber_listing_photos()
returns void
language sql
security definer
set search_path = ''
as $$
  with ranked as (
    select
      lp.id,
      row_number() over (
        partition by lp.listing_id
        order by lp.position, lp.created_at, lp.id
      ) - 1 as new_position
    from public.listing_photos lp
  )
  update public.listing_photos lp
     set position = ranked.new_position
    from ranked
   where lp.id = ranked.id
     and lp.position <> ranked.new_position;
$$;

revoke all on function private.renumber_listing_photos() from public, anon, authenticated;
grant execute on function private.renumber_listing_photos() to service_role;

-- A renumeracao e o `ADD UNIQUE` precisam acontecer sem escrita concorrente.
-- Sem esta trava, outra sessao pode inserir uma posicao duplicada depois do
-- snapshot da renumeracao e antes do `ADD CONSTRAINT`; o UNIQUE entao encontra
-- a duplicata e aborta a implantacao. `SHARE ROW EXCLUSIVE` bloqueia
-- INSERT/UPDATE/DELETE em `listing_photos` e continua permitindo SELECT (ao
-- contrario de `ACCESS EXCLUSIVE`, que bloquearia leitura tambem). A tabela
-- fica travada por pouco tempo: so o intervalo entre a renumeracao e a criacao
-- da constraint, dentro da transacao desta migration.
lock table public.listing_photos in share row exclusive mode;

select private.renumber_listing_photos();

-- ── 2. Unicidade e faixa ─────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'listing_photos_listing_position_unique'
       and conrelid = 'public.listing_photos'::regclass
  ) then
    alter table public.listing_photos
      add constraint listing_photos_listing_position_unique unique (listing_id, position);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'listing_photos_position_range'
       and conrelid = 'public.listing_photos'::regclass
  ) then
    -- NOT VALID: linhas excedentes de anúncios antigos continuam guardadas;
    -- INSERT/UPDATE novos precisam obedecer ao teto e à faixa.
    alter table public.listing_photos
      add constraint listing_photos_position_range
      check (position >= 0 and position < 12) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'service_request_photos_position_range'
       and conrelid = 'public.service_request_photos'::regclass
  ) then
    alter table public.service_request_photos
      add constraint service_request_photos_position_range
      check (position >= 0 and position < 6) not valid;
  end if;
end
$$;

-- ── 3. Moradia: criação das duas linhas na mesma transação ──────────────────

create function public.create_property_listing(p_listing jsonb, p_details jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_listing uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  insert into public.listings (
    owner_user_id,
    kind,
    status,
    title,
    description,
    neighborhood,
    address,
    published_at,
    locality_id,
    community_id
  ) values (
    v_me,
    'property',
    coalesce((p_listing ->> 'status')::public.listing_status, 'draft'),
    p_listing ->> 'title',
    nullif(btrim(coalesce(p_listing ->> 'description', '')), ''),
    nullif(btrim(coalesce(p_listing ->> 'neighborhood', '')), ''),
    nullif(btrim(coalesce(p_listing ->> 'address', '')), ''),
    nullif(p_listing ->> 'published_at', '')::timestamptz,
    nullif(p_listing ->> 'locality_id', '')::uuid,
    nullif(p_listing ->> 'community_id', '')::uuid
  )
  returning id into v_listing;

  insert into public.property_details (
    listing_id,
    deal,
    property_type,
    rent_cents,
    condo_fee_cents,
    iptu_cents,
    sale_price_cents,
    bedrooms,
    suites,
    parking_spots,
    area_m2,
    available_from
  ) values (
    v_listing,
    (p_details ->> 'deal')::public.listing_deal,
    (p_details ->> 'property_type')::public.property_type,
    (p_details ->> 'rent_cents')::integer,
    (p_details ->> 'condo_fee_cents')::integer,
    (p_details ->> 'iptu_cents')::integer,
    (p_details ->> 'sale_price_cents')::integer,
    (p_details ->> 'bedrooms')::integer,
    (p_details ->> 'suites')::integer,
    (p_details ->> 'parking_spots')::integer,
    (p_details ->> 'area_m2')::numeric,
    nullif(p_details ->> 'available_from', '')::date
  );

  return v_listing;
end;
$$;

revoke all on function public.create_property_listing(jsonb, jsonb) from public, anon;
grant execute on function public.create_property_listing(jsonb, jsonb) to authenticated;

-- ── 4. Mercado: troca transacional da foto ──────────────────────────────────

create function public.replace_listing_photo(
  p_listing_id uuid,
  p_path text,
  p_position integer default 0
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_previous text[];
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_position is null or p_position < 0 or p_position >= 12 then
    raise exception 'photo position out of range' using errcode = '22023';
  end if;

  if p_path is null
     or p_path = ''
     or left(p_path, char_length(p_listing_id::text) + 1) <> p_listing_id::text || '/' then
    raise exception 'photo path does not belong to the listing' using errcode = '22023';
  end if;

  -- A linha do anúncio é o lock da troca: duas substituições concorrentes se
  -- serializam, e o `FOR UPDATE` também reconfere a posse que a policy exigia.
  perform 1
     from public.listings l
    where l.id = p_listing_id
      and l.owner_user_id = v_me
    for update;

  if not found then
    raise exception 'listing not found or not owned' using errcode = '42501';
  end if;

  with deleted as (
    delete from public.listing_photos
     where listing_id = p_listing_id
    returning path
  )
  select coalesce(array_agg(path), '{}'::text[]) into v_previous
    from deleted;

  insert into public.listing_photos (listing_id, path, position)
  values (p_listing_id, p_path, p_position);

  return v_previous;
end;
$$;

revoke all on function public.replace_listing_photo(uuid, text, integer) from public, anon;
grant execute on function public.replace_listing_photo(uuid, text, integer) to authenticated;

-- ── 5. Pedido: vínculo transacional do anexo ────────────────────────────────

create function public.register_service_request_photo(
  p_request_id uuid,
  p_path text,
  p_position integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_previous text;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_position is null or p_position < 0 or p_position >= 6 then
    raise exception 'photo position out of range' using errcode = '22023';
  end if;

  if p_path is null
     or p_path = ''
     or left(p_path, char_length(p_request_id::text) + 1) <> p_request_id::text || '/' then
    raise exception 'photo path does not belong to the request' using errcode = '22023';
  end if;

  -- `service_role` não é identidade: a função roda como definer, mas confere o
  -- solicitante real e serializa as chamadas concorrentes na linha do pedido.
  perform 1
     from public.service_requests r
    where r.id = p_request_id
      and r.requester_user_id = v_me
    for update;

  if not found then
    raise exception 'request not found or not owned' using errcode = '42501';
  end if;

  select photo_path into v_previous
    from public.service_request_photos
   where request_id = p_request_id
     and position = p_position
   for update;

  if found then
    update public.service_request_photos
       set photo_path = p_path
     where request_id = p_request_id
       and position = p_position;
  else
    insert into public.service_request_photos (request_id, photo_path, position)
    values (p_request_id, p_path, p_position);
  end if;

  return v_previous;
end;
$$;

revoke all on function public.register_service_request_photo(uuid, text, integer)
  from public, anon;
grant execute on function public.register_service_request_photo(uuid, text, integer)
  to authenticated;
