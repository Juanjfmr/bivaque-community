-- RUN-188 (LAN-PUSH, parte web): inscrição do aparelho e o envio pelo outbox.
--
-- ADR-20261107-push-no-aparelho, itens 1 a 3. A tabela guarda o destino do
-- provedor (endpoint do Web Push), as chaves públicas da inscrição, um rótulo
-- curto e a data do último envio aceito. O membro só alcança as próprias
-- linhas, pela rota do app; a inscrição nasce só pela função de registro
-- abaixo (nenhum INSERT direto de cliente), e não existe UPDATE de cliente.
-- O papel de serviço lê para enviar e apaga quando o provedor recusa o destino.
--
-- A notificação gravada (public.notifications) gera a linha do canal `push`
-- somente quando a preferência do membro liga esse canal e não há bloqueio
-- entre os dois membros. O limite de lote e a reserva continuam os do outbox.

-- ── 1. a tabela ─────────────────────────────────────────────────────────────

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('web', 'android', 'ios')),
  destination text not null check (char_length(destination) between 1 and 1024),
  key_p256dh text check (key_p256dh is null or char_length(key_p256dh) between 1 and 255),
  key_auth text check (key_auth is null or char_length(key_auth) between 1 and 255),
  label text check (label is null or char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  -- Um destino é único por kind: reinscrever o mesmo aparelho troca o dono e
  -- renova a data, nunca duplica a linha.
  constraint push_subscriptions_kind_destination_key unique (kind, destination),
  -- A inscrição web precisa das duas chaves públicas; a nativa não usa chaves.
  constraint push_subscriptions_web_keys check (
    kind <> 'web' or (key_p256dh is not null and key_auth is not null)
  )
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;

revoke all on table public.push_subscriptions from anon, authenticated;
-- Sem INSERT para authenticated: o Data API não é caminho de escrita. A
-- inscrição nasce pela função register_push_subscription, chamada pela rota.
grant select, delete on table public.push_subscriptions to authenticated;
-- O envio lê pelo papel de serviço e grava `last_success_at`; apagar é a
-- resposta ao 404/410 do provedor.
grant select, update, delete on table public.push_subscriptions to service_role;

create policy push_subscriptions_select_own
on public.push_subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own
on public.push_subscriptions
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ── 2. o registro é uma função; transferir destino exige as chaves ─────────
-- Ninguém insere direto: sem INSERT concedido a authenticated, o Data API
-- não é caminho de escrita. Nesta fase a função só aceita Web Push: kind
-- fechado em 'web', destino começando com https:// e as duas chaves
-- presentes e não vazias — a chamada direta pela Data API não contorna a
-- validação da rota; entrada inválida levanta 22023 com mensagem fixa, sem
-- ecoar o que foi enviado. O kind nativo ganha caminho próprio no lote
-- nativo (ADR-20261118). A rota chama a função abaixo, que apaga a linha
-- antiga do mesmo destino apenas quando é do próprio dono (renovação) ou
-- quando as chaves p256dh/auth enviadas são iguais às da inscrição
-- existente — o mesmo navegador em outra conta. A comparação é `=`: chave
-- nula guardada (linha nativa) nunca casa, então quem conhece o destino não
-- toma a linha alheia. Destino alheio com chaves diferentes não apaga
-- nada: a chave única (kind, destination) recusa o registro e a rota
-- devolve 409. O dono da linha nova é sempre o da sessão (auth.uid()).

create function public.register_push_subscription(
  p_kind text,
  p_destination text,
  p_key_p256dh text,
  p_key_auth text,
  p_label text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind is null
     or p_kind <> 'web'
     or p_destination is null
     or p_destination not like 'https://%'
     or p_key_p256dh is null
     or p_key_p256dh = ''
     or p_key_auth is null
     or p_key_auth = '' then
    raise exception 'invalid push subscription' using errcode = '22023';
  end if;

  delete from public.push_subscriptions
   where kind = p_kind
     and destination = p_destination
     and (
       user_id = auth.uid()
       or (
         key_p256dh = p_key_p256dh
         and key_auth = p_key_auth
       )
     );

  insert into public.push_subscriptions (user_id, kind, destination, key_p256dh, key_auth, label)
  values (auth.uid(), p_kind, p_destination, p_key_p256dh, p_key_auth, p_label);
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text, text) from public;
revoke all on function public.register_push_subscription(text, text, text, text, text) from anon;
grant execute on function public.register_push_subscription(text, text, text, text, text)
  to authenticated;

-- ── 3. a regra do canal push na entrega ─────────────────────────────────────
-- Diferente dos canais antigos, o push nasce desligado: sem uma linha
-- explícita `enabled = true` na matriz, não há envio. É a mesma leitura que o
-- app faz (`canalPadrao` em preferencias-do-app.ts). Tipo sem chave de
-- preferência não recebe push.

create function private.push_channel_enabled(p_type text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then false
    when private.notification_type_key(p_type) is null then false
    else private.notification_type_enabled(p_type, p_user_id)
      and exists (
        select 1
        from public.notification_channel_preferences ncp
        where ncp.user_id = p_user_id
          and ncp.notification_type = private.notification_type_key(p_type)
          and ncp.channel = 'push'
          and ncp.enabled
      )
  end;
$$;

revoke all on function private.push_channel_enabled(text, uuid) from public;

-- O preparo SQL e o despachante TypeScript leem a mesma função. O canal push
-- deixa de cair no tipo e passa a exigir a escolha explícita do canal.
create or replace function private.outbox_delivery_allowed(
  p_channel public.outbox_channel,
  p_recipient text,
  p_type text,
  p_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.notification_opt_outs o
    where o.channel = p_channel
      and o.recipient = p_recipient
  )
  and case
    when p_channel = 'email' then private.notification_channel_allows(
      p_type,
      'email',
      private.outbox_preference_user_id(p_channel, p_recipient, p_payload)
    )
    when p_channel = 'push' then private.push_channel_enabled(
      p_type,
      private.outbox_preference_user_id(p_channel, p_recipient, p_payload)
    )
    else private.notification_type_enabled(
      p_type,
      private.outbox_preference_user_id(p_channel, p_recipient, p_payload)
    )
  end;
$$;

revoke all on function private.outbox_delivery_allowed(public.outbox_channel, text, text, jsonb)
  from public;

-- ── 4. a notificação gravada vira linha de push ─────────────────────────────
-- O corpo leva só referências (tipo, ação, alvo). Nada de nome, foto ou trecho
-- de quem agiu: a frase exibida na tela bloqueada é fixa por tipo, montada no
-- adaptador. O bloqueio entre membros vale nos dois sentidos.

create function private.enqueue_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.actor_user_id is not null and exists (
    select 1
    from public.dm_blocks b
    where (b.blocker_user_id = new.recipient_user_id and b.blocked_user_id = new.actor_user_id)
       or (b.blocker_user_id = new.actor_user_id and b.blocked_user_id = new.recipient_user_id)
  ) then
    return new;
  end if;

  if private.push_channel_enabled(new.type::text, new.recipient_user_id) then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      new.recipient_user_id::text,
      'push',
      new.type::text,
      jsonb_build_object(
        'user_id', new.recipient_user_id,
        'action', new.action,
        'target_type', new.target_type,
        'target_id', new.target_id
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_push_for_notification() from public;

create trigger enqueue_push_for_notification_trigger
after insert on public.notifications
for each row
execute function private.enqueue_push_for_notification();
