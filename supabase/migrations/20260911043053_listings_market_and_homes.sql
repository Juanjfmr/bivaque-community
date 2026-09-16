-- RECON-027 — Moradia estende o domínio canônico de anúncios criado no RECON-025.
--
-- Regra de integração: `public.listings`, `listing_photos`, `listing_saves`,
-- `listing_kind` e `listing_status` já existem. Este lote NÃO recria esse
-- domínio. Ele acrescenta apenas o satélite de Moradia, alertas e compatibilidade
-- temporária para o código reconstruído que ainda usa `owner_user_id` e `path`.
-- A autoridade continua sendo `owner_id`, `audience_type` e `storage_path`.

-- ---------------------------------------------------------------------------
-- Tipos exclusivos de Moradia
-- ---------------------------------------------------------------------------

create type public.listing_deal as enum ('rent', 'sale');
create type public.property_type as enum (
  'apartment', 'house', 'studio', 'room', 'land', 'commercial'
);

-- ---------------------------------------------------------------------------
-- Extensão da tabela mãe canônica
-- ---------------------------------------------------------------------------

alter table public.listings
  add column owner_user_id uuid,
  add column closed_at timestamptz,
  alter column description drop not null,
  alter column category drop not null,
  alter column price_cents drop not null,
  alter column condition drop not null,
  alter column neighborhood drop not null;

-- Mercado continua exigindo os campos que eram NOT NULL antes. Moradia pode
-- deixá-los ausentes porque preço/condição próprios vivem em property_details.
alter table public.listings
  add constraint listings_item_required_fields check (
    kind <> 'item'
    or (
      description is not null
      and category is not null
      and price_cents is not null
      and condition is not null
      and neighborhood is not null
    )
  );

-- Compatibilidade de transição. Há uma única autoridade (`owner_id`); a coluna
-- antiga é espelhada para que o código RECON-027 existente continue funcionando
-- até a limpeza posterior. A divergência é recusada no banco.
update public.listings
set owner_user_id = owner_id
where owner_user_id is null;

create function private.listings_sync_compatibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is null and new.owner_user_id is null then
    raise exception 'listing owner is required' using errcode = '23502';
  elsif new.owner_id is null then
    new.owner_id := new.owner_user_id;
  elsif new.owner_user_id is null then
    new.owner_user_id := new.owner_id;
  elsif new.owner_id is distinct from new.owner_user_id then
    raise exception 'listing owner aliases diverged' using errcode = '23514';
  end if;

  -- RECON-027 informava apenas locality_id/community_id. O contrato canônico
  -- exige audience_type; inferimos somente quando a escolha é inequívoca.
  if new.audience_type is null then
    if new.locality_id is not null and new.community_id is null then
      new.audience_type := 'locality';
    elsif new.community_id is not null and new.locality_id is null then
      new.audience_type := 'community';
    else
      raise exception 'listing audience must be exactly one locality or community'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger listings_sync_compatibility
before insert or update on public.listings
for each row execute function private.listings_sync_compatibility();

alter table public.listings
  alter column owner_user_id set not null;

create index listings_search_idx
  on public.listings (kind, status, locality_id, created_at desc);

-- O guard já existia no domínio canônico. Aqui ele passa a proteger também o
-- tipo do anúncio e o alias de compatibilidade, sem criar um segundo trigger.
create or replace function private.listings_guard_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  if new.owner_id <> old.owner_id
     or new.owner_user_id <> old.owner_user_id then
    raise exception 'listing owner is immutable' using errcode = '42501';
  end if;

  if new.kind <> old.kind then
    raise exception 'listing kind is immutable' using errcode = '42501';
  end if;

  if new.audience_type <> old.audience_type
     or new.locality_id is distinct from old.locality_id
     or new.community_id is distinct from old.community_id then
    raise exception 'listing audience is immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- O RECON-025 já validava dono + alcance. Mantemos essa regra e acrescentamos
-- a suspensão de conta que o lote de Moradia exigia.
drop policy if exists listings_insert_owner on public.listings;

create policy listings_insert_owner
on public.listings
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and (
    (
      audience_type = 'locality'
      and exists (
        select 1
        from public.locality_memberships lm
        where lm.user_id = (select auth.uid())
          and lm.locality_id = locality_id
      )
    )
    or (
      audience_type = 'community'
      and exists (
        select 1
        from public.community_memberships cm
        where cm.user_id = (select auth.uid())
          and cm.community_id = community_id
          and cm.status = 'approved'
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- Detalhe de Moradia
-- ---------------------------------------------------------------------------

create table public.property_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  deal public.listing_deal not null,
  property_type public.property_type not null,
  rent_cents bigint check (rent_cents is null or rent_cents between 0 and 100000000),
  condo_fee_cents bigint check (condo_fee_cents is null or condo_fee_cents between 0 and 100000000),
  iptu_cents bigint check (iptu_cents is null or iptu_cents between 0 and 100000000),
  sale_price_cents bigint check (sale_price_cents is null or sale_price_cents between 0 and 100000000),
  bedrooms integer check (bedrooms is null or bedrooms between 0 and 20),
  suites integer check (suites is null or suites between 0 and 20),
  parking_spots integer check (parking_spots is null or parking_spots between 0 and 20),
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 between 1 and 100000),
  amenities text[] not null default '{}',
  available_from date,
  constraint property_details_deal_costs check (
    (deal = 'rent' and sale_price_cents is null)
    or (deal = 'sale' and rent_cents is null)
  )
);

create function private.property_details_require_property()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.listings l
    where l.id = new.listing_id
      and l.kind = 'property'
  ) then
    raise exception 'property_details requires a property listing' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger property_details_require_property
before insert or update on public.property_details
for each row execute function private.property_details_require_property();

-- ---------------------------------------------------------------------------
-- Fotos: `storage_path` é canônico; `path` é alias de transição
-- ---------------------------------------------------------------------------

alter table public.listing_photos
  add column path text;

update public.listing_photos
set path = storage_path
where path is null;

create function private.listing_photos_sync_compatibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.storage_path is null and new.path is null then
    raise exception 'listing photo path is required' using errcode = '23502';
  elsif new.storage_path is null then
    new.storage_path := new.path;
  elsif new.path is null then
    new.path := new.storage_path;
  elsif new.storage_path is distinct from new.path then
    raise exception 'listing photo path aliases diverged' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger listing_photos_sync_compatibility
before insert or update on public.listing_photos
for each row execute function private.listing_photos_sync_compatibility();

alter table public.listing_photos
  alter column path set not null;

-- RECON-027 permitia trocar ordem/foto; RECON-025 só precisava insert/delete.
grant update on table public.listing_photos to authenticated;

create policy listing_photos_update_owner
on public.listing_photos
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.owner_id = (select auth.uid())
  )
);

-- Compatibilidade com o shape gerado pelo lote reconstruído; a identidade de
-- negócio continua sendo o PK composto (listing_id, user_id).
alter table public.listing_saves
  add column id uuid not null default gen_random_uuid();

create unique index listing_saves_id_key on public.listing_saves (id);
create index listing_saves_user_idx on public.listing_saves (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Busca salva / alerta (entrega em RECON-028)
-- ---------------------------------------------------------------------------

create table public.listing_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  kind public.listing_kind not null default 'property',
  locality_id uuid references public.localities (id) on delete set null,
  neighborhood text check (neighborhood is null or char_length(neighborhood) between 1 and 80),
  deal public.listing_deal,
  max_value_cents bigint check (max_value_cents is null or max_value_cents between 0 and 100000000),
  min_bedrooms integer check (min_bedrooms is null or min_bedrooms between 0 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listing_alerts_owner_idx
  on public.listing_alerts (owner_user_id, created_at desc);

create trigger listing_alerts_set_updated_at
before update on public.listing_alerts
for each row execute function private.set_updated_at();

-- API de leitura por id usada por Moradia/alertas. Ela delega à mesma regra
-- canônica de alcance criada pelo Mercado; não nasce uma segunda autorização.
create function private.can_read_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and private.listing_reachable(
        l.status,
        l.owner_id,
        l.audience_type,
        l.locality_id,
        l.community_id
      )
  );
$$;

revoke all on function private.can_read_listing(uuid) from public, anon;
grant execute on function private.can_read_listing(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS e grants apenas para as tabelas novas
-- ---------------------------------------------------------------------------

alter table public.property_details enable row level security;
alter table public.property_details force row level security;
alter table public.listing_alerts enable row level security;
alter table public.listing_alerts force row level security;

revoke all on table public.property_details from anon, authenticated;
revoke all on table public.listing_alerts from anon, authenticated;

grant select, insert, update, delete on table public.property_details to authenticated;
grant select, insert, update, delete on table public.listing_alerts to authenticated;

grant all on table public.property_details to service_role;
grant all on table public.listing_alerts to service_role;
grant all on table public.listings to service_role;
grant all on table public.listing_photos to service_role;
grant all on table public.listing_saves to service_role;

create policy property_details_select_scoped
on public.property_details
for select
to authenticated
using (private.can_read_listing(listing_id));

create policy property_details_insert_owner
on public.property_details
for insert
to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_id = (select auth.uid())
  )
);

create policy property_details_update_owner
on public.property_details
for update
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_id = (select auth.uid())
  )
);

create policy property_details_delete_owner
on public.property_details
for delete
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_id = (select auth.uid())
  )
);

create policy listing_alerts_select_owner
on public.listing_alerts
for select
to authenticated
using (owner_user_id = (select auth.uid()));

create policy listing_alerts_insert_owner
on public.listing_alerts
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
);

create policy listing_alerts_update_owner
on public.listing_alerts
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy listing_alerts_delete_owner
on public.listing_alerts
for delete
to authenticated
using (owner_user_id = (select auth.uid()));
