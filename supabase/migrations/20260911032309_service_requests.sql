-- RECON-022 — pedido de serviço e a conversa de contexto.
--
-- Executa o ADR-20260909-pedidos-e-conversa-contextual (aprovado, R3):
--   D1 — pedido é um OBJETO com estado (`open → in_conversation → closed`,
--        mais `cancelled`); a transição por resposta é do RECON-023.
--   D2 — a conversa tem contexto imutável e a abertura é idempotente. O schema
--        já carrega o contexto em `dm_conversations` (context_type/context_id)
--        com `unique (participant_a, participant_b)`; para o canal
--        membro → prestador isso dá exatamente UMA conversa por par, com o
--        contexto gravado na criação e sem policy de update. O pedido referencia
--        essa conversa em vez de abrir uma nova por pedido — a mesma garantia
--        que o ADR pede, sem reabrir o constraint aplicado em 20260802001500.
--   D4 — anexo em bucket PRIVADO, com leitura derivada do acesso ao pedido.
--   D5 — sem valor, sem pagamento, sem custódia, sem avaliação, sem selo, sem
--        prazo de resposta e sem compartilhamento automático de telefone.
--
-- Participantes NUNCA vêm do corpo da requisição: o RPC deriva o destinatário
-- do `provider_profiles` e exige `private.can_see_provider`. Sem policy de
-- insert/update/delete em `service_requests`, a escrita só passa pelo RPC.

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
  -- Desnormalizado de propósito: a policy de leitura do destinatário não pode
  -- depender de um join que a própria RLS de provider_profiles pode esconder.
  provider_user_id uuid not null references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 500),
  when_text text check (when_text is null or char_length(when_text) between 1 and 120),
  status public.service_request_status not null default 'open',
  conversation_id uuid references public.dm_conversations (id) on delete set null,
  -- Chave de idempotência do formulário: o reenvio do MESMO rascunho devolve o
  -- pedido existente em vez de criar outro. NULL permite vários pedidos reais.
  idempotency_key text check (
    idempotency_key is null or char_length(idempotency_key) between 1 and 120
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_requester_key_unique unique (requester_user_id, idempotency_key)
);

create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function private.set_updated_at();

create index service_requests_requester_idx
  on public.service_requests (requester_user_id, created_at desc);

create index service_requests_provider_user_idx
  on public.service_requests (provider_user_id, created_at desc);

create table public.service_request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  photo_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint service_request_photos_position_unique unique (request_id, position)
);

create index service_request_photos_request_idx
  on public.service_request_photos (request_id, position);

-- ── helper de leitura: quem participa do pedido ──────────────────────────────

create function private.can_read_service_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.service_requests r
     where r.id = p_request_id
       and (
         r.requester_user_id = (select auth.uid())
         or r.provider_user_id = (select auth.uid())
       )
  );
$$;

revoke all on function private.can_read_service_request(uuid) from public, anon;
grant execute on function private.can_read_service_request(uuid) to authenticated, service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.service_requests enable row level security;
alter table public.service_requests force row level security;
alter table public.service_request_photos enable row level security;
alter table public.service_request_photos force row level security;

revoke all on table public.service_requests from anon, authenticated;
revoke all on table public.service_request_photos from anon, authenticated;

-- Sem insert/update/delete para `authenticated`: a criação é do RPC. Um
-- terceiro não altera o pedido nem por chamada direta sem interface.
grant select on table public.service_requests to authenticated;
grant select, insert on table public.service_request_photos to authenticated;
grant all on table public.service_requests to service_role;
grant all on table public.service_request_photos to service_role;

-- Só o solicitante e o prestador destinatário leem. Terceiro não vê a linha —
-- inclusive por chamada direta, porque a RLS é a única porta.
create policy service_requests_select_participant
on public.service_requests
for select
to authenticated
using (
  requester_user_id = (select auth.uid())
  or provider_user_id = (select auth.uid())
);

create policy service_request_photos_select_participant
on public.service_request_photos
for select
to authenticated
using (private.can_read_service_request(request_id));

-- O anexo é escrito só pelo solicitante do próprio pedido.
create policy service_request_photos_insert_requester
on public.service_request_photos
for insert
to authenticated
with check (
  exists (
    select 1
      from public.service_requests r
     where r.id = request_id
       and r.requester_user_id = (select auth.uid())
  )
);

-- ── criação idempotente ──────────────────────────────────────────────────────

create function public.create_service_request(
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

  select pp.owner_user_id into v_provider_user
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

  -- A ordenação do par é do servidor (mesma lição de 20260825205847) e a
  -- conversa nasce com contexto fixo: `provider` + id da ficha.
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
    description,
    when_text,
    conversation_id,
    idempotency_key
  )
  values (
    v_me,
    p_provider_id,
    v_provider_user,
    btrim(p_description),
    nullif(btrim(coalesce(p_when_text, '')), ''),
    v_conv,
    v_key
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_service_request(uuid, text, text, text)
  from public, anon;
grant execute on function public.create_service_request(uuid, text, text, text)
  to authenticated;

-- ── storage privado do anexo ─────────────────────────────────────────────────
-- ADR de mídia (D1/D2/D3): bucket `public: false`, 10 MB, imagens aprovadas, e
-- a leitura repete a autorização do pedido pelo caminho `${request_id}/…`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-request-photos',
  'service-request-photos',
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

create policy service_request_photos_storage_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-request-photos'
  and owner = (select auth.uid())
  and exists (
    select 1
      from public.service_requests r
     where r.id::text = (storage.foldername(storage.objects.name))[1]
       and r.requester_user_id = (select auth.uid())
  )
);

create policy service_request_photos_storage_update_owner
on storage.objects
for update
to authenticated
using (
  bucket_id = 'service-request-photos'
  and owner = (select auth.uid())
)
with check (
  bucket_id = 'service-request-photos'
  and owner = (select auth.uid())
);

create policy service_request_photos_storage_select_participant
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-request-photos'
  and exists (
    select 1
      from public.service_requests r
     where r.id::text = (storage.foldername(storage.objects.name))[1]
       and private.can_read_service_request(r.id)
  )
);
