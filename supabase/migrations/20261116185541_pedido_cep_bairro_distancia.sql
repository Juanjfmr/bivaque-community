-- RUN-179 / LOC-IMPL L2 — CEP no pedido, bairro ao prestador, distância em metros.
--
-- ADR-20261022-localizacao-padrao-de-mercado §3 ("o CEP é opcional e serve para
-- a distância até o prestador e para o atendimento por bairro") e §7
-- (geocodificação no servidor, cache-first), com a infraestrutura do RUN-175.
--
-- O que esta migration materializa:
--
-- 1. `service_requests` ganha o CEP (8 dígitos), a coordenada derivada dele no
--    servidor e a paridade dos dois pontos. Não há coluna de "escolha" nem CHECK
--    de granularidade aqui: a coordenada do pedido NUNCA é publicada — ela só
--    serve ao cálculo privado de distância, então não existe superfície para
--    arredondar (o motivo do ADR §1 e do CHECK de `listings` não se aplica).
-- 2. `region` — coluna viva-órfã desde 20260912063553 e já proibida de receber
--    CEP por `service_requests_region_no_cep` (20261022120200) — passa a GRAVAR
--    o bairro derivado. Um dado só, na coluna que o painel do prestador já lê.
-- 3. `authenticated` perde o SELECT das três colunas cruas (molde 20261116143824
--    de `listings`): `select *`, `to_jsonb(r)` e a leitura direta passam a
--    responder 42501. Nem o dono lê o próprio CEP de volta — não existe GET de
--    localização de pedido; o que sai para a tela é `region` (bairro).
-- 4. `public.service_request_distance(p_request_id)` — SECURITY DEFINER,
--    `search_path = ''` — compara a coordenada do PEDIDO com a origem do
--    CHAMADOR (`profiles.latitude/longitude` do próprio `auth.uid()`), devolve
--    METROS arredondados à centena e nunca a coordenada. Sem origem cadastrada,
--    sem coordenada no pedido ou chamador que não participa: `null`, jamais erro
--    e nunca a prova de que o pedido existe. A origem não é parâmetro: a função
--    tem um argumento só (o id do pedido).
-- 5. `create_service_request` é redefinido com os quatro argumentos históricos
--    mais `p_cep`/`p_latitude`/`p_longitude`/`p_region` opcionais, preservando a
--    semântica (posse derivada do banco, `can_see_provider`, bloqueios, teto de
--    abertos, conversa do pedido, idempotência). A versão de 4 argumentos é
--    DROPADA: com as duas no schema, a chamada de 4 argumentos resolveria para a
--    antiga (match exato) e o CEP seria descartado em silêncio.
-- 6. `finalize_account_deletion` conhece as colunas: CEP, coordenada e bairro do
--    pedido são dado do titular e saem junto com os do perfil e do anúncio.
-- 7. `public.cep_geocodes` guarda o bairro que a fonte devolveu junto do CEP.
--    Sem isso o bairro só existiria na PRIMEIRA geocodificação daquele CEP em
--    toda a base (o cache só guardava a coordenada) e todo mundo depois cairia
--    no cache hit sem bairro — o pedido perderia `region` conforme o uso.

begin;

-- ---------------------------------------------------------------------------
-- 1. Colunas da localização do pedido
-- ---------------------------------------------------------------------------

alter table public.service_requests
  add column cep text,
  add column latitude double precision,
  add column longitude double precision;

comment on column public.service_requests.cep is
  'CEP do pedido (8 digitos, sem hifen), opcional. So serve a distancia e ao bairro do prestador; nao legivel por ninguem (grant por coluna), nem pelo dono.';
comment on column public.service_requests.latitude is
  'Latitude derivada do CEP no servidor, nunca publicada: so o calculo privado de service_request_distance a le.';
comment on column public.service_requests.longitude is
  'Longitude derivada do CEP no servidor, nunca publicada: so o calculo privado de service_request_distance a le.';
comment on column public.service_requests.region is
  'Bairro derivado do CEP do pedido (o que o prestador ve). Escrito so pelo create_service_request.';

alter table public.service_requests
  add constraint service_requests_cep_digits
  check (cep is null or cep ~ '^[0-9]{8}$');

alter table public.service_requests
  add constraint service_requests_coordinate_range
  check (
    (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
  );

-- Coordenada é um ponto: as duas colunas vêm juntas ou não vêm.
alter table public.service_requests
  add constraint service_requests_coordinate_pair
  check ((latitude is null) = (longitude is null));

-- ---------------------------------------------------------------------------
-- 2. O cache de CEP passa a guardar o bairro
-- ---------------------------------------------------------------------------

-- Sem esta coluna, o bairro do CEP só existiria na primeira consulta real de
-- cada CEP em toda a base: o cache hit devolveria só a coordenada e o pedido
-- seguinte ficaria sem `region` (limitante herdado do RUN-175, fechado aqui).
-- O CEP continua sendo a chave e o valor gravado é o texto da fonte, já na
-- grafia do catálogo quando casou; nada aqui é lido por membro (a tabela é do
-- servidor).
alter table public.cep_geocodes
  add column neighborhood text
  check (neighborhood is null or char_length(neighborhood) between 1 and 120);

comment on column public.cep_geocodes.neighborhood is
  'Bairro que a fonte devolveu com o CEP (texto da fonte, ja na grafia do catalogo quando casou). Guardado para o cache hit nao perder o bairro do pedido.';

-- ---------------------------------------------------------------------------
-- 3. Privilégio por coluna: authenticated não lê cep/latitude/longitude
-- ---------------------------------------------------------------------------

-- Repete a lista vigente sem as três colunas de cálculo. `region` fica: é o
-- bairro, o dado que a tela e o painel do prestador mostram.
revoke select on table public.service_requests from public, anon, authenticated;

grant select (
  id,
  requester_user_id,
  provider_id,
  provider_user_id,
  description,
  when_text,
  status,
  conversation_id,
  idempotency_key,
  category,
  region,
  first_responded_at,
  closed_at,
  closed_by_user_id,
  cancelled_at,
  cancelled_by_user_id,
  created_at,
  updated_at
) on public.service_requests to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Distância do chamador até o pedido (metros, à centena)
-- ---------------------------------------------------------------------------

-- A origem é sempre a do próprio chamador (auth.uid()), nunca um parâmetro; o
-- destino é a coordenada privada do pedido. Participar é condição de resposta:
-- quem não é solicitante nem prestador destinatário recebe NULL — o mesmo
-- silêncio da RLS, sem revelar que o pedido existe. Sem origem no perfil ou sem
-- coordenada no pedido, NULL (e não erro): a distância é um extra, não um
-- requisito do pedido.
create function public.service_request_distance(p_request_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (pg_catalog.round(
            private.distancia_em_metros(
              p.latitude, p.longitude, r.latitude::numeric, r.longitude::numeric
            ) / 100
          ) * 100)::integer
  from public.service_requests r
  join public.profiles p on p.user_id = (select auth.uid())
  where r.id = p_request_id
    and (
      r.requester_user_id = (select auth.uid())
      or r.provider_user_id = (select auth.uid())
    )
    and p.latitude is not null
    and p.longitude is not null
    and r.latitude is not null
    and r.longitude is not null;
$$;

comment on function public.service_request_distance(uuid) is
  'Distancia em metros, arredondada a centena, da origem privada do chamador ate a coordenada privada do pedido. So responde a participante; nunca devolve coordenada.';

revoke all on function public.service_request_distance(uuid) from public, anon;
grant execute on function public.service_request_distance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Criação do pedido grava a localização na mesma transação
-- ---------------------------------------------------------------------------

-- A versão de 4 argumentos sai do schema ANTES da nova: com as duas presentes,
-- a chamada histórica de 4 argumentos casaria com a antiga (match exato) e o
-- CEP passaria em silêncio para o vazio.
drop function public.create_service_request(uuid, text, text, text);

-- Cópia fiel de 20260923120000:23-157 (a definição vigente: bloqueios, teto de
-- cinco abertos por par sob advisory lock, idempotência ANTES do teto e conversa
-- própria do pedido) com os quatro parâmetros opcionais e a gravação de
-- cep/latitude/longitude/region. Nada mais mudou de semântica.
create function public.create_service_request(
  p_provider_id uuid,
  p_description text,
  p_when_text text default null,
  p_idempotency_key text default null,
  p_cep text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_region text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_provider_user uuid;
  v_category public.provider_category;
  v_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_cep text := nullif(btrim(coalesce(p_cep, '')), '');
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_existing uuid;
  v_open_count integer;
  v_a uuid;
  v_b uuid;
  v_conv uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_description is null or btrim(p_description) = '' then
    raise exception 'description required' using errcode = '22023';
  end if;
  if char_length(btrim(p_description)) > 500 then
    raise exception 'description too long' using errcode = '22023';
  end if;
  if p_when_text is not null and char_length(btrim(p_when_text)) > 120 then
    raise exception 'when too long' using errcode = '22023';
  end if;

  -- Localização: normalizada aqui como no perfil. O chamador do servidor já
  -- manda os oito dígitos, mas o RPC não confia em forma que ele mesmo não
  -- checou — e o mesmo vale para o par de coordenadas.
  if v_cep is not null then
    v_cep := pg_catalog.regexp_replace(v_cep, '[^0-9]', '', 'g');
    if v_cep !~ '^[0-9]{8}$' then
      raise exception 'invalid cep' using errcode = '22023';
    end if;
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'coordinate without pair' using errcode = '22023';
  end if;
  if p_latitude is not null and p_latitude not between -90 and 90 then
    raise exception 'latitude out of range' using errcode = '22023';
  end if;
  if p_longitude is not null and p_longitude not between -180 and 180 then
    raise exception 'longitude out of range' using errcode = '22023';
  end if;
  if char_length(coalesce(v_region, '')) > 120 then
    raise exception 'region too long' using errcode = '22023';
  end if;

  select pp.owner_user_id, pp.category
    into v_provider_user, v_category
    from public.provider_profiles pp
   where pp.id = p_provider_id
     and pp.is_deleted = false;

  if v_provider_user is null then
    raise exception 'provider not found' using errcode = 'P0002';
  end if;

  if v_provider_user = v_me then
    raise exception 'cannot request from the own profile' using errcode = '42501';
  end if;

  if not private.can_see_provider(p_provider_id) then
    raise exception 'provider not visible' using errcode = '42501';
  end if;

  -- ADR-20260922-conversa-por-pedido: os bloqueios valem para as duas conversas
  -- e cada pedido abre uma conversa nova (as mesmas regras de open_conversation).
  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;
  if private.account_deletion_requested(v_provider_user) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = v_provider_user)
       or (blocker_user_id = v_provider_user and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A idempotência vem ANTES do teto: reenviar o mesmo pedido devolve o pedido
  -- que já existe, e não pode virar recusa por ocupar a quinta vaga ele mesmo.
  if v_key is not null then
    select r.id into v_existing
      from public.service_requests r
     where r.requester_user_id = v_me
       and r.idempotency_key = v_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- ADR-20260923-teto-de-pedidos-por-par: cinco em aberto por par, com o lock
  -- do par (não do prestador nem da pessoa) contra dois envios simultâneos.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_me::text || ':' || v_provider_user::text, 0)
  );

  select count(*)::integer
    into v_open_count
    from public.service_requests r
   where r.requester_user_id = v_me
     and r.provider_user_id = v_provider_user
     and r.status in ('open', 'in_conversation');

  if v_open_count >= 5 then
    raise exception 'maximum 5 open service requests per requester and provider'
      using errcode = '54000';
  end if;

  -- A ordenação do par é do servidor e a conversa nasce com contexto fixo.
  v_a := least(v_me, v_provider_user);
  v_b := greatest(v_me, v_provider_user);

  -- ADR-20260922-conversa-por-pedido: cada pedido nasce com a sua conversa, de
  -- contexto service_request e context_id = id do pedido.
  v_id := gen_random_uuid();

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, 'service_request', v_id)
  returning id into v_conv;

  insert into public.service_requests (
    id,
    requester_user_id,
    provider_id,
    provider_user_id,
    category,
    description,
    when_text,
    conversation_id,
    idempotency_key,
    cep,
    latitude,
    longitude,
    region
  )
  values (
    v_id,
    v_me,
    p_provider_id,
    v_provider_user,
    v_category,
    btrim(p_description),
    nullif(btrim(coalesce(p_when_text, '')), ''),
    v_conv,
    v_key,
    v_cep,
    p_latitude,
    p_longitude,
    v_region
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_service_request(
  uuid, text, text, text, text, double precision, double precision, text
) from public, anon;
grant execute on function public.create_service_request(
  uuid, text, text, text, text, double precision, double precision, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Exclusão de conta apaga a localização do pedido (ADR seção 4)
-- ---------------------------------------------------------------------------

-- Cópia FIEL do corpo vigente (20261116143824:289-424) com as quatro colunas do
-- pedido zeradas para quem pediu. O pedido continua (conteúdo atribuído ao
-- display_name), o que sai é a localização do titular — como no perfil e no
-- anúncio. `region` sai junto: o bairro é derivado do CEP do titular.
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

  update public.listings
     set cep = null,
         latitude = null,
         longitude = null,
         localizacao_publica = null
   where owner_user_id = p_user_id;

  -- LOC-IMPL L2 (RUN-179): a localização do pedido é a do solicitante.
  update public.service_requests
     set cep = null,
         latitude = null,
         longitude = null,
         region = null
   where requester_user_id = p_user_id;

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