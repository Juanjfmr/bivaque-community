-- B1 do lote 5 — a base do grupo (ADR-20261023-comunidade-do-prototipo, §3).
--
-- Três coisas, na mesma migration:
--   1. `groups.rules` — as regras do grupo (o protótipo chama de "Regras do
--      grupo", ≤ 600 caracteres).
--   2. `group_memberships.notify_level` — o aviso por grupo: Tudo, Destaques
--      ou Nada (o `NOTIF` de presets.js).
--   3. `groups.pinned_post_id` — a publicação fixada, uma por grupo por
--      construção (uma coluna só), e ela continua sendo uma publicação comum:
--      autor, data, comentários e denúncia vêm do próprio post.
--
-- Nenhuma policy nova em `groups`/`group_memberships`: o teste de estrutura
-- (rls-or-column-regression.test.sql, GUARD 10) fixa a contagem de policies
-- das duas tabelas. As escritas passam por funções security definer, como as
-- outras RPCs de grupo. A coluna nova e a regra que a lê (o gatilho que
-- confere se a publicação fixada é do próprio grupo) entram juntas.

-- ── Nível de aviso por participação ─────────────────────────────────────────

create type public.group_notify_level as enum ('all', 'highlights', 'none');

-- ── Colunas novas ───────────────────────────────────────────────────────────

alter table public.groups
  add column rules text
  check (rules is null or char_length(rules) between 1 and 600);

alter table public.groups
  add column pinned_post_id uuid references public.posts (id) on delete set null;

alter table public.group_memberships
  add column notify_level public.group_notify_level not null default 'highlights';

create index groups_pinned_post_idx
  on public.groups (pinned_post_id)
  where pinned_post_id is not null;

create index posts_group_created_idx
  on public.posts (group_id, created_at desc)
  where group_id is not null;

-- ── Integridade da publicação fixada ────────────────────────────────────────
-- `authenticated` tem UPDATE em `groups` (016, para o RLS recusar em silêncio),
-- então a coluna é alcançável sem passar pela RPC. O gatilho confere a regra
-- nos dois caminhos: a publicação fixada precisa existir, ser do próprio grupo
-- e não estar removida. Uma por grupo já é garantia da coluna única.

create function private.guard_group_pinned_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_group uuid;
  v_post_deleted boolean;
begin
  if new.pinned_post_id is null then
    return new;
  end if;

  select group_id, is_deleted
  into v_post_group, v_post_deleted
  from public.posts
  where id = new.pinned_post_id;

  if not found then
    raise exception 'pinned publication does not exist';
  end if;

  if v_post_group is distinct from new.id then
    raise exception 'pinned publication does not belong to this group';
  end if;

  if v_post_deleted then
    raise exception 'cannot pin a removed publication';
  end if;

  return new;
end;
$$;

create trigger guard_group_pinned_post
before insert or update of pinned_post_id on public.groups
for each row
execute function private.guard_group_pinned_post();

-- ── create_group ganha as regras ────────────────────────────────────────────
-- A assinatura anterior (4 argumentos) é substituída por uma com as regras no
-- fim. Um argumento novo é incompatível com `create or replace`; a função é
-- derrubada e recriada com os mesmos grants. Chamadas com menos argumentos
-- continuam válidas pelos defaults.

drop function if exists public.create_group(text, public.group_visibility, uuid, text);

create function public.create_group(
  p_name text,
  p_visibility public.group_visibility,
  p_locality_id uuid,
  p_description text default null,
  p_rules text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if not private.is_verified_locality_member(p_locality_id) then
    raise exception 'only verified locality members can create groups';
  end if;

  insert into public.groups (
    name, description, rules, visibility, locality_id, created_by, owner_user_id
  )
  values (
    p_name,
    p_description,
    nullif(btrim(coalesce(p_rules, '')), ''),
    p_visibility,
    p_locality_id,
    auth.uid(),
    auth.uid()
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, auth.uid(), 'owner', 'approved');

  return v_group_id;
end;
$$;

revoke all on function public.create_group(
  text, public.group_visibility, uuid, text, text
) from public;
revoke all on function public.create_group(
  text, public.group_visibility, uuid, text, text
) from anon;
revoke all on function public.create_group(
  text, public.group_visibility, uuid, text, text
) from authenticated;

grant execute on function public.create_group(
  text, public.group_visibility, uuid, text, text
) to authenticated;

-- ── Public RPC: regras do grupo (admin) ─────────────────────────────────────

create function public.set_group_rules(
  p_group_id uuid,
  p_rules text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can change the rules';
  end if;

  update public.groups
  set rules = nullif(btrim(coalesce(p_rules, '')), '')
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;

revoke all on function public.set_group_rules(uuid, text) from public;
revoke all on function public.set_group_rules(uuid, text) from anon;
revoke all on function public.set_group_rules(uuid, text) from authenticated;

grant execute on function public.set_group_rules(uuid, text) to authenticated;

-- ── Public RPC: aviso por grupo (a própria pessoa) ──────────────────────────
-- Só a própria linha: não há policy de update de participação para o membro
-- comum, e a RPC não aceita um user_id — sempre o do chamador.

create function public.set_group_notify_level(
  p_group_id uuid,
  p_level public.group_notify_level
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.group_memberships
  set notify_level = p_level
  where group_id = p_group_id
    and user_id = (select auth.uid())
    and status = 'approved';

  if not found then
    raise exception 'only approved members can set their notification level';
  end if;
end;
$$;

revoke all on function public.set_group_notify_level(uuid, public.group_notify_level)
  from public;
revoke all on function public.set_group_notify_level(uuid, public.group_notify_level)
  from anon;
revoke all on function public.set_group_notify_level(uuid, public.group_notify_level)
  from authenticated;

grant execute on function public.set_group_notify_level(uuid, public.group_notify_level)
  to authenticated;

-- ── Public RPC: fixar / desafixar publicação (admin) ────────────────────────

create function public.pin_group_post(
  p_group_id uuid,
  p_post_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can pin publications';
  end if;

  -- O gatilho guard_group_pinned_post confere que a publicação é do grupo e
  -- não está removida; a checagem aqui é para devolver erro claro antes dele.
  if not exists (
    select 1
    from public.posts
    where id = p_post_id
      and group_id = p_group_id
      and is_deleted = false
  ) then
    raise exception 'publication is not an active publication of this group';
  end if;

  update public.groups
  set pinned_post_id = p_post_id
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;

revoke all on function public.pin_group_post(uuid, uuid) from public;
revoke all on function public.pin_group_post(uuid, uuid) from anon;
revoke all on function public.pin_group_post(uuid, uuid) from authenticated;

grant execute on function public.pin_group_post(uuid, uuid) to authenticated;

create function public.unpin_group_post(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can unpin publications';
  end if;

  update public.groups
  set pinned_post_id = null
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;

revoke all on function public.unpin_group_post(uuid) from public;
revoke all on function public.unpin_group_post(uuid) from anon;
revoke all on function public.unpin_group_post(uuid) from authenticated;

grant execute on function public.unpin_group_post(uuid) to authenticated;

-- ── Public RPC: atividade recente dos grupos (Populares) ────────────────────
-- O seletor de "Populares" ordena por atividade recente — publicações dos
-- últimos 30 dias —, nunca pelo número de membros (contrato COM-003). O
-- contador passa por função definer porque a leitura crua de `posts` de um
-- grupo Fechado é negada a quem não é membro: aqui devolve-se só a contagem,
-- jamais o conteúdo, e só para membro da localidade.

create function public.list_group_activity(p_locality_id uuid)
returns table (
  group_id uuid,
  recent_post_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    coalesce(count(p.id), 0)::bigint
  from public.groups g
  left join public.posts p
    on p.group_id = g.id
   and p.is_deleted = false
   and p.created_at >= now() - interval '30 days'
  where g.locality_id = p_locality_id
    and g.is_deleted = false
    and private.is_locality_member(p_locality_id)
  group by g.id;
$$;

revoke all on function public.list_group_activity(uuid) from public;
revoke all on function public.list_group_activity(uuid) from anon;
revoke all on function public.list_group_activity(uuid) from authenticated;

grant execute on function public.list_group_activity(uuid) to authenticated;