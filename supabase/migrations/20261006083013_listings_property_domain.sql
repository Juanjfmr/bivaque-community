-- FIGMA-002 — domínio de anúncios de moradia (kind = property).
--
-- Contratos: ADR-20260909-anuncios-mercado-e-moradia (D1 um domínio dois
-- tipos, D2 situações, D3 público exclusivo e imutável, D4 interesse como
-- conversa contextual idempotente, D5 cidade+bairro sem endereço, D6 custos
-- anuláveis), ADR-20260909-midia-de-membro (bucket privado, leitura derivada
-- do recurso, escrita só do dono, limite no servidor) e
-- ADR-20260909-pedidos-e-conversa-contextual (participantes derivados pelo
-- servidor; o valor 'listing' do enum vem da migration anterior).
--
-- Regra da casa: coluna de escopo (locality_id/community_id) e as policies que
-- a leem entram NESTA migration, junto com RLS enabled+forced e grants
-- mínimos. Nada de endereço, número, complemento ou coordenada em coluna
-- alguma. Custos nuláveis: null é "não informado", nunca zero somado.

-- ── tipos ────────────────────────────────────────────────────────────────────

create type public.listing_kind as enum ('item', 'property');

create type public.listing_status as enum (
  'draft',
  'active',
  'paused',
  'reserved',
  'sold',
  'closed'
);

create type public.listing_property_type as enum ('apartamento', 'casa', 'kitnet');

-- ── tabela mãe (D1) ──────────────────────────────────────────────────────────

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  kind public.listing_kind not null,
  status public.listing_status not null default 'draft',
  title text not null check (char_length(title) between 3 and 80),
  description text check (description is null or char_length(description) between 10 and 2000),
  -- D3: público exclusivo por anúncio — cidade OU comunidade, nunca os dois.
  locality_id uuid references public.localities (id) on delete restrict,
  community_id uuid references public.communities (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_audience_exclusive check (
    (locality_id is not null and community_id is null)
    or (locality_id is null and community_id is not null)
  ),
  -- D2: vendido só existe para Mercado.
  constraint listings_sold_only_item check (status <> 'sold' or kind = 'item')
);

create index listings_owner_idx on public.listings (owner_user_id, created_at desc);
create index listings_locality_audience_idx
  on public.listings (locality_id, status)
  where locality_id is not null;
create index listings_community_audience_idx
  on public.listings (community_id, status)
  where community_id is not null;

-- ── satélite de Moradia (D1, D5, D6) ─────────────────────────────────────────

create table public.property_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  property_type public.listing_property_type not null,
  -- D5: bairro é o grão máximo; endereço/número/coordenada não existem aqui.
  neighborhood text not null check (char_length(neighborhood) between 2 and 60),
  -- D6: nuláveis e separados. null = não informado ("Consultar anunciante").
  rent_cents bigint check (rent_cents is null or rent_cents > 0),
  condo_fee_cents bigint check (condo_fee_cents is null or condo_fee_cents >= 0),
  iptu_cents bigint check (iptu_cents is null or iptu_cents >= 0),
  bedrooms smallint check (bedrooms is null or bedrooms between 0 and 30),
  bathrooms smallint check (bathrooms is null or bathrooms between 0 and 30),
  parking_spots smallint check (parking_spots is null or parking_spots between 0 and 20),
  area_m2 numeric(7, 2) check (area_m2 is null or area_m2 > 0),
  available_from date,
  is_furnished boolean not null default false,
  accepts_pets boolean not null default false,
  condo_included_in_rent boolean not null default false
);

-- O satélite só existe para anúncio kind = property (D1).
create function private.property_details_kind_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.listings l
    where l.id = NEW.listing_id and l.kind = 'property'
  ) then
    raise exception 'property details require a property listing'
      using errcode = '23514';
  end if;
  return NEW;
end;
$$;

create trigger property_details_kind_guard
before insert on public.property_details
for each row execute function private.property_details_kind_guard();

-- ── mídia do anúncio (ADR de mídia D1, D3, D4) ───────────────────────────────

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  position smallint not null check (position between 1 and 12),
  is_cover boolean not null default false,
  -- Caminho começa pelo id do recurso: é isso que deixa a policy de storage
  -- fazer o join de autorização (ADR de mídia D2).
  object_path text not null check (object_path ~ '^[0-9a-f-]{36}/[^/]+$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  created_at timestamptz not null default now(),
  -- Deferrable: reordenar num único UPDATE troca posições em par; a checagem
  -- adiada para o fim da transação é o que torna o reorder atômico.
  constraint listing_media_position_unique unique (listing_id, position) deferrable initially immediate,
  constraint listing_media_object_unique unique (listing_id, object_path)
);

create index listing_media_listing_idx on public.listing_media (listing_id, position);

-- Limite de 12 fotos no SERVIDOR, à prova de concorrência: o lock na linha do
-- anúncio serializa contagens simultâneas (a 13ª falha, não vira foto órfã).
-- Sem foto ainda, a primeira entra como capa.
create function private.listing_media_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform 1 from public.listings where id = NEW.listing_id for update;
  if not found then
    raise exception 'listing does not exist' using errcode = '23514';
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

create trigger listing_media_insert_guard
before insert on public.listing_media
for each row execute function private.listing_media_insert_guard();

-- Uma capa por anúncio: marcar nova capa desmarca as demais; remover a capa
-- promove a menor posição. Anúncio nunca fica com foto e sem capa.
create function private.listing_media_cover_unique()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.is_cover then
    update public.listing_media
    set is_cover = false
    where listing_id = NEW.listing_id and id <> NEW.id and is_cover;
  end if;
  return NEW;
end;
$$;

create trigger listing_media_cover_unique
after insert or update of is_cover on public.listing_media
for each row when (NEW.is_cover)
execute function private.listing_media_cover_unique();

create function private.listing_media_cover_promote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if OLD.is_cover then
    update public.listing_media
    set is_cover = true
    where id = (
      select id from public.listing_media
      where listing_id = OLD.listing_id
      order by position
      limit 1
    );
  end if;
  return OLD;
end;
$$;

create trigger listing_media_cover_promote
after delete on public.listing_media
for each row when (OLD.is_cover)
execute function private.listing_media_cover_promote();

-- ── interesse (D4) ───────────────────────────────────────────────────────────

create table public.listing_interests (
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.dm_conversations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

create index listing_interests_user_idx on public.listing_interests (user_id, created_at desc);

-- Interesse é de terceiro em anúncio ativo: o dono não conversa consigo e
-- anúncio pausado/vendido/encerrado não aceita interesse novo (D4).
create function private.listing_interest_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_status public.listing_status;
begin
  select owner_user_id, status into v_owner, v_status
  from public.listings
  where id = NEW.listing_id
  for update;
  if not found then
    raise exception 'listing does not exist' using errcode = '23514';
  end if;
  if v_owner = NEW.user_id then
    raise exception 'cannot register interest in own listing' using errcode = '22023';
  end if;
  if v_status <> 'active' then
    raise exception 'listing is not accepting interest' using errcode = '42501';
  end if;
  return NEW;
end;
$$;

create trigger listing_interest_guard
before insert on public.listing_interests
for each row execute function private.listing_interest_guard();

-- ── auditoria de situação (D2: transição escrita e auditável) ────────────────

create table public.listing_status_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  from_status public.listing_status,
  to_status public.listing_status not null,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index listing_status_history_listing_idx
  on public.listing_status_history (listing_id, created_at);

-- ── guarda da tabela mãe: público imutável, matriz de transição, published ──

create function private.listings_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transition_ok boolean;
begin
  -- D3: dono, tipo e público NÃO mudam na edição. A prancha 64 desenha o campo
  -- travado; trocar público depois de publicado seria contornar acesso.
  if NEW.owner_user_id is distinct from OLD.owner_user_id
     or NEW.kind is distinct from OLD.kind
     or NEW.locality_id is distinct from OLD.locality_id
     or NEW.community_id is distinct from OLD.community_id then
    raise exception 'listing owner, kind and audience are immutable'
      using errcode = '23514';
  end if;

  if NEW.status is distinct from OLD.status then
    v_transition_ok := case OLD.status
      when 'draft' then NEW.status in ('active', 'closed')
      when 'active' then
        NEW.status in ('paused', 'reserved', 'closed')
        or (NEW.status = 'sold' and OLD.kind = 'item')
      when 'paused' then NEW.status in ('active', 'closed')
      when 'reserved' then NEW.status in ('active', 'closed')
      when 'sold' then NEW.status in ('active', 'closed')
      else false
    end;
    if not v_transition_ok then
      raise exception 'invalid listing status transition' using errcode = '22023';
    end if;
    -- Publicar Moradia exige a ficha satélite: sem ela o detalhe mentiria.
    if NEW.status = 'active' and OLD.kind = 'property' and not exists (
      select 1 from public.property_details pd where pd.listing_id = OLD.id
    ) then
      raise exception 'property listing requires details before publish'
        using errcode = '23514';
    end if;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger listings_guard
before update on public.listings
for each row execute function private.listings_guard();

-- História só quando a situação MUDOU de fato: pausar duas vezes grava uma
-- transição (idempotência observável, D2).
create function private.listings_status_history_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.listing_status_history (
    listing_id, from_status, to_status, actor_user_id
  )
  values (NEW.id, OLD.status, NEW.status, coalesce((select auth.uid()), OLD.owner_user_id));
  return NEW;
end;
$$;

create trigger listings_status_history_record
after update on public.listings
for each row when (OLD.status is distinct from NEW.status)
execute function private.listings_status_history_record();

-- ── RLS enabled + forced em todas as tabelas do lote ─────────────────────────

alter table public.listings enable row level security;
alter table public.listings force row level security;
alter table public.property_details enable row level security;
alter table public.property_details force row level security;
alter table public.listing_media enable row level security;
alter table public.listing_media force row level security;
alter table public.listing_interests enable row level security;
alter table public.listing_interests force row level security;
alter table public.listing_status_history enable row level security;
alter table public.listing_status_history force row level security;

-- ── grants mínimos ───────────────────────────────────────────────────────────

revoke all on table public.listings from anon, authenticated;
revoke all on table public.property_details from anon, authenticated;
revoke all on table public.listing_media from anon, authenticated;
revoke all on table public.listing_interests from anon, authenticated;
revoke all on table public.listing_status_history from anon, authenticated;

grant select, insert, update on table public.listings to authenticated;
grant select, insert, update on table public.property_details to authenticated;
grant select, insert, update, delete on table public.listing_media to authenticated;
-- Interesse só entra pela RPC de interesse (definer): nenhum grant de escrita.
grant select on table public.listing_interests to authenticated;
grant select on table public.listing_status_history to authenticated;

-- ── helpers privados de autorização ──────────────────────────────────────────

-- Alcance do público por quem chama (sem ser dono): cidade = membership na
-- localidade; comunidade = membership aprovada. É a mesma régua da busca e da
-- foto (ADR de mídia D2: a leitura da imagem repete a do recurso).
create function private.listing_audience_reached(p_listing_id uuid)
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
        (l.locality_id is not null and exists (
          select 1 from public.locality_memberships lm
          where lm.locality_id = l.locality_id
            and lm.user_id = (select auth.uid())
        ))
        or (l.community_id is not null and exists (
          select 1 from public.community_memberships cm
          where cm.community_id = l.community_id
            and cm.user_id = (select auth.uid())
            and cm.status = 'approved'
        ))
      )
  );
$$;

revoke all on function private.listing_audience_reached(uuid) from public, anon, authenticated;
grant execute on function private.listing_audience_reached(uuid) to authenticated;

-- Leitura de mídia: dono sempre; terceiro só com o anúncio active e alcançado.
create function private.listing_media_readable(p_listing_id uuid)
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
        or (l.status = 'active' and private.listing_audience_reached(l.id))
      )
  );
$$;

revoke all on function private.listing_media_readable(uuid) from public, anon, authenticated;
grant execute on function private.listing_media_readable(uuid) to authenticated;

-- ── policies: listings ───────────────────────────────────────────────────────

-- Dono vê o próprio anúncio em qualquer situação; terceiro só active alcançado.
create policy listings_select_audience
on public.listings
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or (status = 'active' and private.listing_audience_reached(id))
);

-- Publicar exige pertencer ao público escolhido (D3).
create policy listings_insert_audience
on public.listings
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and private.listing_audience_reached(id)
);

-- Edição só do dono; o trigger listings_guard trava público/tipo/dono e valida
-- a matriz de transição (pausar/reativar/encerrar inclusos).
create policy listings_update_owner
on public.listings
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

-- ── policies: property_details ───────────────────────────────────────────────

create policy property_details_select_audience
on public.property_details
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (
        l.owner_user_id = (select auth.uid())
        or (l.status = 'active' and private.listing_audience_reached(l.id))
      )
  )
);

create policy property_details_insert_owner
on public.property_details
for insert
to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = (select auth.uid())
  )
);

create policy property_details_update_owner
on public.property_details
for update
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = (select auth.uid())
  )
);

-- ── policies: listing_media ──────────────────────────────────────────────────

create policy listing_media_select_audience
on public.listing_media
for select
to authenticated
using (private.listing_media_readable(listing_id));

create policy listing_media_insert_owner
on public.listing_media
for insert
to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_user_id = (select auth.uid())
      and l.status <> 'closed'
  )
);

create policy listing_media_update_owner
on public.listing_media
for update
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_user_id = (select auth.uid())
      and l.status <> 'closed'
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_user_id = (select auth.uid())
      and l.status <> 'closed'
  )
);

-- Remover a foto remove o objeto: a aplicação apaga no storage na mesma ação;
-- a policy garante que só o dono apaga o registro.
create policy listing_media_delete_owner
on public.listing_media
for delete
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.owner_user_id = (select auth.uid())
      and l.status <> 'closed'
  )
);

-- ── policies: listing_interests / listing_status_history ────────────────────

create policy listing_interests_select_parties
on public.listing_interests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = (select auth.uid())
  )
);

create policy listing_status_history_select_owner
on public.listing_status_history
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_user_id = (select auth.uid())
  )
);

-- ── bucket privado de fotos (ADR de mídia D1) ────────────────────────────────

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

-- Leitura derivada do recurso (D2): quem lê o anúncio lê a foto. O guard de
-- regex evita cast inválido em objeto fora do padrão do domínio.
create policy listing_photos_select_audience
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-photos'
  and name ~ '^[0-9a-f-]{36}/'
  and private.listing_media_readable((split_part(name, '/', 1))::uuid)
);

-- Escrita só do dono, enquanto o anúncio existir e não estiver encerrado (D3).
create policy listing_photos_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and owner = (select auth.uid())
  and name ~ '^[0-9a-f-]{36}/'
  and exists (
    select 1 from public.listings l
    where l.id = (split_part(name, '/', 1))::uuid
      and l.owner_user_id = (select auth.uid())
      and l.status <> 'closed'
  )
);

create policy listing_photos_update_owner
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and name ~ '^[0-9a-f-]{36}/'
  and exists (
    select 1 from public.listings l
    where l.id = (split_part(name, '/', 1))::uuid
      and l.owner_user_id = (select auth.uid())
      and l.status <> 'closed'
  )
)
with check (
  bucket_id = 'listing-photos'
  and owner = (select auth.uid())
  and name ~ '^[0-9a-f-]{36}/'
);

create policy listing_photos_delete_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and name ~ '^[0-9a-f-]{36}/'
  and exists (
    select 1 from public.listings l
    where l.id = (split_part(name, '/', 1))::uuid
      and l.owner_user_id = (select auth.uid())
  )
);

-- ── RPCs ─────────────────────────────────────────────────────────────────────

-- Criação atômica de rascunho de Moradia (listings + property_details numa
-- transação só). SECURITY INVOKER: as policies de insert fazem a autorização
-- (dono + alcance do público); a RPC só garante atomicidade e o kind.
create function public.create_property_listing(
  p_title text,
  p_description text,
  p_locality_id uuid,
  p_community_id uuid,
  p_property_type public.listing_property_type,
  p_neighborhood text,
  p_rent_cents bigint,
  p_condo_fee_cents bigint,
  p_iptu_cents bigint,
  p_bedrooms smallint,
  p_bathrooms smallint,
  p_parking_spots smallint,
  p_area_m2 numeric,
  p_available_from date,
  p_is_furnished boolean,
  p_accepts_pets boolean,
  p_condo_included_in_rent boolean
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.listings (
    owner_user_id, kind, title, description, locality_id, community_id
  )
  values (v_me, 'property', p_title, p_description, p_locality_id, p_community_id)
  returning id into v_id;

  insert into public.property_details (
    listing_id, property_type, neighborhood, rent_cents, condo_fee_cents,
    iptu_cents, bedrooms, bathrooms, parking_spots, area_m2, available_from,
    is_furnished, accepts_pets, condo_included_in_rent
  )
  values (
    v_id, p_property_type, p_neighborhood, p_rent_cents, p_condo_fee_cents,
    p_iptu_cents, p_bedrooms, p_bathrooms, p_parking_spots, p_area_m2,
    p_available_from, coalesce(p_is_furnished, false),
    coalesce(p_accepts_pets, false), coalesce(p_condo_included_in_rent, false)
  );

  return v_id;
end;
$$;

revoke all on function public.create_property_listing(
  text, text, uuid, uuid, public.listing_property_type, text,
  bigint, bigint, bigint, smallint, smallint, smallint, numeric, date,
  boolean, boolean, boolean
) from public, anon;
grant execute on function public.create_property_listing(
  text, text, uuid, uuid, public.listing_property_type, text,
  bigint, bigint, bigint, smallint, smallint, smallint, numeric, date,
  boolean, boolean, boolean
) to authenticated;

-- Interesse (D4): abre ou reencontra a conversa contextual do anúncio com
-- participantes DERIVADOS do contexto (interessado + anunciante), idempotente
-- por par e por (anúncio, interessado). SECURITY DEFINER porque o insert em
-- dm_conversations é caminho exclusivo de RPC desde 20260825212538.
create function public.register_listing_interest(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_owner uuid;
  v_status public.listing_status;
  v_a uuid;
  v_b uuid;
  v_conversation uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select owner_user_id, status into v_owner, v_status
  from public.listings
  where id = p_listing_id
  for update;

  -- Anúncio inexistente OU fora do público: a mesma negativa, sem vazar qual
  -- dos dois (fronteira de presença).
  if not found or not private.listing_audience_reached(p_listing_id) then
    raise exception 'listing not available' using errcode = '42501';
  end if;
  if v_owner = v_me then
    raise exception 'cannot register interest in own listing' using errcode = '22023';
  end if;
  if v_status <> 'active' then
    raise exception 'listing is not accepting interest' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = v_owner)
       or (blocker_user_id = v_owner and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  v_a := least(v_me, v_owner);
  v_b := greatest(v_me, v_owner);

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, 'listing', p_listing_id)
  on conflict (participant_a, participant_b) do update
    set participant_a = excluded.participant_a
  returning id into v_conversation;

  insert into public.listing_interests (listing_id, user_id, conversation_id)
  values (p_listing_id, v_me, v_conversation)
  on conflict (listing_id, user_id) do nothing;

  return v_conversation;
end;
$$;

revoke all on function public.register_listing_interest(uuid) from public, anon;
grant execute on function public.register_listing_interest(uuid) to authenticated;

-- Reordenar fotos num ato atômico: o conjunto enviado precisa ser exatamente o
-- do anúncio; a constraint deferrable valida no fim da transação.
create function public.listing_media_set_order(p_listing_id uuid, p_media_ids uuid[])
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

  set constraints listing_media_position_unique deferred;
  update public.listing_media m
  set position = ord.n
  from unnest(p_media_ids) with ordinality as ord(id, n)
  where m.id = ord.id and m.listing_id = p_listing_id;
  set constraints listing_media_position_unique immediate;
end;
$$;

revoke all on function public.listing_media_set_order(uuid, uuid[]) from public, anon;
grant execute on function public.listing_media_set_order(uuid, uuid[]) to authenticated;
