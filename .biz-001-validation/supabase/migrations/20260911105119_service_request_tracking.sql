-- RECON-023 — acompanhamento do pedido (prancha 17, R43/R44, C12).
--
-- Executa o que o ADR-20260909-pedidos-e-conversa-contextual deixou para este
-- lote, depois que RECON-022 criou o objeto:
--
--   D1 — a situacao do pedido vive na COLUNA, nunca na contagem de mensagens.
--        Encerrar registra ATOR (`closed_at` / `closed_by_user_id`) e e
--        idempotente: encerrar de novo devolve o mesmo estado, sem reescrever o
--        ator original. E `closed` nao significa servico prestado nem pago.
--   D2 — a conversa ja existe em `dm_conversations` (contexto `provider`, criada
--        por `create_service_request`). Aqui ela ganha (a) chave de idempotencia
--        por remetente, para reenvio repetido nao duplicar, e (b) a transicao do
--        pedido na PRIMEIRA resposta do prestador, na MESMA transacao.
--   D4 — leitura (nao lida) e estado por participante, derivado da sessao.
--
-- Nenhum corpo de request injeta participante, contexto ou destinatario:
-- `send_conversation_message` deriva o remetente de `auth.uid()` e o contexto do
-- par ja gravado na conversa; `close_service_request` e `update_service_request`
-- derivam o ator da sessao e conferem participacao no banco. O destinatario
-- nunca e parametro de edicao.
--
-- As policies que sustentam a leitura moram NESTE arquivo, junto das colunas que
-- elas leem (regra do AGENTS.md: scope e policy caem na mesma migration).

-- ── D1: colunas de encerramento ──────────────────────────────────────────────

alter table public.service_requests
  add column closed_at timestamptz,
  add column closed_by_user_id uuid references auth.users (id) on delete set null,
  add column cancelled_at timestamptz,
  add column cancelled_by_user_id uuid references auth.users (id) on delete set null;

-- `closed` exige `closed_at`: a coluna e a situacao nao podem discordar.
alter table public.service_requests
  add constraint service_requests_closed_consistency check (
    (status = 'closed') = (closed_at is not null)
  );

-- ── D2: idempotencia de envio ────────────────────────────────────────────────

alter table public.dm_messages
  add column client_key text;

alter table public.dm_messages
  add constraint dm_messages_client_key_length check (
    client_key is null or char_length(client_key) between 1 and 120
  );

-- Um reenvio do mesmo rascunho (mesma chave, mesmo remetente) e a MESMA linha.
create unique index dm_messages_sender_client_key_unique
  on public.dm_messages (conversation_id, sender_id, client_key)
  where client_key is not null;

-- ── D4: estado de leitura por participante ───────────────────────────────────

create table public.dm_read_states (
  conversation_id uuid not null references public.dm_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create trigger dm_read_states_set_updated_at
before update on public.dm_read_states
for each row execute function private.set_updated_at();

alter table public.dm_read_states enable row level security;
alter table public.dm_read_states force row level security;

-- Leitura so do proprio estado e so de conversa em que se participa; escrita
-- passa pelo RPC `mark_conversation_read`, que reconfere a participacao.
revoke all on table public.dm_read_states from anon, authenticated;
grant select on table public.dm_read_states to authenticated;

create policy dm_read_states_select_own
on public.dm_read_states
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_dm_participant(conversation_id)
);

-- ── RPC: enviar mensagem com dedup e transicao transacional ──────────────────

create function public.send_conversation_message(
  p_conversation_id uuid,
  p_content text,
  p_client_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_content text := btrim(coalesce(p_content, ''));
  v_key text := nullif(btrim(coalesce(p_client_key, '')), '');
  v_conv public.dm_conversations%rowtype;
  v_msg public.dm_messages%rowtype;
  v_status public.service_request_status;
  v_provider uuid;
  v_request_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_content = '' then
    raise exception 'message required' using errcode = '22023';
  end if;
  if char_length(v_content) > 2000 then
    raise exception 'message too long' using errcode = '22023';
  end if;

  select * into v_conv from public.dm_conversations where id = p_conversation_id;
  if not found then
    raise exception 'conversation not found' using errcode = '42501';
  end if;
  if v_me <> v_conv.participant_a and v_me <> v_conv.participant_b then
    raise exception 'not a participant' using errcode = '42501';
  end if;
  if exists (
    select 1
      from public.dm_blocks b
     where (b.blocker_user_id = v_conv.participant_a
            and b.blocked_user_id = v_conv.participant_b)
        or (b.blocker_user_id = v_conv.participant_b
            and b.blocked_user_id = v_conv.participant_a)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- Reenvio repetido devolve a linha ja gravada em vez de criar outra.
  if v_key is not null then
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    if found then
      return to_jsonb(v_msg);
    end if;
  end if;

  insert into public.dm_messages (conversation_id, sender_id, content, client_key)
  values (p_conversation_id, v_me, v_content, v_key)
  on conflict (conversation_id, sender_id, client_key) where client_key is not null
  do nothing
  returning * into v_msg;

  if v_msg.id is null then
    -- Corrida: outra transacao gravou a mesma chave primeiro.
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    return to_jsonb(v_msg);
  end if;

  -- A situacao muda na PRIMEIRA resposta do PRESTADOR, na mesma transacao em
  -- que a mensagem e gravada. Depois disso a coluna permanece. Enquanto o
  -- pedido nao esta encerrado, a mensagem tambem move a "ultima atualizacao"
  -- que a lista mostra.
  select r.id, r.status, r.provider_user_id
    into v_request_id, v_status, v_provider
    from public.service_requests r
   where r.conversation_id = p_conversation_id
   for update;
  if found then
    if v_status = 'open' and v_me = v_provider then
      update public.service_requests
         set status = 'in_conversation'
       where id = v_request_id;
    elsif v_status <> 'closed' and v_status <> 'cancelled' then
      update public.service_requests
         set updated_at = now()
       where id = v_request_id;
    end if;
  end if;

  return to_jsonb(v_msg);
end;
$$;

revoke all on function public.send_conversation_message(uuid, text, text) from public, anon;
grant execute on function public.send_conversation_message(uuid, text, text) to authenticated;

-- ── RPC: marcar conversa como lida ───────────────────────────────────────────

create function public.mark_conversation_read(
  p_conversation_id uuid,
  p_seen_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_seen timestamptz := least(coalesce(p_seen_at, now()), now());
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1
      from public.dm_conversations c
     where c.id = p_conversation_id
       and (c.participant_a = v_me or c.participant_b = v_me)
  ) then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  insert into public.dm_read_states (conversation_id, user_id, last_read_at)
  values (p_conversation_id, v_me, v_seen)
  on conflict (conversation_id, user_id)
  do update set last_read_at = greatest(public.dm_read_states.last_read_at, excluded.last_read_at);
end;
$$;

revoke all on function public.mark_conversation_read(uuid, timestamptz) from public, anon;
grant execute on function public.mark_conversation_read(uuid, timestamptz) to authenticated;

-- ── RPC: encerrar pedido, idempotente e com ator ─────────────────────────────

create function public.close_service_request(p_request_id uuid)
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

  return to_jsonb(v_req);
end;
$$;

revoke all on function public.close_service_request(uuid) from public, anon;
grant execute on function public.close_service_request(uuid) to authenticated;

-- ── RPC: editar pedido sem tocar o destinatario ──────────────────────────────

create function public.update_service_request(
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

  return to_jsonb(v_req);
end;
$$;

revoke all on function public.update_service_request(uuid, text, text) from public, anon;
grant execute on function public.update_service_request(uuid, text, text) to authenticated;
