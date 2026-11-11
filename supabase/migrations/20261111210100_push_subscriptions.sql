-- RUN-029 (LAN-PUSH, parte web): inscrição do aparelho e o envio pelo outbox.
--
-- ADR-20261107-push-no-aparelho, itens 1 a 3. A tabela guarda o destino do
-- provedor (endpoint do Web Push), as chaves públicas da inscrição, um rótulo
-- curto e a data do último envio aceito. O membro só alcança as próprias
-- linhas, pela rota do app; não existe UPDATE de cliente (a reinscrição do
-- mesmo destino troca de dono pela trigger abaixo). O papel de serviço lê para
-- enviar e apaga quando o provedor recusa o destino.
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
grant select, insert, delete on table public.push_subscriptions to authenticated;
-- O envio lê pelo papel de serviço e grava `last_success_at`; apagar é a
-- resposta ao 404/410 do provedor.
grant select, update, delete on table public.push_subscriptions to service_role;

create policy push_subscriptions_select_own
on public.push_subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own
on public.push_subscriptions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own
on public.push_subscriptions
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ── 2. reinscrever o mesmo destino troca o dono, sem UPDATE de cliente ──────
-- A rota insere com o `user_id` da sessão. A trigger apaga a linha antiga do
-- mesmo destino — do próprio dono (renova a data) ou de outro (troca o dono) —
-- antes de a nova entrar; o cliente nunca vê um UPDATE.

create function private.claim_push_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_subscriptions
  where kind = new.kind
    and destination = new.destination;

  return new;
end;
$$;

revoke all on function private.claim_push_subscription() from public;

create trigger claim_push_subscription_trigger
before insert on public.push_subscriptions
for each row
execute function private.claim_push_subscription();

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
