-- COM-005 (B2 do lote 5): o motivo do pedido de entrada e o convite
-- (ADR-20261023-comunidade-do-prototipo, §3 "Motivo no pedido de entrada" e
-- "Convite").
--
-- Três coisas, na mesma migration:
--   1. `group_join_reasons` — o motivo do pedido ao grupo Fechado, ≤ 300
--      caracteres. Tabela própria e não coluna em `group_memberships`: a
--      policy `group_memberships_select` libera a linha inteira a QUEM PODE
--      VER O ROSTER (qualquer membro da localidade, num grupo Aberto) e RLS é
--      por linha, não por coluna. Um texto que a tela promete mostrar só ao
--      autor e a quem aprova precisa de separação física — o mesmo motivo do
--      `community_join_reasons` (20260909014034).
--   2. `group_join_attempts` — as tentativas de pedido (no máximo 3 por
--      pessoa e por grupo em 30 dias). Recusar apaga a linha de participação,
--      então a contagem não pode morar nela: a tentativa sobrevive à recusa e
--      é o que segura o quarto pedido.
--   3. O apagamento do motivo: dentro da RPC que decide (aprovar) e pelo
--      `on delete cascade` da própria participação (recusar, seja o delete
--      direto do moderador ou qualquer RPC futura); mais o job pg_cron que
--      limpa o motivo de pedido sem decisão há mais de 30 dias.
--
-- A limpeza por 30 dias mora numa função `private` porque o `cron.schedule`
-- não aceita argumentos: a fn é o corpo do job (padrão de
-- 20260814174705_outbox_worker.sql).

-- ── 1. O motivo do pedido: tabela própria ───────────────────────────────────
-- O `on delete cascade` da chave composta é o "trigger de delete" declarativo:
-- qualquer caminho que apague a participação leva o motivo junto, sem depender
-- de o moderador lembrar de apagá-lo à mão. Aprovar mantém a linha (o status
-- vira `approved`), por isso a RPC de aprovação apaga o motivo explicitamente.

create table public.group_join_reasons (
  group_id uuid not null,
  user_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id),
  foreign key (group_id, user_id)
    references public.group_memberships (group_id, user_id) on delete cascade
);

alter table public.group_join_reasons enable row level security;
alter table public.group_join_reasons force row level security;

revoke all on table public.group_join_reasons from anon, authenticated;
grant select on table public.group_join_reasons to authenticated;
grant select, insert, update, delete on table public.group_join_reasons to service_role;

-- SELECT: o autor do pedido e quem aprova (dono e moderador). Ninguém mais —
-- nem o restante do roster, que enxerga a participação mas não a justificativa.
-- `private.is_group_moderator` é security definer, como toda função chamada de
-- dentro de uma policy (tests/scope/rls-structure.test.mjs).
create policy group_join_reasons_select_author_or_moderator
on public.group_join_reasons
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_group_moderator(group_id)
);

-- Sem policy de INSERT/UPDATE/DELETE para authenticated: toda escrita passa
-- pelos RPCs security definer (join_group grava, approve_group_member apaga).

-- ── 2. As tentativas: tabela própria, fechada ───────────────────────────────
-- Uma linha por tentativa aceita. O quarto pedido em 30 dias é recusado pela
-- RPC, não apaga nada e não entra na contagem — por isso o limite não usa
-- exceção depois de escrever (licão 11 do lote 4): a checagem vem antes.

create table public.group_join_attempts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index group_join_attempts_window_idx
  on public.group_join_attempts (group_id, user_id, attempted_at desc);

alter table public.group_join_attempts enable row level security;
alter table public.group_join_attempts force row level security;

-- RLS fechada e sem grant: nem `authenticated` nem `anon` leem ou escrevem a
-- tentativa. Quem conta é a função definer; a Data API não alcança a tabela.
revoke all on table public.group_join_attempts from anon, authenticated;

-- ── Consumo atômico da tentativa ────────────────────────────────────────────
-- A trava de aviso serializa (grupo, pessoa): sem ela dois pedidos simultâneos
-- contam dois e passam os dois na terceira vaga (licão 19 do lote 4). Devolve
-- `false` no quarto pedido, sem lançar — o RPC levanta o erro depois, e nenhuma
-- tentativa é perdida no rollback de uma exceção.

create function private.consume_group_join_attempt(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_group_id::text || ':' || p_user_id::text, 0)
  );

  select count(*)::integer
  into v_count
  from public.group_join_attempts
  where group_id = p_group_id
    and user_id = p_user_id
    and attempted_at >= now() - interval '30 days';

  if v_count >= 3 then
    return false;
  end if;

  insert into public.group_join_attempts (group_id, user_id)
  values (p_group_id, p_user_id);

  return true;
end;
$$;

revoke all on function private.consume_group_join_attempt(uuid, uuid) from public;
revoke all on function private.consume_group_join_attempt(uuid, uuid) from anon;
revoke all on function private.consume_group_join_attempt(uuid, uuid) from authenticated;

-- ── 3. join_group ganha o motivo e o limite ─────────────────────────────────
-- A assinatura de um argumento é derrubada em vez de sobrecarregada: duas
-- versões visíveis ao PostgREST criam ambiguidade na chamada sem o motivo
-- (mesmo padrão de `request_community_membership`). O argumento novo é
-- opcional, então as chamadas existentes (`{ p_group_id }`) continuam válidas.
--
-- Grupo Aberto: entra direto, como antes, sem motivo e sem tentativa.
-- Grupo Fechado: o pedido já existente não é um novo pedido (nada é reescrito,
-- nada é consumido); um pedido novo consome uma tentativa e grava o motivo.

drop function if exists public.join_group(uuid);

create function public.join_group(
  p_group_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locality_id uuid;
  v_visibility public.group_visibility;
  v_me uuid := (select auth.uid());
  v_reason text;
begin
  select locality_id, visibility
  into v_locality_id, v_visibility
  from public.groups
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'must be a locality member to join groups';
  end if;

  if v_visibility = 'public' then
    insert into public.group_memberships (group_id, user_id, role, status)
    values (p_group_id, v_me, 'member', 'approved')
    on conflict (group_id, user_id) do nothing;
    return;
  end if;

  -- Grupo Fechado. Um pedido já aberto (pendente) ou uma participação já
  -- aprovada não é um novo pedido: nada muda e nenhuma tentativa é consumida.
  if exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = v_me
  ) then
    return;
  end if;

  if not private.consume_group_join_attempt(p_group_id, v_me) then
    raise exception 'maximum 3 join requests per group in 30 days'
      using errcode = '54000';
  end if;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (p_group_id, v_me, 'member', 'pending');

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is not null then
    insert into public.group_join_reasons (group_id, user_id, reason)
    values (p_group_id, v_me, left(v_reason, 300));
  end if;
end;
$$;

revoke all on function public.join_group(uuid, text) from public;
revoke all on function public.join_group(uuid, text) from anon;
revoke all on function public.join_group(uuid, text) from authenticated;

grant execute on function public.join_group(uuid, text) to authenticated;

-- ── 4. Aprovar apaga o motivo ───────────────────────────────────────────────
-- O status vira `approved` e a linha de participação permanece, então o
-- `on delete cascade` não alcança o motivo: ele sai na mesma transação da
-- decisão. O recusar (delete da participação) já cai no cascade.

create or replace function public.approve_group_member(
  p_group_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can approve members';
  end if;

  update public.group_memberships
  set status = 'approved'
  where group_id = p_group_id
    and user_id = p_user_id
    and status = 'pending';

  if not found then
    raise exception 'pending membership not found for this user';
  end if;

  -- O motivo pertence ao pedido que acabou de ser decidido (ADR §3: apagado
  -- quando o pedido é decidido).
  delete from public.group_join_reasons
  where group_id = p_group_id
    and user_id = p_user_id;
end;
$$;

-- ── 5. O motivo de pedido sem decisão morre em 30 dias ──────────────────────
-- Apaga só o motivo de pedido ainda pendente e mais velho que 30 dias; o
-- aprovado perdeu o motivo na aprovação e o recusado, no cascade. Devolve
-- quantas linhas apagou, para o job poder ser lido no log.

create function private.purge_stale_group_join_reasons()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.group_join_reasons r
  using public.group_memberships gm
  where gm.group_id = r.group_id
    and gm.user_id = r.user_id
    and gm.status = 'pending'
    and r.created_at < now() - interval '30 days';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function private.purge_stale_group_join_reasons() from public;
revoke all on function private.purge_stale_group_join_reasons() from anon;
revoke all on function private.purge_stale_group_join_reasons() from authenticated;

-- O cron já está habilitado (20260814074813). Uma vez por dia, de madrugada.
select cron.schedule(
  'bivaque-group-join-reason-purge',
  '0 4 * * *',
  'select private.purge_stale_group_join_reasons()'
);