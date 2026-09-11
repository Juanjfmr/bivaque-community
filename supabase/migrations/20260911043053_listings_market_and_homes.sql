-- RECON-027 / RECON-025 — anúncio de Mercado (item) e de Moradia (property).
--
-- Decisão: ADR-20260909-anuncios-mercado-e-moradia (D1 a D7) e
-- ADR-20260909-midia-de-membro (bucket privado, leitura derivada do recurso).
--
-- Um domínio só: `listings` é a tabela mãe (dono, tipo, situação, público,
-- título, descrição, categoria); `property_details` é o satélite de Moradia
-- (aluguel/condomínio/IPTU separados e anuláveis — D6: ausente é NULL, nunca 0,
-- e nunca entra em soma); `listing_photos` guarda as fotos do bucket privado
-- `listing-photos`; `listing_alerts` é a busca salva que a prancha 65 cria.
--
-- A coluna de público e a policy que a lê entram nesta MESMA migration:
-- `private.can_read_listing(uuid)` é a única porta de leitura, chamada pela
-- policy da tabela de anúncio, pelas tabelas satélites e pela policy do bucket.
-- Anúncio fora do público não é legível nem por chamada direta sem UI.
--
-- A ENTREGA do alerta (job, `listing_alert_deliveries`, preferências de canal)
-- é RECON-028 e depende da matriz de canal do RECON-031. Aqui nasce só a
-- assinatura que o painel de busca salva cria.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.listing_kind as enum ('item', 'property');
create type public.listing_status as enum (
  'draft', 'active', 'paused', 'reserved', 'sold', 'closed'
);
create type public.listing_deal as enum ('rent', 'sale');
create type public.property_type as enum (
  'apartment', 'house', 'studio', 'room', 'land', 'commercial'
);
create type public.listing_condition as enum ('new', 'used');

-- ---------------------------------------------------------------------------
-- Tabela mãe
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  kind public.listing_kind not null,
  status public.listing_status not null default 'draft',
  title text not null check (char_length(title) between 2 and 120),
  description text check (description is null or char_length(description) between 1 and 2000),
  category text check (category is null or char_length(category) between 1 and 60),
  condition public.listing_condition,
  price_cents integer check (price_cents is null or price_cents between 0 and 100000000),
  locality_id uuid references public.localities (id) on delete restrict,
  community_id uuid references public.communities (id) on delete restrict,
  neighborhood text check (neighborhood is null or char_length(neighborhood) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  closed_at timestamptz,
  -- D3: público é cidade OU comunidade — exclusivo e sempre presente.
  constraint listings_audience_exclusive check ((locality_id is null) <> (community_id is null)),
  -- D5: o grão de localização é cidade + bairro. Endereço, número,
  -- complemento e coordenada não têm coluna.
  constraint listings_condition_item_only check (kind = 'item' or condition is null)
);

create index listings_search_idx
  on public.listings (kind, status, locality_id, created_at desc);
create index listings_owner_idx
  on public.listings (owner_user_id, created_at desc);

create trigger listings_set_updated_at
before update on public.listings
for each row execute function private.set_updated_at();

-- D3: o público (e o tipo) não mudam depois de criado — prancha 64 desenha o
-- campo travado. Trocar o público depois de publicado contornaria acesso.
create function private.listing_audience_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.locality_id is distinct from old.locality_id
     or new.community_id is distinct from old.community_id
     or new.kind is distinct from old.kind then
    raise exception 'listing audience and kind are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger listings_audience_immutable
before update on public.listings
for each row execute function private.listing_audience_immutable();

-- ---------------------------------------------------------------------------
-- Detalhe de Moradia
-- ---------------------------------------------------------------------------

create table public.property_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  deal public.listing_deal not null,
  property_type public.property_type not null,
  rent_cents integer check (rent_cents is null or rent_cents between 0 and 100000000),
  condo_fee_cents integer check (condo_fee_cents is null or condo_fee_cents between 0 and 100000000),
  iptu_cents integer check (iptu_cents is null or iptu_cents between 0 and 100000000),
  sale_price_cents integer check (sale_price_cents is null or sale_price_cents between 0 and 100000000),
  bedrooms integer check (bedrooms is null or bedrooms between 0 and 20),
  suites integer check (suites is null or suites between 0 and 20),
  parking_spots integer check (parking_spots is null or parking_spots between 0 and 20),
  area_m2 numeric(6, 2) check (area_m2 is null or area_m2 between 1 and 100000),
  amenities text[] not null default '{}',
  available_from date,
  -- D6: aluguel e venda são exclusivos; custo ausente é NULL.
  constraint property_details_deal_costs check (
    (deal = 'rent' and sale_price_cents is null)
    or (deal = 'sale' and rent_cents is null)
  )
);

-- O satélite só existe para anúncio de Moradia; `item` não tem detalhe.
create function private.property_details_require_property()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.listings l
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
-- Fotos
-- ---------------------------------------------------------------------------

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index listing_photos_listing_idx
  on public.listing_photos (listing_id, position, created_at);

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
  max_value_cents integer check (max_value_cents is null or max_value_cents between 0 and 100000000),
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

-- Salvar anúncio (o marcador da prancha 65/19). Próprio do usuário; a inserção
-- exige que ele alcance o anúncio, para não permitir "salvar" o que não lê.
create table public.listing_saves (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create index listing_saves_user_idx
  on public.listing_saves (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- A única porta de leitura
-- ---------------------------------------------------------------------------

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
       and (
         l.owner_user_id = (select auth.uid())
         or (
           l.status = 'active'
           and (
             (
               l.community_id is not null
               and exists (
                 select 1
                   from public.community_memberships cm
                  where cm.community_id = l.community_id
                    and cm.user_id = (select auth.uid())
                    and cm.status = 'approved'
               )
             )
             or (
               l.locality_id is not null
               and exists (
                 select 1
                   from public.locality_memberships lm
                  where lm.locality_id = l.locality_id
                    and lm.user_id = (select auth.uid())
               )
             )
           )
         )
       )
  );
$$;

revoke all on function private.can_read_listing(uuid) from public, anon;
grant execute on function private.can_read_listing(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS e grants
-- ---------------------------------------------------------------------------

alter table public.listings enable row level security;
alter table public.listings force row level security;
alter table public.property_details enable row level security;
alter table public.property_details force row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_photos force row level security;
alter table public.listing_alerts enable row level security;
alter table public.listing_alerts force row level security;
alter table public.listing_saves enable row level security;
alter table public.listing_saves force row level security;

revoke all on table public.listings from anon, authenticated;
revoke all on table public.property_details from anon, authenticated;
revoke all on table public.listing_photos from anon, authenticated;
revoke all on table public.listing_alerts from anon, authenticated;
revoke all on table public.listing_saves from anon, authenticated;

grant select, insert, update, delete on table public.listings to authenticated;
grant select, insert, update, delete on table public.property_details to authenticated;
grant select, insert, update, delete on table public.listing_photos to authenticated;
grant select, insert, update, delete on table public.listing_alerts to authenticated;
grant select, insert, delete on table public.listing_saves to authenticated;

grant all on table public.listings to service_role;
grant all on table public.property_details to service_role;
grant all on table public.listing_photos to service_role;
grant all on table public.listing_alerts to service_role;
grant all on table public.listing_saves to service_role;

create policy listings_select_scoped
on public.listings
for select
to authenticated
using (private.can_read_listing(id));

create policy listings_insert_owner
on public.listings
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
);

create policy listings_update_owner
on public.listings
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy listings_delete_owner
on public.listings
for delete
to authenticated
using (owner_user_id = (select auth.uid()));

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
       and l.owner_user_id = (select auth.uid())
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
       and l.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.listings l
     where l.id = listing_id
       and l.owner_user_id = (select auth.uid())
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
       and l.owner_user_id = (select auth.uid())
  )
);

create policy listing_photos_select_scoped
on public.listing_photos
for select
to authenticated
using (private.can_read_listing(listing_id));

create policy listing_photos_insert_owner
on public.listing_photos
for insert
to authenticated
with check (
  exists (
    select 1 from public.listings l
     where l.id = listing_id
       and l.owner_user_id = (select auth.uid())
  )
);

create policy listing_photos_update_owner
on public.listing_photos
for update
to authenticated
using (
  exists (
    select 1 from public.listings l
     where l.id = listing_id
       and l.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.listings l
     where l.id = listing_id
       and l.owner_user_id = (select auth.uid())
  )
);

create policy listing_photos_delete_owner
on public.listing_photos
for delete
to authenticated
using (
  exists (
    select 1 from public.listings l
     where l.id = listing_id
       and l.owner_user_id = (select auth.uid())
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
with check (owner_user_id = (select auth.uid()));

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

create policy listing_saves_select_owner
on public.listing_saves
for select
to authenticated
using (user_id = (select auth.uid()));

create policy listing_saves_insert_reader
on public.listing_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_read_listing(listing_id)
);

create policy listing_saves_delete_owner
on public.listing_saves
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Bucket privado e leitura derivada do anúncio (ADR de mídia, D1–D3)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O caminho do objeto começa pelo id do anúncio: `[1]` é o listing_id.
-- Usar `l.id::text = folder[1]` em vez de cast de texto para uuid evita que um
-- nome malformado vire erro de cast na avaliação da policy.
create policy listing_photos_storage_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and owner = (select auth.uid())
  and exists (
    select 1 from public.listings l
     where l.id::text = (storage.foldername(storage.objects.name))[1]
       and l.owner_user_id = (select auth.uid())
  )
);

create policy listing_photos_storage_select_scoped
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-photos'
  and exists (
    select 1 from public.listings l
     where l.id::text = (storage.foldername(storage.objects.name))[1]
       and private.can_read_listing(l.id)
  )
);

create policy listing_photos_storage_delete_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and owner = (select auth.uid())
  and exists (
    select 1 from public.listings l
     where l.id::text = (storage.foldername(storage.objects.name))[1]
       and l.owner_user_id = (select auth.uid())
  )
);
