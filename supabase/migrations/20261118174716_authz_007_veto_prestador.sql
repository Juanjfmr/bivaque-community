-- AUTHZ-007 (R3, aceito por delegação — ver
-- docs/decisions/ADR-20261118-veto-de-escrita-nas-demais-tabelas-de-conteudo.md,
-- seção "Emenda de 18/11, AUTHZ-007").
--
-- Fecha o achado M2 do security-auditor sobre o lote AUTHZ-006: a página de
-- negócio do membro, o catálogo, as fotos de portfólio e o pedido de serviço não
-- olhavam suspensão nem exclusão pedida, e o upload de foto de anúncio, de
-- evento e de portfólio com service_role também não conferia a conta (o objeto
-- ficava órfão, porque a linha no banco era vetada). Nas policies e RPCs abaixo,
-- mesmo predicado e mesmo erro do AUTHZ-006: o helper
-- private.can_write_own_content() e o SQLSTATE 42501. O veto de FOTO é do
-- servidor, antes do service_role (seção abaixo); nada aqui toca o schema
-- storage.
--
-- Provado em supabase/tests/authz-007-veto-prestador.sql.

do $$
declare
  v_table text;
  v_cmd text;
begin
  foreach v_table in array array[
    'provider_profiles',
    'provider_catalog_items',
    'provider_portfolio_photos'
  ] loop
    foreach v_cmd in array array['insert', 'update', 'delete'] loop
      if v_cmd = 'insert' then
        execute format(
          'create policy %I on public.%I as restrictive for insert to authenticated '
          'with check ((select private.can_write_own_content()))',
          v_table || '_veto_conta_' || v_cmd, v_table
        );
      elsif v_cmd = 'update' then
        execute format(
          'create policy %I on public.%I as restrictive for update to authenticated '
          'using ((select private.can_write_own_content())) '
          'with check ((select private.can_write_own_content()))',
          v_table || '_veto_conta_' || v_cmd, v_table
        );
      else
        execute format(
          'create policy %I on public.%I as restrictive for delete to authenticated '
          'using ((select private.can_write_own_content()))',
          v_table || '_veto_conta_' || v_cmd, v_table
        );
      end if;
    end loop;
  end loop;
end;
$$;

-- Veto de FOTO (anúncio, evento e portfólio): no SERVIDOR, antes do upload
-- privilegiado. O upload desses buckets é da Server Action/rota com
-- service_role, que ignora RLS — desde o SEC-006 nenhum cliente tem INSERT em
-- storage.objects, e uma policy de storage quebraria a prova do SEC-006. A
-- primeira versão desta migration usava um trigger before insert em
-- storage.objects; saiu porque no Supabase hospedado o papel que roda a
-- migration não é dono do schema storage e o push inteiro falharia. A recusa é
-- conferida agora no caminho de upload, pela sessão da pessoa, antes do
-- service_role — e a linha da tabela continua vetada pelas policies acima.
--
-- A conferência do servidor usa a RPC pública de autoverificação abaixo: o
-- predicado de verdade continua sendo private.can_write_own_content(), mas o
-- PostgREST só nomeia o schema public. Como is_account_suspended, a RPC
-- resolve a identidade pelo JWT da sessão — nunca por parâmetro — então não
-- vira oráculo do estado de outra pessoa.
create function public.can_account_write_content()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_write_own_content();
$$;

revoke all on function public.can_account_write_content() from public, anon;
grant execute on function public.can_account_write_content() to authenticated;

-- create_member_business_page: mesmo corpo de 20260927005841_member_business_page_follows_owner.sql,
-- com o veto logo depois da autenticação.
create or replace function public.create_member_business_page(
  p_display_name text,
  p_category public.provider_category,
  p_bio text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_locality_id uuid;
  v_provider_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = v_user_id
  ) then
    raise exception 'civil provider accounts use the existing profile flow'
      using errcode = '42501';
  end if;

  select lm.locality_id
    into v_locality_id
    from public.locality_memberships lm
   where lm.user_id = v_user_id
     and lm.kind = 'current'
     and lm.access = 'active'
    for update;

  if v_locality_id is null then
    raise exception 'an active current locality membership is required'
      using errcode = '42501';
  end if;

  if p_display_name is null
     or char_length(btrim(p_display_name)) not between 2 and 80
     or p_category is null
     or (p_bio is not null and char_length(btrim(p_bio)) not between 1 and 800)
  then
    raise exception 'invalid business profile fields' using errcode = '22023';
  end if;

  select p.id into v_provider_id
    from public.provider_profiles p
   where p.owner_user_id = v_user_id;

  if v_provider_id is not null then
    perform private.move_member_business_reach(v_user_id, v_locality_id);
    insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
    select v_provider_id, 'locality', v_locality_id, 'free', true
     where not exists (
       select 1 from public.provider_reach r
        where r.provider_id = v_provider_id
          and r.scope_type = 'locality'
          and r.source = 'free'
     );
    return v_provider_id;
  end if;

  insert into public.provider_profiles (
    owner_user_id, display_name, category, bio
  ) values (
    v_user_id,
    btrim(p_display_name),
    p_category,
    nullif(btrim(p_bio), '')
  )
  returning id into v_provider_id;

  insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
  values (v_provider_id, 'locality', v_locality_id, 'free', true);

  return v_provider_id;
end;
$$;

-- update_member_business_page: mesmo corpo de 20260926164158_member_business_page.sql,
-- com o veto logo depois da autenticação.
create or replace function public.update_member_business_page(
  p_provider_id uuid,
  p_display_name text,
  p_category public.provider_category,
  p_bio text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = v_user_id
  ) or not public.can_manage_provider_profile(p_provider_id) then
    raise exception 'only the active member owner may update this page'
      using errcode = '42501';
  end if;

  perform 1
    from public.locality_memberships lm
   where lm.user_id = v_user_id
     and lm.kind = 'current'
     and lm.access = 'active'
    for update;
  if not found then
    raise exception 'an active current locality membership is required'
      using errcode = '42501';
  end if;

  if p_display_name is null
     or char_length(btrim(p_display_name)) not between 2 and 80
     or p_category is null
     or (p_bio is not null and char_length(btrim(p_bio)) not between 1 and 800)
  then
    raise exception 'invalid business profile fields' using errcode = '22023';
  end if;

  update public.provider_profiles
     set display_name = btrim(p_display_name),
         category = p_category,
         bio = nullif(btrim(p_bio), '')
   where id = p_provider_id
     and owner_user_id = v_user_id;

  if not found then
    raise exception 'business page not found' using errcode = '42501';
  end if;
end;
$$;

-- create_service_request: mesmo corpo de 20261116220115_rpc_pedido_sem_cep_nem_coordenada.sql,
-- com o veto logo depois da autenticação. O veto substitui o
-- account_deletion_requested(v_me) antigo, que cobria só metade do estado (não
-- via suspensão); o do prestador permanece, porque o prestador não é o chamador.
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

  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
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
  -- O lado da solicitante é o veto de cima; o do prestador continua aqui.
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
