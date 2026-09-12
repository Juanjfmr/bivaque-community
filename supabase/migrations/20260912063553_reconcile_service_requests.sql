-- RECON-044 — o pedido a prestador volta a ser um dominio so.
--
-- Duas migrations criaram `service_requests` completa e incompativel:
--   20260911032105_service_requests.sql (RECON-024, carimbo ANTERIOR) e
--   20260911032309_service_requests.sql (RECON-022, a APLICADA). Num banco limpo
--   a primeira cria a tabela e a segunda aborta. A aplicada nao se edita nem se
--   apaga; o arquivo conflitante do RECON-024 sai, e esta migration SOMA a base
--   aplicada as colunas que o painel do negocio (prancha 23) precisa. No fim
--   existe UMA definicao de service_requests em toda a pasta de migrations.
--
-- Decisoes do lote (relatorio RECON-044):
--   1. Descricao: 1..500 — o limite da base aplicada e da borda do formulario
--      canonico (prancha 62, contador 34/500, `validateRequestDescription`).
--      Nao se alarga para 2000 sem mudar o formulario; alargar em silencio
--      deixaria a borda e o banco discordando.
--   2. `conversation_id` permanece ANULAVEL. Torna-la obrigatoria quebraria o
--      pedido que nasce sem conversa (o `on delete set null` ja admite o nulo) e
--      ampliaria o acoplamento; o RPC canonico sempre a preenche.
--   3. Funcoes: `send_conversation_message` (aplicada) sobrevive como a UNICA
--      resposta do prestador — ela ja move `open -> in_conversation` na mesma
--      transacao, entao `respond_to_service_request` nao e recriada (o nome do
--      RECON-024 morre aqui, absorvido por ela). `close_service_request`
--      aplicada sobrevive a versao `void` do RECON-024. `cancel_service_request`
--      entra nova: cancelar (so o solicitante, terminal `cancelled`) e transicao
--      diferente de encerrar (qualquer parte, terminal `closed`).
--
-- `provider_user_id` e `idempotency_key` continuam intactas: a primeira e a
-- coluna de que a policy de leitura do destinatario depende, a segunda e a
-- unicidade por solicitante que faz o reenvio devolver o pedido existente.

-- ── colunas que a fila por situacao precisa ─────────────────────────────────

alter table public.service_requests
  add column category public.provider_category,
  add column region text check (region is null or char_length(region) between 1 and 120),
  add column first_responded_at timestamptz;

-- Backfill das linhas existentes: categoria vem da ficha dona.
update public.service_requests r
   set category = p.category
  from public.provider_profiles p
 where p.id = r.provider_id
   and r.category is null;

-- Pedido que ja esta em conversa ganha o instante da primeira resposta.
update public.service_requests
   set first_responded_at = updated_at
 where first_responded_at is null
   and status = 'in_conversation';

-- A categoria e a da ficha e nunca falta a partir daqui.
alter table public.service_requests
  alter column category set not null;

-- A fila do prestador le (ficha, situacao, recebido).
create index service_requests_provider_status_idx
  on public.service_requests (provider_id, status, created_at desc);

-- ── primeira resposta marca o instante, na mesma transacao ──────────────────

create or replace function private.service_request_mark_first_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'in_conversation'
     and old.status = 'open'
     and new.first_responded_at is null then
    new.first_responded_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.service_request_mark_first_response() from public, anon;

create trigger service_requests_mark_first_response
before update on public.service_requests
for each row execute function private.service_request_mark_first_response();

-- ── criacao canonica passa a gravar a categoria da ficha ────────────────────
-- Replace para frente: o corpo aplicado e preservado (destinatario derivado do
-- banco, `can_see_provider`, idempotencia por solicitante, conversa de contexto
-- fixo) e a unica adicao e `category`, que agora e obrigatoria.

create or replace function public.create_service_request(
  p_provider_id uuid,
  p_description text,
  p_when_text text default null,
  p_idempotency_key text default null
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
  v_existing uuid;
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

  if v_key is not null then
    select r.id into v_existing
      from public.service_requests r
     where r.requester_user_id = v_me
       and r.idempotency_key = v_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- A ordenacao do par e do servidor e a conversa nasce com contexto fixo.
  v_a := least(v_me, v_provider_user);
  v_b := greatest(v_me, v_provider_user);

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, 'provider', p_provider_id)
  on conflict (participant_a, participant_b)
  do update set participant_a = excluded.participant_a
  returning id into v_conv;

  insert into public.service_requests (
    requester_user_id,
    provider_id,
    provider_user_id,
    category,
    description,
    when_text,
    conversation_id,
    idempotency_key
  )
  values (
    v_me,
    p_provider_id,
    v_provider_user,
    v_category,
    btrim(p_description),
    nullif(btrim(coalesce(p_when_text, '')), ''),
    v_conv,
    v_key
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_service_request(uuid, text, text, text) from public, anon;
grant execute on function public.create_service_request(uuid, text, text, text) to authenticated;

-- ── cancelar: so o solicitante, e so antes de encerrado (ADR D1) ─────────────

create function public.cancel_service_request(p_request_id uuid)
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

  return to_jsonb(v_req);
end;
$$;

revoke all on function public.cancel_service_request(uuid) from public, anon;
grant execute on function public.cancel_service_request(uuid) to authenticated;
