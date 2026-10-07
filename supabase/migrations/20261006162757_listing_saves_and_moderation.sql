-- FIGMA-002 — Salvar anúncios e moderação de anúncio (ADR-20261006, approved).
--
-- Fecha o behaviour de dados/acesso/moderação que os ADRs de anúncios, mídia e
-- conversa não especificavam, e cobre as duas ações desenhadas nas pranchas
-- property-list e property-detail do Figma niuOHiHkyc9eGaIQBY9hq4: Salvar e
-- Reportar anúncio.
--
-- O valor 'listing' do enum veio na migration anterior (20261006162743), porque
-- `alter type ... add value` não pode ser usado na transação que o consome.
-- Aqui, e somente aqui, o alvo novo é integrado de forma coerente: policy de
-- insert, autorrelato, listagem da fila, trilha append-only e RPC de operador.
--
-- Decisões (texto do ADR):
--   * listing_saves é PRIVADO do membro: chave única (user, listing), sem cópia
--     de título/foto/status, sem contador e sem service_role na interface.
--   * Salvar exige anúncio active, não ocultado e de público alcançado. O dono
--     salva o próprio pelos MESMOS critérios — não há caminho paralelo.
--   * Ocultar é decisão de operador separada de status: marca, data e ator
--     próprios. Usar closed/paused confundiria decisão de moderação com ação do
--     anunciante e deixaria o dono remover a restrição.
--   * A trilha é append-only; só o RPC de operador insere, e o ator vem de
--     auth.uid() — nenhum argumento de identidade do cliente.
--   * Hide ligado à denúncia resolve a denúncia na MESMA transação. Uma denúncia
--     já resolvida não executa novo hide; repetir a mesma ação não fabrica
--     evento duplicado.
--   * O RPC é chamado com o JWT da sessão `authenticated`; `service_role` não o
--     executa. O `resolve_report` dos outros alvos (service_role) fica intacto.
--
-- Ordem dentro do arquivo: marca de moderação, guarda de escrita, salvos,
-- trilha, audiência/mídia, denúncia e RPCs.

-- ── 1. Marca de moderação, separada de status ─────────────────────────────────

alter table public.listings
  add column moderation_hidden boolean not null default false,
  add column moderation_hidden_at timestamptz,
  add column moderation_hidden_by uuid references auth.users (id) on delete set null;

-- A busca de listings sempre filtra por status; o índice parcial serve a
-- triagem da operação ("quantos anúncios ocultados existem"), não a lista do
-- membro — a RLS já remove os ocultados do alcance de terceiros.
create index listings_moderation_hidden_idx
  on public.listings (created_at desc)
  where moderation_hidden;

-- Member never writes the flag by INSERT/UPDATE. O ator do trigger é
-- auth.uid() (o JWT da sessão), e o RPC de moderação chama com o JWT do
-- operador — o único caminho aceito.
create function private.listings_moderation_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if NEW.moderation_hidden then
      raise exception 'listing moderation flag is operator-only'
        using errcode = '42501';
    end if;
    return NEW;
  end if;

  if NEW.moderation_hidden is distinct from OLD.moderation_hidden
     or NEW.moderation_hidden_at is distinct from OLD.moderation_hidden_at
     or NEW.moderation_hidden_by is distinct from OLD.moderation_hidden_by then
    if not private.is_operator() then
      raise exception 'listing moderation flag is operator-only'
        using errcode = '42501';
    end if;
  end if;
  return NEW;
end;
$$;

revoke all on function private.listings_moderation_guard() from public, anon, authenticated;

create trigger listings_moderation_guard
before insert or update on public.listings
for each row execute function private.listings_moderation_guard();

-- ── 2. Salvos privados ────────────────────────────────────────────────────────

create table public.listing_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- O índice do anúncio existe para o cascade e para a contagem interna de
-- idempotência; nenhum contador de popularidade é exposto ao produto.
create index listing_saves_listing_idx on public.listing_saves (listing_id);

alter table public.listing_saves enable row level security;
alter table public.listing_saves force row level security;

revoke all on table public.listing_saves from anon, authenticated;

grant select, insert, delete on table public.listing_saves to authenticated;

-- Leitura: só a própria relação. Mesmo depois de perder acesso ao anúncio, o
-- membro continua lendo o id e a data do seu save — e nada mais. Os joins
-- continuam sujeitos à RLS de listings/listing_media, então título, foto e
-- status de anúncio inacessível simplesmente não vêm.
create policy listing_saves_select_own
on public.listing_saves
for select
to authenticated
using (user_id = (select auth.uid()));

-- Salvar: anúncio active, não ocultado e alcançado. O dono entra pela mesma
-- regra comum, sem exceção. Insert repetido colide na PK e é idempotente.
create policy listing_saves_insert_own
on public.listing_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.listings l
    where l.id = listing_saves.listing_id
      and l.status = 'active'
      and not l.moderation_hidden
      and (
        l.owner_user_id = (select auth.uid())
        or private.listing_audience_reached(l.id)
      )
  )
);

-- Desfazer: sempre possível para o próprio save, com ou sem acesso ao anúncio.
create policy listing_saves_delete_own
on public.listing_saves
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ── 3. Trilha append-only de moderação ─────────────────────────────────────────

create type public.listing_moderation_action as enum ('hide', 'restore');

create table public.listing_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  action public.listing_moderation_action not null,
  -- `on delete restrict`: a trilha não pode ser apagada junto com o operador.
  operator_user_id uuid not null references auth.users (id) on delete restrict,
  report_id uuid references public.reports (id) on delete set null,
  note text check (note is null or char_length(note) > 0),
  created_at timestamptz not null default now()
);

create index listing_moderation_events_listing_idx
  on public.listing_moderation_events (listing_id, created_at);

alter table public.listing_moderation_events enable row level security;
alter table public.listing_moderation_events force row level security;

-- Sem INSERT/UPDATE/DELETE para ninguém: a escrita é exclusiva do RPC de
-- operador abaixo. `reports` é a outra trilha do schema e usa a mesma regra.
revoke all on table public.listing_moderation_events from anon, authenticated;

grant select on table public.listing_moderation_events to authenticated;

-- O dono lê a trilha do próprio anúncio (o aviso de ocultação é Duty D1 da tela
-- dele). A identidade do denunciante nunca entra aqui: o evento aponta para a
-- DENÚNCIA, e a identidade do denunciante é privada da infraestrutura de reports.
create policy listing_moderation_events_select_authorized
on public.listing_moderation_events
for select
to authenticated
using (
  private.is_operator()
  or exists (
    select 1 from public.listings l
    where l.id = listing_moderation_events.listing_id
      and l.owner_user_id = (select auth.uid())
  )
);

-- ── 4. Ocultação entra na régua de audiência e de mídia ───────────────────────
--
-- Um único lugar decide. `private.listing_audience_reached` é lido por
-- listings/property_details/listing_media/storage e por register_listing_interest
-- e pela nova validação de denúncia: acrescentar a cláusula aqui é o que faz
-- busca, salvos, detalhe, bytes da foto e interesse novos negarem o anúncio
-- ocultado, na mesma transação em que ele foi ocultado.
--
-- O DONO não passa por aqui: as policies e private.listing_media_readable têm
-- ramo próprio `owner_user_id = auth.uid()`, que sobrevive a status e ocultação
-- — é o que permite editar o anúncio com aviso e trocar as fotos.

create or replace function private.listing_audience_reached(p_listing_id uuid)
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
      and not l.moderation_hidden
      and (
        (l.locality_id is not null and exists (
          select 1 from public.locality_memberships lm
          where lm.locality_id = l.locality_id
            and lm.user_id = (select auth.uid())
        ))
        or (l.community_id is not null and exists (
          select 1 from public.community_memberships cm
          where cm.community_id = l.community_id
            and cm.user_id = (select auth.uid())
            and cm.status = 'approved'
        ))
      )
  );
$$;

-- ── 5. Denúncia de anúncio: alvo real, autorrelato e negativa uniforme ─────────

-- `listing` entra no bloqueio de autorrelato pelo MESMO mecanismo dos outros
-- alvos: o trigger é SECURITY DEFINER e não depende de RLS, então o bypass via
-- PostgREST direto do browser também é barrado.
create or replace function private.reports_block_self()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  case new.target_type
    when 'post' then
      select user_id into v_owner_id
      from public.posts where id = new.target_id;
    when 'comment' then
      select user_id into v_owner_id
      from public.comments where id = new.target_id;
    when 'group' then
      select owner_user_id into v_owner_id
      from public.groups where id = new.target_id;
    when 'message' then
      select sender_id into v_owner_id
      from public.dm_messages where id = new.target_id;
    when 'recommendation_request' then
      select author_id into v_owner_id
      from public.recommendation_requests where id = new.target_id;
    when 'recommendation_reply' then
      select author_id into v_owner_id
      from public.recommendation_replies where id = new.target_id;
    when 'listing' then
      select owner_user_id into v_owner_id
      from public.listings where id = new.target_id;
    else
      v_owner_id := null;
  end case;

  if v_owner_id is not null and v_owner_id = new.reporter_user_id then
    raise exception 'cannot report your own content';
  end if;

  return new;
end;
$$;

-- A policy genérica deixa de valer para `listing`. Sem isto, as duas policies
-- permissivas se somariam por OR e o requisito "active, não ocultado, dentro da
-- audiência do denunciante" viraria decorativo. Os outros cinco alvos mantêm
-- exatamente a mesma expressão — inclusive o caminho de prestador para `message`.
drop policy reports_insert_authenticated on public.reports;

create policy reports_insert_authenticated
on public.reports
for insert
to authenticated
with check (
  reporter_user_id = (select auth.uid())
  and target_type <> 'listing'
  and (
    exists (
      select 1 from public.locality_memberships
      where user_id = (select auth.uid())
    )
    or (
      private.is_provider_account((select auth.uid()))
      and target_type = 'message'
    )
  )
);

-- Denunciar exige sessão, anúncio active, não ocultado, de outro dono e dentro
-- da audiência do denunciante. UUID inexistente e alvo fora de audiência caem
-- na MESMA violação de policy — a negativa não confirma existência nem conteúdo.
-- O autorrelato é barrado pelo trigger acima, para o formulário poder dizer
-- "você não pode denunciar o seu próprio anúncio".
create policy reports_insert_listing
on public.reports
for insert
to authenticated
with check (
  reporter_user_id = (select auth.uid())
  and target_type = 'listing'
  and exists (
    select 1
    from public.listings l
    where l.id = reports.target_id
      and l.status = 'active'
      and not l.moderation_hidden
      and private.listing_audience_reached(l.id)
  )
);

-- A fila da operação precisa do trecho e do autor do alvo novo; sem este ramo o
-- cartão sairia com "não encontrado" para todo anúncio denimunciado.
create or replace function public.list_open_reports()
returns table (
  id uuid,
  target_type public.report_target_type,
  target_id uuid,
  reason text,
  created_at timestamptz,
  target_excerpt text,
  target_author_name text,
  open_reports_on_target integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.target_type,
    r.target_id,
    r.reason,
    r.created_at,
    left(t.excerpt, 240) as target_excerpt,
    pr.display_name as target_author_name,
    (
      select count(*)::int
      from public.reports dup
      where dup.target_type = r.target_type
        and dup.target_id = r.target_id
        and dup.status = 'open'
    ) as open_reports_on_target
  from public.reports r
  left join lateral (
    select
      case r.target_type
        when 'post' then
          (select p.content from public.posts p where p.id = r.target_id)
        when 'comment' then
          (select c.content from public.comments c where c.id = r.target_id)
        when 'group' then
          (select g.name from public.groups g where g.id = r.target_id)
        when 'message' then
          (select m.content from public.dm_messages m where m.id = r.target_id)
        when 'recommendation_request' then
          (select q.title from public.recommendation_requests q where q.id = r.target_id)
        when 'recommendation_reply' then
          (select y.body from public.recommendation_replies y where y.id = r.target_id)
        when 'listing' then
          (select l.title from public.listings l where l.id = r.target_id)
        else null
      end as excerpt,
      case r.target_type
        when 'post' then
          (select p.user_id from public.posts p where p.id = r.target_id)
        when 'comment' then
          (select c.user_id from public.comments c where c.id = r.target_id)
        when 'group' then
          (select g.owner_user_id from public.groups g where g.id = r.target_id)
        when 'message' then
          (select m.sender_id from public.dm_messages m where m.id = r.target_id)
        when 'recommendation_request' then
          (select q.author_id from public.recommendation_requests q where q.id = r.target_id)
        when 'recommendation_reply' then
          (select y.author_id from public.recommendation_replies y where y.id = r.target_id)
        when 'listing' then
          (select l.owner_user_id from public.listings l where l.id = r.target_id)
        else null
      end as author_id
  ) t on true
  left join public.profiles pr on pr.user_id = t.author_id
  where r.status = 'open'
  order by r.created_at asc;
$$;

-- ── 6. RPC de moderação: ator derivado do JWT da sessão ───────────────────────
--
-- `authenticated` e NADA mais: nem service_role, nem um p_operator_user_id
-- repassado pelo servidor. O ator vem de auth.uid() e o papel canônico é
-- conferido dentro da transação, com private.is_operator() — o mesmo allowlist
-- que public.is_current_user_operator lê.
--
-- Devolve true quando o estado mudou. Repetir a mesma ação devolve false e não
-- grava evento: é a idempotência que o ADR exige.

create function public.moderate_listing(
  p_listing_id uuid,
  p_action text,
  p_note text default null,
  p_report_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator uuid := (select auth.uid());
  v_listing public.listings;
  v_report public.reports;
  v_note text;
  v_changed boolean := false;
begin
  if v_operator is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_action not in ('hide', 'restore') then
    raise exception 'action must be hide or restore' using errcode = '22023';
  end if;

  if not private.is_operator() then
    raise exception 'only operators moderate listings' using errcode = '42501';
  end if;

  if p_report_id is not null and p_action <> 'hide' then
    raise exception 'report binding is only valid for hide' using errcode = '22023';
  end if;

  v_note := nullif(btrim(left(coalesce(p_note, ''), 1000)), '');

  -- O tipo real da denúncia é RE CONSULTADO aqui. O navegador não escolhe o
  -- ramo: uma denúncia de `post` passada por esta via é recusada, e uma já
  -- resolvida também — não há segundo hide.
  if p_report_id is not null then
    select * into v_report
      from public.reports
     where id = p_report_id
       for update;
    if not found then
      raise exception 'report not found' using errcode = 'P0002';
    end if;
    if v_report.target_type <> 'listing' or v_report.target_id <> p_listing_id then
      raise exception 'report does not target this listing' using errcode = 'P0002';
    end if;
    if v_report.status <> 'open' then
      raise exception 'report already resolved' using errcode = 'P0002';
    end if;
  end if;

  -- Lock do anúncio: hide, restore e a decisão do relatório leem e escrevem o
  -- mesmo estado, então não há janela em que duas operações se sobreponham.
  select * into v_listing
    from public.listings
   where id = p_listing_id
     for update;
  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  -- Hide NÃO mexe em status: a história de status continua sendo a história do
  -- anunciante (D2), e o dono não consegue remover a restrição pausando ou
  -- reativando o anúncio.
  if p_action = 'hide' and not v_listing.moderation_hidden then
    update public.listings
       set moderation_hidden = true,
           moderation_hidden_at = now(),
           moderation_hidden_by = v_operator
     where id = p_listing_id;
    v_changed := true;
  elsif p_action = 'restore' and v_listing.moderation_hidden then
    -- Restauração também não altera status nem público (D3).
    update public.listings
       set moderation_hidden = false,
           moderation_hidden_at = null,
           moderation_hidden_by = null
     where id = p_listing_id;
    v_changed := true;
  end if;

  if v_changed then
    insert into public.listing_moderation_events (
      listing_id, action, operator_user_id, report_id, note
    )
    values (
      p_listing_id, p_action::public.listing_moderation_action, v_operator, p_report_id, v_note
    );
  end if;

  -- A denúncia é resolvida na MESMA transação do hide, mesmo quando a ocultação
  -- já estava aplicada — o que é idempotente é o EVENTO, não a fila: sem isto
  -- uma segunda denúncia aberta sobre um anúncio já ocultado ficaria para
  -- sempre na triagem.
  if p_report_id is not null then
    update public.reports
       set status = 'resolved',
           operator_note = coalesce(v_note, 'hide'),
           resolved_by = v_operator,
           resolved_at = now()
     where id = p_report_id;

    insert into public.notifications (
      recipient_user_id, actor_user_id, type, action, target_type, target_id
    ) values (
      v_report.reporter_user_id, v_operator, 'report_resolved', 'resolved', 'report', p_report_id
    );
  end if;

  return v_changed;
end;
$$;

revoke all on function public.moderate_listing(uuid, text, text, uuid)
  from public, anon, service_role;
grant execute on function public.moderate_listing(uuid, text, text, uuid) to authenticated;