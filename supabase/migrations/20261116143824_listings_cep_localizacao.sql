-- RUN-175 / LOC-IMPL L1 — CEP e localização no anúncio (imóvel e desapego).
--
-- ADR-20261022-localizacao-padrao-de-mercado §§1, 2 e 7, com as três lacunas
-- fechadas pelo ADR-20261116 (avô sem backfill, limitador por pessoa, CEP sem
-- coordenada) e a saída de mapa (texto, sem tile).
--
-- O que esta migration materializa:
--
-- 1. `listings` ganha o CEP (8 dígitos, normalizado como o do perfil), a
--    coordenada derivada dele (double precision) e a ESCOLHA publicada
--    (`exata` ou `aproximada`, ADR §1).
-- 2. A obrigatoriedade do CEP do IMÓVEL é da rota, não de um CHECK. Imóvel
--    publicado antes desta migration (o "avô") não tem CEP e continua válido:
--    um CHECK `kind = 'property' → cep is not null` quebraria as linhas
--    existentes e obrigaria backfill — e o ADR proíbe inventar coordenada. A
--    rota exige CEP no POST e na PRIMEIRA edição de cada imóvel.
-- 3. O desapego (item) deixa de exigir bairro (ADR §2: com CEP aparece na
--    cidade/bairro; sem CEP, na cidade). Título, descrição, preço e condição
--    continuam obrigatórios no banco — o relaxo é só do bairro.
-- 4. Privilégio por coluna no molde do perfil (20261110211702): `authenticated`
--    perde o SELECT de cep/latitude/longitude. `select *`, `to_jsonb(l)` e a
--    leitura direta da coordenada passam a falhar com 42501; o dono lê a
--    própria localização por `public.get_listing_location`, e a escolha
--    publicada (localizacao_publica) continua legível porque é o que a tela
--    mostra. INSERT/UPDATE de tabela continuam: quem grava é o dono da linha,
--    sob RLS, e a coordenada não é legível por ninguém além dele — o
--    arredondamento do aproximado é do servidor, não uma barreira de leitura.
-- 5. A purga de conta conhece as colunas: CEP e coordenada do anúncio são dado
--    do titular e saem junto com os do perfil.

begin;

-- ---------------------------------------------------------------------------
-- 1. Colunas da localização do anúncio
-- ---------------------------------------------------------------------------

alter table public.listings
  add column cep text,
  add column latitude double precision,
  add column longitude double precision,
  add column localizacao_publica text;

comment on column public.listings.cep is
  'CEP do anúncio (8 dígitos, sem hífen). Obrigatório no POST de imóvel e na primeira edição de imóvel antigo; opcional no desapego. Nunca devolvido a terceiro.';
comment on column public.listings.latitude is
  'Latitude derivada do CEP no servidor. Aproximada já arredondada quando a escolha é aproximada. Não legível por terceiro (grant por coluna).';
comment on column public.listings.longitude is
  'Longitude derivada do CEP no servidor. Aproximada já arredondada quando a escolha é aproximada. Não legível por terceiro (grant por coluna).';
comment on column public.listings.localizacao_publica is
  'Como o anunciante escolheu aparecer: exata (endereço publicado) ou aproximada (bairro e cidade). Nulo só no anúncio sem CEP.';

alter table public.listings
  add constraint listings_cep_digits
  check (cep is null or cep ~ '^[0-9]{8}$');

alter table public.listings
  add constraint listings_coordinate_range
  check (
    (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
  );

-- Coordenada é um ponto: as duas colunas vêm juntas ou não vêm.
alter table public.listings
  add constraint listings_coordinate_pair
  check ((latitude is null) = (longitude is null));

alter table public.listings
  add constraint listings_localizacao_publica_valor
  check (localizacao_publica is null or localizacao_publica in ('exata', 'aproximada'));

-- Escolha publicada só existe com CEP; sem CEP o anúncio é bairro · cidade.
alter table public.listings
  add constraint listings_localizacao_publica_requires_cep
  check (localizacao_publica is null or cep is not null);

-- Desapego nunca publica local exato (ADR §2: com CEP, coordenada aproximada).
alter table public.listings
  add constraint listings_item_localizacao_aproximada
  check (kind <> 'item' or localizacao_publica is null or localizacao_publica = 'aproximada');

-- Granularidade do aproximado (RUN-175 / revisão R3, achado médio-alto):
-- "aproximada" tem que ser GRADE, não só intenção. Sem este CHECK, `authenticated`
-- ainda tem UPDATE de tabela (20260911043053:278) e poderia gravar via PostgREST a
-- coordenada crua do provedor (6-7 casas) declarando `localizacao_publica =
-- 'aproximada'` — o grant por coluna protege a LEITURA, não a escrita.
--
-- Por que CHECK e não `revoke update (cep, latitude, longitude)`: quem grava a
-- localização é o cliente da SESSÃO, sob RLS — o PATCH faz `update` em `listings`
-- e o POST usa `create_property_listing` (security invoker) com o jsonb. Um revoke
-- por coluna quebraria as duas rotas legítimas e exigiria mover a escrita para
-- service_role, ampliando privilégio em vez de restringir. O CHECK fecha a
-- propriedade no banco e deixa a rota escrever como o dono.
--
-- A conta é a MESMA do servidor (`apps/web/lib/geo/anuncio.ts:naGrade`):
--   publicado = round(coordenada / 0,001) * 0,001 - 0,003
-- ou seja, `(publicado + 0,003) / 0,001` é inteiro — e é isso que este CHECK exige.
-- O que o servidor grava passa; coordenada crua com casas finas não passa (23514).
-- Limite conhecido: quem escrever à mão um valor já na grade (0,001°, ~111 m)
-- passa por definição — é a precisão publicada, e nunca a do provedor.
alter table public.listings
  add constraint listings_localizacao_aproximada_na_grade
  check (
    localizacao_publica is distinct from 'aproximada'
    or latitude is null
    or (
      abs((latitude + 0.003) * 1000 - round((latitude + 0.003) * 1000)) < 1e-6
      and abs((longitude + 0.003) * 1000 - round((longitude + 0.003) * 1000)) < 1e-6
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Desapego: bairro deixa de ser obrigatório
-- ---------------------------------------------------------------------------

-- A regra canônica vivia aqui e exigia bairro no item. O ADR §2 permite
-- desapego só com a cidade (e com CEP a cidade/bairro vêm dele), então o
-- bairro sai da lista. Título, descrição, preço e condição ficam: são o mínimo
-- que a borda de escrita do banco garante.
alter table public.listings
  drop constraint listings_item_required_fields;

alter table public.listings
  add constraint listings_item_required_fields check (
    kind <> 'item'
    or (
      category is not null
      and description is not null
      and price_cents is not null
      and condition is not null
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Privilégio por coluna: authenticated não lê cep/latitude/longitude
-- ---------------------------------------------------------------------------

-- Repete a lista vigente sem as três colunas de cálculo. A escolha publicada
-- (localizacao_publica) fica: é o que a tela do anúncio mostra.
revoke select on table public.listings from public, anon, authenticated;

grant select (
  id,
  owner_user_id,
  kind,
  status,
  title,
  description,
  category,
  condition,
  price_cents,
  locality_id,
  community_id,
  neighborhood,
  created_at,
  updated_at,
  published_at,
  closed_at,
  available_until,
  pickup_note,
  address,
  localizacao_publica
) on public.listings to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Leitura do dono: a própria localização, nunca a de terceiro
-- ---------------------------------------------------------------------------

-- `p_listing_id` nulo devolve a localização de todos os anúncios do chamador
-- (a lista "meus anúncios" preenche o formulário de edição); com id, devolve a
-- daquele anúncio, e só se for dele. A coordenada em si não sai nem aqui: o
-- formulário precisa do CEP e da escolha, não do ponto.
create function public.get_listing_location(p_listing_id uuid default null)
returns table (listing_id uuid, cep text, localizacao_publica text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.cep, l.localizacao_publica
  from public.listings l
  where l.owner_user_id = (select auth.uid())
    and (p_listing_id is null or l.id = p_listing_id);
$$;

comment on function public.get_listing_location(uuid) is
  'CEP e escolha de localização dos anúncios do próprio chamador. Sem id, todos os dele. Nunca devolve coordenada nem a localização de terceiro.';

revoke all on function public.get_listing_location(uuid) from public, anon;
grant execute on function public.get_listing_location(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Criação do imóvel grava a localização na mesma transação
-- ---------------------------------------------------------------------------

-- Cópia fiel de 20261019235819_sec006_photo_invariants_and_atomic_writes.sql,
-- com as quatro colunas novas no INSERT de `listings`. A função continua
-- security invoker: o dono vem de auth.uid() e a RLS de insert segue valendo.
create or replace function public.create_property_listing(p_listing jsonb, p_details jsonb)
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
    cep,
    latitude,
    longitude,
    localizacao_publica,
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
    nullif(p_listing ->> 'cep', ''),
    (p_listing ->> 'latitude')::double precision,
    (p_listing ->> 'longitude')::double precision,
    nullif(p_listing ->> 'localizacao_publica', ''),
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

-- ---------------------------------------------------------------------------
-- 6. Exclusão de conta apaga a localização do anúncio (ADR seção 4)
-- ---------------------------------------------------------------------------

-- Cópia FIEL do corpo vigente (20261110211702:322-486) com uma linha a mais: a
-- localização do anúncio do titular também é dado pessoal e sai. Os testes de
-- exclusão de conta exercitam a função inteira, então uma cópia divergente não
-- passa despercebida.
create or replace function public.finalize_account_deletion(
  p_user_id uuid,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due_at timestamptz;
  v_finalized_at timestamptz;
begin
  select due_at, finalized_at into v_due_at, v_finalized_at
  from public.account_deletion_requests
  where user_id = p_user_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_finalized_at is not null then
    return 'already_purged';
  end if;

  if p_error is not null then
    update public.account_deletion_requests
       set purge_last_error = left(p_error, 500)
     where user_id = p_user_id;
    return 'failed';
  end if;

  if v_due_at > now() then
    return 'not_due';
  end if;

  delete from private.verification_documents where user_id = p_user_id;

  update public.profiles
     set bio = null,
         neighborhood = null,
         cep = null,
         latitude = null,
         longitude = null,
         consent_version = 0,
         consented_at = null,
         updated_at = now()
   where user_id = p_user_id;

  -- LOC-IMPL L1 (RUN-175): o CEP e a coordenada do anúncio são a origem do
  -- titular, como os do perfil. O anúncio e o texto dele continuam (conteúdo
  -- atribuído ao display_name, item 4 do ADR); o que sai é a localização.
  update public.listings
     set cep = null,
         latitude = null,
         longitude = null,
         localizacao_publica = null
   where owner_user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
  delete from public.notifications where recipient_user_id = p_user_id;
  delete from public.dm_read_states where user_id = p_user_id;
  delete from public.dm_blocks
   where blocker_user_id = p_user_id or blocked_user_id = p_user_id;
  delete from public.post_saves where user_id = p_user_id;
  delete from public.post_reactions where user_id = p_user_id;
  delete from public.post_follows where user_id = p_user_id;
  delete from public.listing_saves where user_id = p_user_id;
  delete from public.listing_alerts where owner_user_id = p_user_id;
  delete from public.recommendation_saves where user_id = p_user_id;
  delete from public.user_group_interests where user_id = p_user_id;
  delete from public.event_rsvps where user_id = p_user_id;

  delete from public.hidden_questions where user_id = p_user_id;

  delete from public.member_entry_moments where user_id = p_user_id;

  delete from public.entry_progress where user_id = p_user_id;

  delete from public.entry_commitments where user_id = p_user_id;

  delete from public.outbox o
   where o.type = 'support_answered'
     and exists (
       select 1
       from public.support_tickets t
       where t.user_id = p_user_id
         and t.id::text = o.payload ->> 'ticket_id'
     );

  delete from public.support_tickets where user_id = p_user_id;

  update public.support_tickets
     set answered_by = null
   where answered_by = p_user_id;

  delete from public.community_memberships cm
   where cm.user_id = p_user_id
     and not exists (
       select 1 from public.communities c
       where c.id = cm.community_id and c.owner_user_id = p_user_id
     );

  delete from public.group_memberships gm
   where gm.user_id = p_user_id
     and not exists (
       select 1 from public.groups g
       where g.id = gm.group_id and g.owner_user_id = p_user_id
     );

  delete from public.locality_memberships where user_id = p_user_id;

  update public.operators
     set revoked_at = coalesce(revoked_at, now())
   where auth_user_id = p_user_id
     and revoked_at is null;

  update public.arrival_guide_entries set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports set resolved_by = null where resolved_by = p_user_id;

  delete from private.family_invitations
   where inviter_user_id = p_user_id or accepted_by_user_id = p_user_id;

  update public.account_deletion_requests
     set finalized_at = now(),
         purge_last_error = null
   where user_id = p_user_id;

  return 'purged';
end;
$$;

commit;