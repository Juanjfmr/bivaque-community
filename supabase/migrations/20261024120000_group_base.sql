-- B1 do lote 5 — a base do grupo (ADR-20261023-comunidade-do-prototipo, §3).
--
-- Três coisas, na mesma migration:
--   1. `groups.rules` — as regras do grupo (o protótipo chama de "Regras do
--      grupo", ≤ 600 caracteres).
--   2. `group_memberships.notify_level` — o aviso por grupo: Tudo, Destaques
--      ou Nada (o `NOTIF` de presets.js), ligado a quem gera os avisos de
--      grupo nesta mesma migration.
--   3. `groups.pinned_post_id` — a publicação fixada, uma por grupo por
--      construção (uma coluna só), e ela continua sendo uma publicação comum:
--      autor, data, comentários e denúncia vêm do próprio post.
--
-- Correção da revisão independente (COM-003, 23/10/2026):
--   - Gerenciar é do admin (o `role === 'admin'` do protótipo = o dono no
--     banco): regras, fixar e desafixar exigem `is_group_owner`, na RPC e na
--     escrita direta. A policy de UPDATE de `groups` passa a exigir o dono,
--     então o moderador não alcança a linha pela Data API.
--   - `notify_level` é da própria pessoa: lido pelo RPC e escrito só pelo RPC.
--     O grant por coluna fecha a leitura de outros e a escrita por moderador.
--   - O nível de aviso passa a decidir os avisos de grupo (Nada: nenhum;
--     Destaques: publicação fixada e resposta ao que a pessoa escreveu;
--     Tudo: também publicações novas), como o `NOTIF` do protótipo.
--
-- A policy de UPDATE de `groups` já existia (`groups_update_owner`, 016): é
-- recriada apertada, sem mudar a contagem fixada pelo teste de estrutura
-- (rls-or-column-regression.test.sql, GUARD 10). Nenhuma policy nova em
-- `groups`/`group_memberships`.

-- ── Nível de aviso por participação ─────────────────────────────────────────

create type public.group_notify_level as enum ('all', 'highlights', 'none');

-- ── Aviso de grupo na caixa de notificações ─────────────────────────────────
-- Um tipo novo para conteúdo de grupo (publicação e fixada). A `action`
-- separa o que o produtor escreveu: `created` (publicação nova) e `pinned`
-- (publicação fixada).

alter type public.notification_type add value if not exists 'group_post';

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

-- ── O aviso por grupo é da própria pessoa ───────────────────────────────────
-- RLS garante linhas, não colunas: sem isto, o membro da localidade lê o
-- `notify_level` de qualquer participação de grupo aberto, e o moderador
-- alcança a coluna de outra pessoa pela escrita direta. O grant por coluna,
-- no padrão da SEC-002 (20261019205306), fecha os dois; quem lê e escreve o
-- próprio nível passa pelos RPCs, que rodam como definer.

revoke select on table public.group_memberships from anon, authenticated;

grant select (group_id, user_id, role, status, joined_at)
  on table public.group_memberships to authenticated;

revoke update on table public.group_memberships from anon, authenticated;

-- `role` e `status` continuam escrevíveis pelo moderador (a policy
-- `group_memberships_update_moderator` decide a linha); `notify_level`, não.
grant update (role, status) on table public.group_memberships to authenticated;

-- ── Gerenciar o grupo é do admin ────────────────────────────────────────────
-- O protótipo só oferece Gerenciar a `role === 'admin'` (groups/views.js,
-- editors.js `openManage`), que no banco é o dono. A policy de UPDATE passa a
-- exigir o dono, o mesmo limite das RPCs de regras e de fixação: sem isso, o
-- moderador muda `rules` e `pinned_post_id` pela Data API.

drop policy groups_update_owner on public.groups;

create policy groups_update_owner
on public.groups
for update
to authenticated
using (private.is_group_owner(id));

-- ── Integridade da publicação fixada ────────────────────────────────────────
-- A coluna é alcançável por quem tem UPDATE em `groups`, então o gatilho
-- confere a regra nos dois caminhos: a publicação fixada precisa existir, ser
-- do próprio grupo e não estar removida. Uma por grupo já é garantia da
-- coluna única.

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
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can change the rules';
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
-- comum, a RPC não aceita um user_id — sempre o do chamador — e a coluna está
-- fora do grant de update de `authenticated`.

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

-- ── Public RPC: ler o próprio aviso (a coluna está revogada) ────────────────
-- `notify_level` não é legível por SELECT para `authenticated`; a tela lê pelo
-- próprio RPC. Devolve só a linha de quem chama, e só a aprovada.

create function public.my_group_notify_level(p_group_id uuid)
returns public.group_notify_level
language sql
stable
security definer
set search_path = ''
as $$
  select gm.notify_level
  from public.group_memberships gm
  where gm.group_id = p_group_id
    and gm.user_id = (select auth.uid())
    and gm.status = 'approved';
$$;

revoke all on function public.my_group_notify_level(uuid) from public;
revoke all on function public.my_group_notify_level(uuid) from anon;
revoke all on function public.my_group_notify_level(uuid) from authenticated;

grant execute on function public.my_group_notify_level(uuid) to authenticated;

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
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can pin publications';
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
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can unpin publications';
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

-- ── O nível de aviso decide os avisos de grupo ──────────────────────────────
-- `NOTIF` de presets.js: Tudo recebe toda publicação do grupo; Destaques
-- recebe a publicação fixada e a resposta ao que a pessoa escreveu; Nada não
-- recebe aviso de grupo. O protótipo lista "eventos" em Destaques: o aviso de
-- evento é do evento (event_rsvp/event_change, próprios) e continua como está;
-- o nível do grupo governa o conteúdo do grupo.
--
-- Quem não é membro aprovado do grupo não recebe aviso de grupo — quem saiu
-- deixou de ver o conteúdo, e avisar seria devolver o que a saída tirou.

create function private.group_notify_allows(
  p_group_id uuid,
  p_kind text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when gm.notify_level = 'all' then true
        when gm.notify_level = 'highlights' then p_kind <> 'post'
        else false
      end
      from public.group_memberships gm
      where gm.group_id = p_group_id
        and gm.user_id = p_user_id
        and gm.status = 'approved'
    ),
    false
  );
$$;

revoke all on function private.group_notify_allows(uuid, text, uuid) from public;
revoke all on function private.group_notify_allows(uuid, text, uuid) from anon;
revoke all on function private.group_notify_allows(uuid, text, uuid) from authenticated;

-- Publicação nova em grupo → quem escolheu Tudo (o autor não se avisa).

create function private.notify_group_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.group_id is null or new.is_deleted then
    return new;
  end if;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select gm.user_id, new.user_id, 'group_post', 'created', 'group', new.group_id
  from public.group_memberships gm
  where gm.group_id = new.group_id
    and gm.status = 'approved'
    and gm.user_id <> new.user_id
    and private.group_notify_allows(new.group_id, 'post', gm.user_id)
    and private.notification_channel_allows('group_post', 'in_app', gm.user_id);

  return new;
end;
$$;

create trigger notify_group_post_trigger
after insert on public.posts
for each row
execute function private.notify_group_post();

-- Publicação fixada → Tudo e Destaques (quem fixa não se avisa).

create function private.notify_group_pin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  if new.pinned_post_id is null
     or new.pinned_post_id is not distinct from old.pinned_post_id then
    return new;
  end if;

  v_actor := (select auth.uid());

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select gm.user_id, v_actor, 'group_post', 'pinned', 'group', new.id
  from public.group_memberships gm
  where gm.group_id = new.id
    and gm.status = 'approved'
    and gm.user_id is distinct from v_actor
    and private.group_notify_allows(new.id, 'highlight', gm.user_id)
    and private.notification_channel_allows('group_post', 'in_app', gm.user_id);

  return new;
end;
$$;

create trigger notify_group_pin_trigger
after update of pinned_post_id on public.groups
for each row
execute function private.notify_group_pin();

-- Comentário em publicação de grupo → o autor da publicação, pelo nível dele.
-- Este é o produtor que já existia (private.notify_comment): a resposta ao que
-- a pessoa escreveu agora passa pelo aviso do grupo. Fora de grupo, nada muda.

create or replace function private.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_author uuid;
  v_post_group uuid;
begin
  select p.user_id, p.group_id into v_post_author, v_post_group
  from public.posts p
  where p.id = new.post_id;

  -- Actor must not self-notify.
  if v_post_author is null or v_post_author = new.user_id then
    return new;
  end if;

  if v_post_group is not null
     and not private.group_notify_allows(v_post_group, 'highlight', v_post_author) then
    return new;
  end if;

  if private.notification_channel_allows('comment', 'in_app', v_post_author) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_post_author, new.user_id, 'comment', 'created', 'post', new.post_id);
  end if;

  return new;
end;
$$;

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