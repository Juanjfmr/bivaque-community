-- RECON-025 — Mercado: o anúncio de item, a mídia privada e o público alcançável.
--
-- Arquitetura (ADR-20260909-anuncios-mercado-e-moradia, D1–D5):
--   * um domínio `listings` com `kind` em {item, property}; este lote entrega
--     `item` e os campos que Moradia reusa depois;
--   * público exclusivo por anúncio: cidade (`locality_id`) ou comunidade
--     (`community_id`), sem endereço, número, complemento ou coordenada;
--   * a busca só devolve `active` alcançável pelo leitor; o dono enxerga o
--     próprio anúncio em qualquer situação;
--   * a mídia vive no bucket privado `listing-photos` (ADR-20260909-midia-de-
--     membro) e a leitura é derivada do acesso ao anúncio.
--
-- A coluna de escopo e as policies que a leem entram NESTA migration — é a
-- regra da casa, e a que os quatro vazamentos anteriores violaram.

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

create type public.listing_audience as enum ('locality', 'community');

-- ── tabelas ──────────────────────────────────────────────────────────────────

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind public.listing_kind not null default 'item',
  status public.listing_status not null default 'draft',
  audience_type public.listing_audience not null,
  locality_id uuid references public.localities (id) on delete restrict,
  community_id uuid references public.communities (id) on delete restrict,
  category text not null check (
    category in ('casa_moveis', 'eletronicos', 'esporte', 'infantil', 'veiculos', 'outros')
  ),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  price_cents bigint not null check (price_cents >= 0),
  condition text not null check (condition in ('new', 'used_good', 'used_fair')),
  neighborhood text not null check (char_length(neighborhood) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint listings_audience_ref_check check (
    (audience_type = 'locality' and locality_id is not null and community_id is null)
    or (audience_type = 'community' and community_id is not null and locality_id is null)
  )
);

create index listings_active_locality_idx
  on public.listings (locality_id, created_at desc)
  where status = 'active';

create index listings_active_community_idx
  on public.listings (community_id, created_at desc)
  where status = 'active';

create index listings_owner_idx
  on public.listings (owner_id, created_at desc);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 400),
  position smallint not null check (position between 0 and 5),
  created_at timestamptz not null default now(),
  constraint listing_photos_unique_position unique (listing_id, position)
);

create index listing_photos_listing_idx
  on public.listing_photos (listing_id, position);

create table public.listing_saves (
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

-- ── RLS: ativar e forçar ─────────────────────────────────────────────────────

alter table public.listings enable row level security;
alter table public.listings force row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_photos force row level security;
alter table public.listing_saves enable row level security;
alter table public.listing_saves force row level security;

-- ── grants mínimos ───────────────────────────────────────────────────────────

revoke all on table public.listings from anon, authenticated;
revoke all on table public.listing_photos from anon, authenticated;
revoke all on table public.listing_saves from anon, authenticated;

grant select, insert, update, delete on table public.listings to authenticated;
grant select, insert, delete on table public.listing_photos to authenticated;
grant select, insert, delete on table public.listing_saves to authenticated;

-- ── helper de alcance (security definer: a policy não pode ler a própria
--    relação que guarda; a autorização mora aqui) ─────────────────────────────

create function private.listing_reachable(
  p_status public.listing_status,
  p_owner_id uuid,
  p_audience_type public.listing_audience,
  p_locality_id uuid,
  p_community_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_owner_id = (select auth.uid())
    or (
      p_status = 'active'
      and (
        (
          p_audience_type = 'locality'
          and exists (
            select 1
            from public.locality_memberships lm
            where lm.user_id = (select auth.uid())
              and lm.locality_id = p_locality_id
          )
        )
        or (
          p_audience_type = 'community'
          and exists (
            select 1
            from public.community_memberships cm
            where cm.user_id = (select auth.uid())
              and cm.community_id = p_community_id
              and cm.status = 'approved'
          )
        )
      )
    );
$$;

revoke all on function private.listing_reachable(
  public.listing_status,
  uuid,
  public.listing_audience,
  uuid,
  uuid
) from public, anon;
grant execute on function private.listing_reachable(
  public.listing_status,
  uuid,
  public.listing_audience,
  uuid,
  uuid
) to authenticated;

-- O caminho do objeto começa pelo id do anúncio (`<listing_id>/<arquivo>`), e
-- é assim que a policy de storage consegue derivar a leitura do recurso. A
-- comparação é textual de propósito: um nome fora do formato apenas não casa,
-- em vez de derrubar a avaliação com um cast inválido.

create function private.can_read_listing_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings l
    where (storage.foldername(p_name))[1] = l.id::text
      and private.listing_reachable(
        l.status,
        l.owner_id,
        l.audience_type,
        l.locality_id,
        l.community_id
      )
  );
$$;

create function private.can_write_listing_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings l
    where (storage.foldername(p_name))[1] = l.id::text
      and l.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.can_read_listing_object(text) from public, anon;
revoke all on function private.can_write_listing_object(text) from public, anon;
grant execute on function private.can_read_listing_object(text) to authenticated;
grant execute on function private.can_write_listing_object(text) to authenticated;

-- ── policies: listings ───────────────────────────────────────────────────────

create policy listings_select_reachable
on public.listings
for select
to authenticated
using (
  private.listing_reachable(status, owner_id, audience_type, locality_id, community_id)
);

create policy listings_insert_owner
on public.listings
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
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

create policy listings_update_owner
on public.listings
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy listings_delete_owner
on public.listings
for delete
to authenticated
using (owner_id = (select auth.uid()));

-- ── policies: listing_photos ─────────────────────────────────────────────────

create policy listing_photos_select_reachable
on public.listing_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and private.listing_reachable(
        l.status,
        l.owner_id,
        l.audience_type,
        l.locality_id,
        l.community_id
      )
  )
);

create policy listing_photos_insert_owner
on public.listing_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.owner_id = (select auth.uid())
  )
);

create policy listing_photos_delete_owner
on public.listing_photos
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.owner_id = (select auth.uid())
  )
);

-- ── policies: listing_saves ──────────────────────────────────────────────────

create policy listing_saves_select_own
on public.listing_saves
for select
to authenticated
using (user_id = (select auth.uid()));

create policy listing_saves_insert_own
on public.listing_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.listings l
    where l.id = listing_saves.listing_id
      and private.listing_reachable(
        l.status,
        l.owner_id,
        l.audience_type,
        l.locality_id,
        l.community_id
      )
  )
);

create policy listing_saves_delete_own
on public.listing_saves
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ── guarda de mutação: dono e público são imutáveis ──────────────────────────
-- O público é escolhido na criação e não muda depois (D3) — trocá-lo seria
-- contornar acesso. A situação pode mudar; dono e alcance, não.

create function private.listings_guard_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  if new.owner_id <> old.owner_id then
    raise exception 'listing owner is immutable' using errcode = '42501';
  end if;

  if new.audience_type <> old.audience_type
     or new.locality_id is distinct from old.locality_id
     or new.community_id is distinct from old.community_id then
    raise exception 'listing audience is immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger listings_guard_mutation
before update on public.listings
for each row
execute function private.listings_guard_mutation();

-- ── bucket privado + policies derivadas ──────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy listing_photos_storage_select_reachable
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-photos'
  and private.can_read_listing_object(name)
);

create policy listing_photos_storage_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and private.can_write_listing_object(name)
);

create policy listing_photos_storage_update_owner
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and private.can_write_listing_object(name)
);

create policy listing_photos_storage_delete_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and private.can_write_listing_object(name)
);

-- ── interesse: o contexto `listing` do open_conversation ─────────────────────
-- O RPC `open_conversation` já existe e é idempotente; o que muda é a validação
-- do contexto novo. Só o interessado abre, o dono é o OUTRO participante, o
-- anúncio está ativo e o interessado alcança o público. Conversar consigo
-- mesmo continua impossível: `l.owner_id <> auth.uid()`.

create or replace function private.dm_context_valid(
  p_a uuid,
  p_b uuid,
  p_type public.dm_context_type,
  p_context_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'shared_group' then exists (
      select 1
        from public.group_memberships gm
       where gm.group_id = p_context_id
         and gm.user_id in (p_a, p_b)
         and gm.status = 'approved'
       having count(distinct gm.user_id) = 2
    )
    when 'shared_event' then exists (
      select 1
        from public.event_rsvps e
       where e.event_id = p_context_id
         and e.user_id in (p_a, p_b)
       having count(distinct e.user_id) = 2
    )
    when 'recommendation_thread' then (
      exists (
        select 1 from public.recommendation_requests r
         where r.id = p_context_id and r.author_id in (p_a, p_b)
      )
      and exists (
        select 1 from public.recommendation_replies rep
         where rep.request_id = p_context_id and rep.author_id in (p_a, p_b)
      )
    )
    when 'accepted_family' then exists (
      select 1 from private.family_account_links l
       where l.holder_user_id in (p_a, p_b)
         and l.family_user_id in (p_a, p_b)
         and l.holder_user_id <> l.family_user_id
    )
    when 'provider' then (
      p_context_id is not null
      and exists (
        select 1 from public.provider_profiles pp
         where pp.id = p_context_id
           and pp.owner_user_id in (p_a, p_b)
           and pp.owner_user_id <> (select auth.uid())
      )
      and private.can_see_provider(p_context_id)
    )
    when 'listing' then (
      p_context_id is not null
      and exists (
        select 1 from public.listings l
         where l.id = p_context_id
           and l.status = 'active'
           and l.owner_id in (p_a, p_b)
           and l.owner_id <> (select auth.uid())
      )
      and exists (
        select 1 from public.listings l
         where l.id = p_context_id
           and private.listing_reachable(
             l.status,
             l.owner_id,
             l.audience_type,
             l.locality_id,
             l.community_id
           )
      )
    )
    else false
  end;
$$;

revoke all on function private.dm_context_valid(uuid, uuid, public.dm_context_type, uuid)
  from public, anon;
grant execute on function private.dm_context_valid(uuid, uuid, public.dm_context_type, uuid)
  to authenticated;
