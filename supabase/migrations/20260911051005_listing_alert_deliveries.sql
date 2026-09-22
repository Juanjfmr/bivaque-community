-- RECON-028 — a ENTREGA do alerta de Moradia (prancha 65, painel 2).
--
-- A assinatura (`listing_alerts`) nasce no RECON-027. Aqui nasce o que prova a
-- promessa da tela: `listing_alert_deliveries` é o registro idempotente por par
-- (alerta, anúncio), e `private.dispatch_listing_alerts()` é o job que casa
-- anúncio novo e autorizado com os critérios, grava a entrega e enfileira o
-- aviso pelo outbox existente. A preferência de canal é do despachante do
-- outbox num ponto só (ADR-20260909-canais-de-notificacao, D4) — o produtor não
-- a consulta. Desligar `is_active` interrompe as próximas entregas; excluir a
-- assinatura remove também as entregas pendentes.
--
-- Decisão e limites: ADR-20260909-anuncios-mercado-e-moradia (D7) e §4.7 R55.

-- ---------------------------------------------------------------------------
-- Registro de entrega — deduplicação por (alerta, anúncio)
-- ---------------------------------------------------------------------------

create table public.listing_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.listing_alerts (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- A chave da promessa "uma entrega por imóvel novo": repetir o job não duplica.
  unique (alert_id, listing_id)
);

create index listing_alert_deliveries_alert_idx
  on public.listing_alert_deliveries (alert_id, created_at desc);

alter table public.listing_alert_deliveries enable row level security;
alter table public.listing_alert_deliveries force row level security;

-- Sem privilégio de escrita para o cliente: quem grava é o job. A leitura é do
-- dono do alerta, para que a tela possa mostrar situação e histórico.
revoke all on table public.listing_alert_deliveries from anon, authenticated;

grant select on table public.listing_alert_deliveries to authenticated;
grant all on table public.listing_alert_deliveries to service_role;

create policy listing_alert_deliveries_select_owner
on public.listing_alert_deliveries
for select
to authenticated
using (
  exists (
    select 1
      from public.listing_alerts a
     where a.id = alert_id
       and a.owner_user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Autorização explícita por dono (o job não tem JWT; `auth.uid()` é nulo lá)
-- ---------------------------------------------------------------------------

-- Espelha `private.can_read_listing`, mas com o usuário explícito. O job roda
-- como definer e não carrega sessão: sem esta variante, `auth.uid()` seria nulo e
-- nenhum anúncio seria considerado autorizado.
create function private.can_user_read_listing(
  p_user_id uuid,
  p_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.listings l
     where l.id = p_listing_id
       and (
         l.owner_user_id = p_user_id
         or (
           l.status = 'active'
           and (
             (
               l.community_id is not null
               and exists (
                 select 1
                   from public.community_memberships cm
                  where cm.community_id = l.community_id
                    and cm.user_id = p_user_id
                    and cm.status = 'approved'
               )
             )
             or (
               l.locality_id is not null
               and exists (
                 select 1
                   from public.locality_memberships lm
                  where lm.locality_id = l.locality_id
                    and lm.user_id = p_user_id
               )
             )
           )
         )
       )
  );
$$;

revoke all on function private.can_user_read_listing(uuid, uuid) from public, anon;
grant execute on function private.can_user_read_listing(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- O job de entrega
-- ---------------------------------------------------------------------------

-- Encontra apenas anúncio de Moradia ATIVO, publicado depois da assinatura
-- ("novo"), alcançável pelo dono do alerta ("autorizado") e que casa com os
-- critérios normalizados. Grava a entrega com `on conflict do nothing` (dedup
-- por par) e só então enfileira o aviso. Retorna quantas entregas criou.
create function private.dispatch_listing_alerts(p_limit integer default 200)
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
    with candidates as (
      select a.id as alert_id,
             a.owner_user_id,
             a.name as alert_name,
             l.id as listing_id,
             l.title as listing_title
        from public.listing_alerts a
        join public.listings l
          on l.kind = a.kind
         and l.status = 'active'
         and l.published_at is not null
         and l.published_at > a.created_at
        join public.property_details pd
          on pd.listing_id = l.id
       where a.is_active
         and (a.locality_id is null or l.locality_id = a.locality_id)
         and (a.neighborhood is null or lower(l.neighborhood) = lower(a.neighborhood))
         and (a.deal is null or pd.deal = a.deal)
         and (
           a.max_value_cents is null
           or coalesce(pd.rent_cents, pd.sale_price_cents) <= a.max_value_cents
         )
         and (a.min_bedrooms is null or pd.bedrooms >= a.min_bedrooms)
         and private.can_user_read_listing(a.owner_user_id, l.id)
         and not exists (
           select 1
             from public.listing_alert_deliveries d
            where d.alert_id = a.id
              and d.listing_id = l.id
         )
       order by l.published_at
       limit greatest(p_limit, 0)
    ),
    inserted as (
      insert into public.listing_alert_deliveries (alert_id, listing_id)
      select c.alert_id, c.listing_id
        from candidates c
      on conflict (alert_id, listing_id) do nothing
      returning alert_id, listing_id
    )
    select i.alert_id,
           i.listing_id,
           a.owner_user_id,
           a.name as alert_name,
           l.title as listing_title
      from inserted i
      join public.listing_alerts a on a.id = i.alert_id
      join public.listings l on l.id = i.listing_id
  loop
    -- Aviso in-app.
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_row.owner_user_id, null, 'listing_alert', 'created', 'listing', v_row.listing_id);

    -- Aviso por e-mail pelo outbox existente. O despachante é quem checa
    -- opt-out e preferência — o produtor não duplica essa decisão.
    insert into public.outbox (recipient, channel, type, payload)
    select u.email,
           'email',
           'listing_alert',
           jsonb_build_object(
             'user_id', v_row.owner_user_id,
             'alert_id', v_row.alert_id,
             'listing_id', v_row.listing_id,
             'alert_name', v_row.alert_name,
             'listing_title', v_row.listing_title
           )
      from auth.users u
     where u.id = v_row.owner_user_id
       and u.email is not null;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.dispatch_listing_alerts(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Excluir a assinatura remove as entregas pendentes
-- ---------------------------------------------------------------------------

-- As entregas já registradas caem pelo `on delete cascade` da FK. As que ainda
-- estão na fila do outbox precisam ser removidas explicitamente, senão o aviso
-- de um alerta que não existe mais seria entregue.
create function private.listing_alert_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.outbox o
   where o.type = 'listing_alert'
     and o.status = 'pending'
     and o.payload ->> 'alert_id' = old.id::text;

  return old;
end;
$$;

revoke all on function private.listing_alert_cleanup() from public, anon, authenticated;

create trigger listing_alerts_cleanup_deliveries
after delete on public.listing_alerts
for each row execute function private.listing_alert_cleanup();

-- ---------------------------------------------------------------------------
-- Agendamento
-- ---------------------------------------------------------------------------

-- O job é privado (sem grant ao Data API): não existe link de menu nem rota que
-- o exponha. O pg_cron é o único invocador em produção. Mesmo horário do worker
-- do outbox, que entrega o que este job enfileira.
select cron.schedule(
  'bivaque-listing-alerts',
  '*/5 * * * *',
  'select private.dispatch_listing_alerts()'
);
