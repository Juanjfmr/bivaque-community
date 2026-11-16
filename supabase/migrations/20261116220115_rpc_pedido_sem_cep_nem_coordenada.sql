-- SEC-013 — os RPCs do pedido param de devolver CEP e coordenada, e a
-- localização do pedido nasce do cache do CEP, nunca do chamador.
--
-- Autoridade: auditoria independente do security-auditor de 16/11 sobre a main
-- 2bb231d8 (.work/orq/relatorios/auditoria-r3-lote2a.md, F1 e F5 HIGH/LOW, F4
-- MEDIUM) e as decisões do coordenador de 16/11 registradas na emenda SEC-013
-- de docs/decisions/ADR-20261116-cep-no-anuncio-avo-limite-e-coordenada-ausente.md.
--
-- 1. F1/F5 — `close_service_request`, `update_service_request` e
--    `cancel_service_request` são `security definer` e devolviam
--    `to_jsonb(v_req)`: dentro do definer o grant por coluna de `authenticated`
--    não vale, então o prestador (e o próprio solicitante) liam `cep`,
--    `latitude` e `longitude` pelo payload da RPC. As três passam a devolver a
--    lista explícita de `private.service_request_payload` — a MESMA lista que o
--    grant por coluna publica, sem as três colunas cruas. Semântica, grants e
--    `security definer` inalterados; `create or replace` preserva a ACL.
-- 2. F4 — `create_service_request` aceitava `p_latitude`, `p_longitude` e
--    `p_region` do chamador e gravava: coordenada arbitrária e um bairro
--    escolhido pela solicitante (spoofing de proximidade ao prestador). Os três
--    parâmetros seguem na assinatura (é o que a rota viva envia) e passam a ser
--    IGNORADOS: coordenada e bairro são derivados de `public.cep_geocodes` a
--    partir do CEP. Sem CEP, ou com CEP fora do cache, o pedido fica sem
--    coordenada e sem bairro — nunca com um valor do chamador. Uma chamada
--    direta ao RPC com coordenada ou bairro forjados grava o que o cache diz.

begin;

-- ---------------------------------------------------------------------------
-- 1. O payload de um pedido, num lugar só
-- ---------------------------------------------------------------------------

-- Uma lista só, e só uma: acrescentar coluna publicada ao pedido é editar aqui,
-- e nenhuma das três RPCs abaixo volta a serializar a linha inteira. Nenhuma
-- das colunas de cálculo (`cep`, `latitude`, `longitude`) aparece — é o mesmo
-- conjunto que o grant por coluna de 20261116185541:102-121 publica.
--
-- `stable` e não `immutable`: a grafia de `timestamptz` em jsonb depende da
-- sessão (TimeZone/DateStyle). Nada de EXECUTE para membro: é chamada de
-- dentro do definer, não porta de leitura.
create function private.service_request_payload(r public.service_requests)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', r.id,
    'requester_user_id', r.requester_user_id,
    'provider_id', r.provider_id,
    'provider_user_id', r.provider_user_id,
    'description', r.description,
    'when_text', r.when_text,
    'status', r.status,
    'conversation_id', r.conversation_id,
    'idempotency_key', r.idempotency_key,
    'category', r.category,
    'region', r.region,
    'first_responded_at', r.first_responded_at,
    'closed_at', r.closed_at,
    'closed_by_user_id', r.closed_by_user_id,
    'cancelled_at', r.cancelled_at,
    'cancelled_by_user_id', r.cancelled_by_user_id,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  );
$$;

comment on function private.service_request_payload(public.service_requests) is
  'Payload publico de um pedido de servico: lista explicita de colunas, sem cep, latitude e longitude. Usado pelas RPCs de encerrar, editar e cancelar.';

revoke all on function private.service_request_payload(public.service_requests)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. F1 — encerrar
-- ---------------------------------------------------------------------------

-- Cópia fiel de 20260911105119:230-268 trocando só o que sai: o retorno passa a
-- ser o payload publicado. A leitura da linha continua `select *` aqui dentro
-- (o definer precisa dela para decidir), mas nada dela crua chega ao chamador.
create or replace function public.close_service_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'request not found' using errcode = '42501';
  end if;
  if v_me <> v_req.requester_user_id and v_me <> v_req.provider_user_id then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  -- Idempotente e a prova do conflito concorrente: quem chega depois le o
  -- estado ja encerrado, com o ator e o instante da primeira vez.
  if v_req.status <> 'closed' then
    update public.service_requests
       set status = 'closed',
           closed_at = now(),
           closed_by_user_id = v_me
     where id = p_request_id
     returning * into v_req;
  end if;

  return private.service_request_payload(v_req);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. F1 — editar
-- ---------------------------------------------------------------------------

-- Cópia fiel de 20260911105119:275-329, só o retorno muda.
create or replace function public.update_service_request(
  p_request_id uuid,
  p_description text,
  p_when_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_desc text := btrim(coalesce(p_description, ''));
  v_when text := nullif(btrim(coalesce(p_when_text, '')), '');
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_desc = '' then
    raise exception 'description required' using errcode = '22023';
  end if;
  if char_length(v_desc) > 500 then
    raise exception 'description too long' using errcode = '22023';
  end if;
  if v_when is not null and char_length(v_when) > 120 then
    raise exception 'when too long' using errcode = '22023';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'request not found' using errcode = '42501';
  end if;

  -- Só o solicitante edita, e não depois de encerrado/cancelado. O
  -- destinatario NÃO é parâmetro: permanece fixo na criação.
  if v_req.requester_user_id <> v_me then
    raise exception 'only the requester can edit' using errcode = '42501';
  end if;
  if v_req.status in ('closed', 'cancelled') then
    raise exception 'request not editable' using errcode = '42501';
  end if;

  update public.service_requests
     set description = v_desc,
         when_text = v_when
   where id = p_request_id
   returning * into v_req;

  return private.service_request_payload(v_req);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. F1 — cancelar
-- ---------------------------------------------------------------------------

-- Cópia fiel de 20260912063553:193-233, só o retorno muda.
create or replace function public.cancel_service_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  if v_req.requester_user_id <> v_me then
    raise exception 'only the requester cancels' using errcode = '42501';
  end if;

  if v_req.status not in ('open', 'in_conversation') then
    raise exception 'request already finished' using errcode = '22023';
  end if;

  update public.service_requests
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by_user_id = v_me
   where id = p_request_id
   returning * into v_req;

  return private.service_request_payload(v_req);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. F4 — a localização do pedido vem do cache do CEP
-- ---------------------------------------------------------------------------

-- `p_latitude`, `p_longitude` e `p_region` CONTINUAM na assinatura (é o que a
-- rota viva envia) e são IGNORADOS: coordenada e bairro saem do cache do CEP,
-- nunca da chamada. Manter o parâmetro e ignorá-lo é mais seguro do que confiar
-- nele por engano no futuro, e não quebra quem já chama.
create or replace function public.create_service_request(
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
  v_latitude double precision;
  v_longitude double precision;
  v_region text;
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

  -- O CEP é a ÚNICA entrada de localização. O chamador do servidor já manda os
  -- oito dígitos, mas o RPC não confia em forma que ele mesmo não checou.
  if v_cep is not null then
    v_cep := pg_catalog.regexp_replace(v_cep, '[^0-9]', '', 'g');
    if v_cep !~ '^[0-9]{8}$' then
      raise exception 'invalid cep' using errcode = '22023';
    end if;
  end if;

  -- SEC-013/F4: coordenada e bairro saem do cache do CEP — o prestador tem de
  -- ver o bairro real da solicitante, não o que ela digitou. CEP fora do cache
  -- (ou sem CEP) deixa o pedido sem ponto e sem bairro: a distância é um extra,
  -- e um bairro inventado é pior do que bairro nenhum.
  if v_cep is not null then
    select g.latitude, g.longitude, g.neighborhood
      into v_latitude, v_longitude, v_region
      from public.cep_geocodes g
     where g.cep = v_cep;
  end if;

  -- A coluna `region` proíbe CEP no lugar do bairro (CHECK de 20261022120200) e
  -- o texto vem da fonte: um bairro que parece CEP vira ausência de bairro, não
  -- erro de criação do pedido.
  v_region := nullif(btrim(v_region), '');
  if v_region is not null and private.is_cep_like(v_region) then
    v_region := null;
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
    v_latitude,
    v_longitude,
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

commit;