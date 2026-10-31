-- RECON-026 — o ciclo de vida do anúncio passa a ser uma transição de servidor.
--
-- O RECON-025 criou `listings` com as situações draft/active/paused/reserved/sold/
-- closed, mas deixou a escrita de situação como um UPDATE direto: qualquer dono
-- podia saltar de `closed` para `active` sem deixar rastro. Este lote põe a
-- transição no servidor — `public.transition_listing` é a única via autorizada,
-- valida a passagem, é idempotente e registra cada mudança em
-- `listing_status_events`. A tabela de eventos e as policies que a leem entram
-- nesta mesma migration, como manda a regra da casa.
--
-- ADR-20260909-anuncios-mercado-e-moradia, D2: `draft → active ↔ paused`, de
-- `active` para `reserved`/`sold`/`closed`; `reserved`/`sold` são reversíveis
-- pelo dono enquanto não encerrados; `closed` é terminal.

-- ── disponibilidade e retirada (prancha 21) ──────────────────────────────────
-- A prancha desenha `Disponível até` e `Retirada`. São opcionais e se apresentam
-- como "A combinar" enquanto o dono não os informa — nunca um valor inventado.

alter table public.listings
  add column available_until date,
  add column pickup_note text;

alter table public.listings
  add constraint listings_pickup_note_check
  check (pickup_note is null or char_length(pickup_note) between 1 and 120);

-- ── eventos de situação (auditoria da transição) ─────────────────────────────
-- Sem grant de INSERT/UPDATE/DELETE: a única escrita é a da função definer, e o
-- dono lê o próprio histórico. Assim a trilha não pode ser reescrita pela sessão
-- que a produziu.

create table public.listing_status_events (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  from_status public.listing_status not null,
  to_status public.listing_status not null,
  created_at timestamptz not null default now()
);

create index listing_status_events_listing_idx
  on public.listing_status_events (listing_id, created_at desc);

alter table public.listing_status_events enable row level security;
alter table public.listing_status_events force row level security;

revoke all on table public.listing_status_events from anon, authenticated;
grant select on table public.listing_status_events to authenticated;

create policy listing_status_events_select_owner
on public.listing_status_events
for select
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_status_events.listing_id
      and l.owner_user_id = (select auth.uid())
  )
);

-- ── guarda: transição de situação só pela função ─────────────────────────────
-- Um UPDATE direto da coluna `status` não deixa evento; sem esta guarda a
-- auditoria seria opcional. A função abre a porta com um `set_config` local à
-- transação — o mesmo truque que outros guards deste repositório usam.

create function private.listings_guard_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if coalesce(current_setting('bivaque.listing_transition', true), '') <> 'on' then
      raise exception 'listing status changes only through transition_listing'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_guard_status_transition
before update on public.listings
for each row
execute function private.listings_guard_status_transition();

-- ── a transição ──────────────────────────────────────────────────────────────

create function public.transition_listing(p_listing_id uuid, p_action text)
returns public.listing_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_listing public.listings;
  v_target public.listing_status;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
    into v_listing
    from public.listings
   where id = p_listing_id
     for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.owner_user_id <> v_uid then
    raise exception 'only the listing owner can change its status' using errcode = '42501';
  end if;

  v_target := case p_action
    when 'publish' then 'active'::public.listing_status
    when 'pause' then 'paused'::public.listing_status
    when 'reactivate' then 'active'::public.listing_status
    when 'reserve' then 'reserved'::public.listing_status
    when 'sell' then 'sold'::public.listing_status
    when 'close' then 'closed'::public.listing_status
    else null
  end;

  if v_target is null then
    raise exception 'unknown listing action: %', p_action using errcode = '22023';
  end if;

  if v_target = 'sold' and v_listing.kind <> 'item' then
    raise exception 'only an item can be marked sold' using errcode = '22023';
  end if;

  -- idempotente: já está no destino, nada muda e nada novo é auditado.
  if v_listing.status = v_target then
    return v_listing.status;
  end if;

  if not (
    (v_listing.status = 'draft' and v_target = 'active')
    or (v_listing.status = 'active' and v_target in ('paused', 'reserved', 'sold', 'closed'))
    or (v_listing.status = 'paused' and v_target in ('active', 'closed'))
    or (v_listing.status = 'reserved' and v_target in ('active', 'sold', 'closed'))
    or (v_listing.status = 'sold' and v_target in ('active', 'closed'))
  ) then
    raise exception 'cannot move listing from % to %', v_listing.status, v_target
      using errcode = '22023';
  end if;

  perform set_config('bivaque.listing_transition', 'on', true);

  update public.listings
     set status = v_target,
         published_at = case
           when v_target = 'active' and published_at is null then now()
           else published_at
         end
   where id = p_listing_id;

  insert into public.listing_status_events (listing_id, actor_id, from_status, to_status)
  values (p_listing_id, v_uid, v_listing.status, v_target);

  return v_target;
end;
$$;

revoke all on function public.transition_listing(uuid, text) from public, anon;
grant execute on function public.transition_listing(uuid, text) to authenticated;

revoke all on function private.listings_guard_status_transition() from public, anon;
