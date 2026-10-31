-- Aviso de pedido de indicação: a resposta chega em minutos, não no dia seguinte.
--
-- Autoridade: docs/decisions/ADR-20260925-aviso-de-pedido.md (decisões do dono
-- em 25/09/2026). O que esta migration entrega:
--
--   1. "Pedidos de indicação" vira um tipo da preferência de notificação
--      (`indications`), no mesmo mecanismo por tipo × canal do
--      ADR-20260909-canais-de-notificacao. Sino ligado por padrão; e-mail
--      DESLIGADO por padrão — só o resumo diário, e só para quem ligar.
--   2. `indication_alert_deliveries`: registro de cada aviso por (pedido,
--      pessoa, tipo). É o que impede repetir e o que conta o limite do dia.
--   3. `private.dispatch_indication_alerts()`, a cada 5 minutos:
--        - pedido novo → avisa quem pode ver o pedido (a cidade, ou o grupo);
--        - pedido parado 24 h sem resposta → avisa de novo, uma vez;
--        - 3 dias depois da primeira resposta sem "Ajudou a resolver" → pergunta
--          a quem pediu se alguma resposta resolveu.
--      Limite: 3 avisos de pedido por pessoa em 24 h. O que passar vira UM aviso
--      do dia ("há pedidos esperando resposta"), não uma enxurrada.
--   4. `private.dispatch_indication_digest()`, uma vez por dia: e-mail com os
--      pedidos sem resposta da cidade, pela fila existente (`outbox`), só para
--      quem ligou o e-mail deste tipo.
--
-- O job é SECURITY DEFINER e privado (sem grant ao Data API): o pg_cron é o único
-- invocador. Quem recebe é decidido pelas mesmas regras que decidem quem LÊ o
-- pedido: membro ativo da cidade para pedido da cidade, membro aprovado do grupo
-- para pedido de grupo. Nenhuma leitura nova do pedido é aberta.

-- ── 1. o tipo na preferência ────────────────────────────────────────────────

alter table public.notification_preferences
  add column indications boolean not null default true;

alter table public.notification_channel_preferences
  drop constraint notification_channel_preferences_notification_type_check;

alter table public.notification_channel_preferences
  add constraint notification_channel_preferences_notification_type_check
  check (
    notification_type in (
      'comments', 'events', 'mentions', 'messages', 'product_news', 'indications'
    )
  );

-- O aviso no sino e o resumo por e-mail são o mesmo tipo de preferência.
create or replace function private.notification_type_key(p_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type = 'comment' then 'comments'
    when p_type in ('event_rsvp', 'event_change', 'event_reminder') then 'events'
    when p_type = 'direct_message' then 'messages'
    when p_type = 'product_news' then 'product_news'
    when p_type in ('recommendation_request', 'indications_digest') then 'indications'
    else null
  end;
$$;

create or replace function private.notification_type_enabled(p_type text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then true
    when private.notification_type_key(p_type) is null then true
    when private.notification_type_key(p_type) = 'comments' then coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'events' then coalesce(
      (select np.events from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'messages' then coalesce(
      (select np.messages from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'mentions' then coalesce(
      (select np.mentions from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'product_news' then coalesce(
      (select np.product_news from public.notification_preferences np where np.user_id = p_user_id),
      false
    )
    when private.notification_type_key(p_type) = 'indications' then coalesce(
      (select np.indications from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    else true
  end;
$$;

-- Sem linha na matriz, o canal segue o tipo — exceto o e-mail de indicações, que
-- nasce desligado: o resumo diário é escolha de quem quer recebê-lo.
create or replace function private.notification_channel_allows(
  p_type text,
  p_channel public.notification_channel,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then true
    when private.notification_type_key(p_type) is null then true
    else private.notification_type_enabled(p_type, p_user_id)
      and coalesce(
        (
          select ncp.enabled
          from public.notification_channel_preferences ncp
          where ncp.user_id = p_user_id
            and ncp.notification_type = private.notification_type_key(p_type)
            and ncp.channel = p_channel
        ),
        case
          when private.notification_type_key(p_type) = 'indications' and p_channel = 'email'
            then false
          else private.notification_type_enabled(p_type, p_user_id)
        end
      )
  end;
$$;

-- ── 2. o registro de cada aviso ─────────────────────────────────────────────

create table public.indication_alert_deliveries (
  request_id uuid not null references public.recommendation_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('new', 'unanswered', 'resolve_prompt')),
  -- Passou do limite do dia: registrado para não ser avaliado de novo, mas o
  -- aviso individual não saiu (saiu, no máximo, o aviso único do dia).
  suppressed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id, kind)
);

create index indication_alert_deliveries_user_idx
  on public.indication_alert_deliveries (user_id, created_at desc);

alter table public.indication_alert_deliveries enable row level security;
alter table public.indication_alert_deliveries force row level security;

-- Só o job escreve e lê. Nenhum cliente enxerga quem foi avisado de quê.
revoke all on table public.indication_alert_deliveries from public, anon, authenticated;

-- ── 3. parâmetros, em função para o pgTAP provar o número que vale ──────────

create function private.indication_alert_daily_cap()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 3::integer;
$$;

revoke all on function private.indication_alert_daily_cap() from public, anon, authenticated;

-- ── 4. quem recebe ──────────────────────────────────────────────────────────
--
-- As mesmas pessoas que podem ler o pedido, menos: quem pediu, quem está saindo
-- da plataforma, quem bloqueou ou foi bloqueado por quem pediu, e quem desligou
-- o tipo ou o canal do sino.
create function private.indication_recipients(p_request_id uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with req as (
    select r.id, r.author_id, r.locality_id, r.group_id
      from public.recommendation_requests r
     where r.id = p_request_id
       and not r.is_deleted
  ),
  audience as (
    select lm.user_id
      from req
      join public.locality_memberships lm
        on lm.locality_id = req.locality_id
       and lm.access = 'active'
     where req.locality_id is not null
    union
    select gm.user_id
      from req
      join public.group_memberships gm
        on gm.group_id = req.group_id
       and gm.status = 'approved'
     where req.group_id is not null
  )
  select a.user_id
    from audience a
    cross join req
   where a.user_id <> req.author_id
     and not private.account_deletion_requested(a.user_id)
     and not exists (
       select 1
         from public.dm_blocks b
        where (b.blocker_user_id = a.user_id and b.blocked_user_id = req.author_id)
           or (b.blocker_user_id = req.author_id and b.blocked_user_id = a.user_id)
     )
     and private.notification_channel_allows('recommendation_request', 'in_app', a.user_id);
$$;

revoke all on function private.indication_recipients(uuid) from public, anon, authenticated;

-- ── 5. um aviso, com o limite do dia ────────────────────────────────────────
--
-- Devolve true quando registrou a entrega (mesmo suprimida). `on conflict do
-- nothing` torna o job idempotente: rodar duas vezes não avisa duas vezes.
create function private.notify_indication(
  p_user_id uuid,
  p_request_id uuid,
  p_kind text,
  p_locality_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_suppressed boolean := false;
  v_inserted integer;
begin
  if p_kind in ('new', 'unanswered') then
    select count(*)
      into v_recent
      from public.indication_alert_deliveries d
     where d.user_id = p_user_id
       and d.kind in ('new', 'unanswered')
       and not d.suppressed
       and d.created_at > now() - interval '24 hours';
    v_suppressed := v_recent >= private.indication_alert_daily_cap();
  end if;

  insert into public.indication_alert_deliveries (request_id, user_id, kind, suppressed)
  values (p_request_id, p_user_id, p_kind, v_suppressed)
  on conflict (request_id, user_id, kind) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  if not v_suppressed then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (p_user_id, null, 'recommendation_request', p_kind, 'recommendation_request', p_request_id);
    return true;
  end if;

  -- Passou do limite: um aviso único por dia, apontando para a cidade.
  if p_locality_id is not null and not exists (
    select 1
      from public.notifications n
     where n.recipient_user_id = p_user_id
       and n.type = 'recommendation_request'
       and n.action = 'digest'
       and n.created_at > now() - interval '24 hours'
  ) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (p_user_id, null, 'recommendation_request', 'digest', 'locality', p_locality_id);
  end if;
  return true;
end;
$$;

revoke all on function private.notify_indication(uuid, uuid, text, uuid)
  from public, anon, authenticated;

-- ── 6. o job de avisos ──────────────────────────────────────────────────────
--
-- Janelas curtas de propósito: um pedido antigo nunca dispara aviso de "novo"
-- (nem na primeira execução depois do deploy), e o "parado 24 h" e o
-- "ajudou a resolver?" olham uma faixa estreita, que o job de 5 min cobre com
-- folga e o registro de entregas impede de repetir.
create function private.dispatch_indication_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_user uuid;
  v_count integer := 0;
begin
  -- Pedido novo.
  for v_request in
    select r.id, coalesce(r.locality_id, g.locality_id) as locality_id
      from public.recommendation_requests r
      left join public.groups g on g.id = r.group_id
     where not r.is_deleted
       and not r.is_resolved
       and r.created_at > now() - interval '2 hours'
  loop
    for v_user in select rr.user_id from private.indication_recipients(v_request.id) rr loop
      if private.notify_indication(v_user, v_request.id, 'new', v_request.locality_id) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  -- Parado 24 h sem nenhuma resposta.
  for v_request in
    select r.id, coalesce(r.locality_id, g.locality_id) as locality_id
      from public.recommendation_requests r
      left join public.groups g on g.id = r.group_id
     where not r.is_deleted
       and not r.is_resolved
       and r.created_at <= now() - interval '24 hours'
       and r.created_at > now() - interval '26 hours'
       and not exists (
         select 1 from public.recommendation_replies rep
          where rep.request_id = r.id and not rep.is_deleted
       )
  loop
    for v_user in select rr.user_id from private.indication_recipients(v_request.id) rr loop
      if private.notify_indication(v_user, v_request.id, 'unanswered', v_request.locality_id) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  -- "Alguma resposta ajudou a resolver?" para quem pediu: 3 dias depois da
  -- primeira resposta, se nada foi marcado. A faixa até 10 dias evita perguntar
  -- sobre pedidos antigos quando o job entra no ar.
  for v_request in
    select r.id, r.author_id
      from public.recommendation_requests r
     where not r.is_deleted
       and not r.is_resolved
       and (
         select min(rep.created_at)
           from public.recommendation_replies rep
          where rep.request_id = r.id and not rep.is_deleted
       ) between now() - interval '10 days' and now() - interval '3 days'
       and not private.account_deletion_requested(r.author_id)
       and private.notification_channel_allows('recommendation_request', 'in_app', r.author_id)
  loop
    if private.notify_indication(v_request.author_id, v_request.id, 'resolve_prompt', null) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.dispatch_indication_alerts() from public, anon, authenticated;

-- ── 7. o resumo diário por e-mail ───────────────────────────────────────────
--
-- Só para quem ligou o e-mail deste tipo (linha explícita na matriz). Lista os
-- pedidos da cidade das últimas 24 h ainda sem resposta, sem os da própria
-- pessoa. A fila (`outbox`) volta a checar a preferência na entrega — o
-- produtor não é o único guardião (ADR-20260909-canais-de-notificacao, D4).
create function private.dispatch_indication_digest()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select u.id as user_id,
           u.email,
           lm.locality_id,
           loc.city_name,
           count(r.id)::integer as open_count,
           (array_agg(r.title order by r.created_at desc))[1:5] as titles
      from public.notification_channel_preferences ncp
      join auth.users u on u.id = ncp.user_id
      join public.locality_memberships lm
        on lm.user_id = u.id and lm.access = 'active'
      join public.localities loc on loc.id = lm.locality_id
      join public.recommendation_requests r
        on r.locality_id = lm.locality_id
       and r.author_id <> u.id
       and not r.is_deleted
       and not r.is_resolved
       and r.created_at > now() - interval '24 hours'
       and not exists (
         select 1 from public.recommendation_replies rep
          where rep.request_id = r.id and not rep.is_deleted
       )
     where ncp.notification_type = 'indications'
       and ncp.channel = 'email'
       and ncp.enabled
       and u.email is not null
       and not private.account_deletion_requested(u.id)
       and private.notification_channel_allows('indications_digest', 'email', u.id)
       and not exists (
         select 1 from public.outbox o
          where o.type = 'indications_digest'
            and o.payload ->> 'user_id' = u.id::text
            and o.created_at > now() - interval '20 hours'
       )
     group by u.id, u.email, lm.locality_id, loc.city_name
  loop
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_row.email,
      'email',
      'indications_digest',
      jsonb_build_object(
        'user_id', v_row.user_id,
        'locality_id', v_row.locality_id,
        'city_name', v_row.city_name,
        'open_count', v_row.open_count,
        'titles', to_jsonb(v_row.titles)
      )
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.dispatch_indication_digest() from public, anon, authenticated;

-- ── 8. agendamento ──────────────────────────────────────────────────────────
-- Avisos junto do worker do outbox; o resumo às 11h UTC (8h em Brasília, 7h em
-- Manaus), antes do dia começar.
select cron.schedule(
  'bivaque-indication-alerts',
  '*/5 * * * *',
  'select private.dispatch_indication_alerts()'
);

select cron.schedule(
  'bivaque-indication-digest',
  '0 11 * * *',
  'select private.dispatch_indication_digest()'
);
