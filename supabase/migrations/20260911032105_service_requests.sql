-- RECON-024 (prancha 23) / RECON-022 dependem desta primitiva: o pedido de
-- serviço é um OBJETO com situação própria, e a conversa nasce colada nele.
-- ADR-20260909-pedidos-e-conversa-contextual, D1 e D2.
--
-- Por que aqui e não em dm_conversations: a conversa é a base de mensagem, não o
-- estado do pedido. As abas Novos / Em conversa / Encerrados leem a COLUNA
-- status, nunca a existência de mensagem (D1, alternativa 4 recusada).
--
-- A conversa reusa o contexto `provider` já existente (dm_context_valid:
-- só o Membro inicia, o dono da ficha não pode ser o autor, e `can_see_provider`
-- precisa valer). Um tipo de contexto por pedido exigiria afrouxar a unicidade
-- (participant_a, participant_b) de dm_conversations — fora do escopo desta
-- migration e do ADR; fica registrado como divergência no relatório do lote.

create type public.service_request_status as enum (
  'open',
  'in_conversation',
  'closed',
  'cancelled'
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users (id) on delete cascade,
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  conversation_id uuid not null references public.dm_conversations (id) on delete cascade,
  category public.provider_category not null,
  description text not null check (char_length(description) between 10 and 2000),
  when_text text check (when_text is null or char_length(when_text) between 1 and 120),
  region text check (region is null or char_length(region) between 1 and 120),
  status public.service_request_status not null default 'open',
  first_responded_at timestamptz,
  closed_at timestamptz,
  closed_by_user_id uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_requests_provider_idx
  on public.service_requests (provider_id, status, created_at desc);

create index service_requests_requester_idx
  on public.service_requests (requester_user_id, created_at desc);

create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function private.set_updated_at();

alter table public.service_requests enable row level security;
alter table public.service_requests force row level security;

revoke all on table public.service_requests from anon, authenticated;
grant select on table public.service_requests to authenticated;
grant all on table public.service_requests to service_role;

-- Leitura: o solicitante OU o dono da ficha destinatária. Nada mais. Um
-- prestador não lê o pedido de outro porque a segunda disjunção testa a posse
-- da ficha; um terceiro membro não lê porque não é o solicitante.
create policy service_requests_select_parties
on public.service_requests
for select
to authenticated
using (
  requester_user_id = (select auth.uid())
  or exists (
    select 1
      from public.provider_profiles p
     where p.id = service_requests.provider_id
       and p.owner_user_id = (select auth.uid())
  )
);

-- Sem policy de insert/update/delete: toda escrita passa pelos RPCs abaixo, que
-- conferem autorização e mantêm a transição de situação na MESMA transação da
-- mensagem. É o que impede a aba "Novos" de mentir.

create function public.create_service_request(
  p_provider_id uuid,
  p_description text,
  p_when_text text default null,
  p_region text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_owner uuid;
  v_category public.provider_category;
  v_conversation uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_description is null
     or char_length(btrim(p_description)) < 10
     or char_length(btrim(p_description)) > 2000 then
    raise exception 'description must be 10..2000 characters' using errcode = '22023';
  end if;

  select p.owner_user_id, p.category
    into v_owner, v_category
    from public.provider_profiles p
   where p.id = p_provider_id
     and p.is_deleted = false;

  if not found then
    raise exception 'provider not found' using errcode = 'P0002';
  end if;

  if v_owner = v_me then
    raise exception 'cannot open a request against your own ficha' using errcode = '22023';
  end if;

  -- Mesma fronteira da ficha pública: pedido só nasce para ficha alcançável.
  if not private.can_see_provider(p_provider_id) then
    raise exception 'provider not reachable' using errcode = '42501';
  end if;

  -- open_conversation é idempotente por par: reabrir devolve a mesma conversa.
  v_conversation := public.open_conversation(v_owner, 'provider', p_provider_id);

  insert into public.service_requests (
    requester_user_id,
    provider_id,
    conversation_id,
    category,
    description,
    when_text,
    region
  ) values (
    v_me,
    p_provider_id,
    v_conversation,
    v_category,
    btrim(p_description),
    nullif(btrim(coalesce(p_when_text, '')), ''),
    nullif(btrim(coalesce(p_region, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_service_request(uuid, text, text, text) from public, anon;
grant execute on function public.create_service_request(uuid, text, text, text) to authenticated;

-- A primeira resposta do prestador move open -> in_conversation na MESMA
-- transação que grava a mensagem (D1). Se qualquer passo falhar, nada fica
-- pela metade: a contagem da aba não pode divergir da conversa.
create function public.respond_to_service_request(p_request_id uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_request public.service_requests;
  v_message uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_content is null or char_length(btrim(p_content)) = 0 or char_length(p_content) > 2000 then
    raise exception 'content must be 1..2000 characters' using errcode = '22023';
  end if;

  select * into v_request
    from public.service_requests
   where id = p_request_id
     for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  -- Autorização server-side: o dono da ficha destinatária, e só ele.
  if not exists (
    select 1
      from public.provider_profiles p
     where p.id = v_request.provider_id
       and p.owner_user_id = v_me
  ) then
    raise exception 'only the addressed provider responds' using errcode = '42501';
  end if;

  if v_request.status not in ('open', 'in_conversation') then
    raise exception 'request is not open' using errcode = '22023';
  end if;

  insert into public.dm_messages (conversation_id, sender_id, content)
  values (v_request.conversation_id, v_me, btrim(p_content))
  returning id into v_message;

  update public.service_requests
     set status = 'in_conversation',
         first_responded_at = coalesce(first_responded_at, now())
   where id = p_request_id;

  return v_message;
end;
$$;

revoke all on function public.respond_to_service_request(uuid, text) from public, anon;
grant execute on function public.respond_to_service_request(uuid, text) to authenticated;

-- Encerrar: qualquer das partes. Registrar QUEM encerrou e quando. `closed`
-- não significa serviço prestado nem pago (ADR D5).
create function public.close_service_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_request public.service_requests;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_request
    from public.service_requests
   where id = p_request_id
     for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  if not (
    v_request.requester_user_id = v_me
    or exists (
      select 1
        from public.provider_profiles p
       where p.id = v_request.provider_id
         and p.owner_user_id = v_me
    )
  ) then
    raise exception 'not a party of this request' using errcode = '42501';
  end if;

  if v_request.status not in ('open', 'in_conversation') then
    raise exception 'request already finished' using errcode = '22023';
  end if;

  update public.service_requests
     set status = 'closed',
         closed_at = now(),
         closed_by_user_id = v_me
   where id = p_request_id;
end;
$$;

revoke all on function public.close_service_request(uuid) from public, anon;
grant execute on function public.close_service_request(uuid) to authenticated;

-- Cancelar: só o solicitante, e só antes de encerrado (ADR D1).
create function public.cancel_service_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_request public.service_requests;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_request
    from public.service_requests
   where id = p_request_id
     for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  if v_request.requester_user_id <> v_me then
    raise exception 'only the requester cancels' using errcode = '42501';
  end if;

  if v_request.status not in ('open', 'in_conversation') then
    raise exception 'request already finished' using errcode = '22023';
  end if;

  update public.service_requests
     set status = 'cancelled',
         cancelled_at = now()
   where id = p_request_id;
end;
$$;

revoke all on function public.cancel_service_request(uuid) from public, anon;
grant execute on function public.cancel_service_request(uuid) to authenticated;
