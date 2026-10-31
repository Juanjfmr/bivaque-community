-- post_follows: follow a post to keep it under "Acompanhando" in the community feed.
--
-- Prancha 01-web-inicio desenha as abas Recentes / Acompanhando no feed "Na
-- comunidade" e a acao "Acompanhar" no cartao de publicacao. O follow e do
-- membro sobre o post; o feed de acompanhados (feed_following) revalida a
-- MESMA matriz de visibilidade dos feeds existentes a cada leitura, entao
-- seguir nunca vira um vazamento: follow nao concede leitura, apenas filtra
-- o que a pessoa ja poderia ver. O "Acompanhar" do cartao e a coluna
-- my_follow que feed_posts / feed_community / feed_group passam a devolver.

-- ── post_follows table ────────────────────────────────────────────────────────

create table public.post_follows (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_follows_user_id_idx
  on public.post_follows (user_id);

-- Mesmo padrão de posts/comments/post_reactions
-- (20260818022411_set_user_id_defaults.sql): a UI cria o follow sem enviar
-- user_id e o default auth.uid() fecha o caminho de escrita — a policy já
-- exige user_id = auth.uid().
alter table public.post_follows
  alter column user_id set default auth.uid();

-- ── RLS enable + force ─────────────────────────────────────────────────────────

alter table public.post_follows enable row level security;
alter table public.post_follows force row level security;

-- ── minimal grants ─────────────────────────────────────────────────────────────

revoke all on table public.post_follows from anon, authenticated;

grant select, insert, delete on table public.post_follows to authenticated;

-- ── RLS policies ───────────────────────────────────────────────────────────────

-- SELECT: apenas as proprias linhas de follow.
create policy post_follows_select_own
on public.post_follows
for select
to authenticated
using (
  user_id = (select auth.uid())
);

-- INSERT: apenas o proprio follow. A visibilidade nao e validada aqui de
-- proposito: as leituras (feed_following e a coluna my_follow dos feeds)
-- revalidam a matriz de visibilidade, entao um follow sem direito de leitura
-- nao expoe nada — ocupa uma linha que o proprio dono pode apagar.
create policy post_follows_insert_own
on public.post_follows
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

-- DELETE: apenas as proprias linhas.
create policy post_follows_delete_own
on public.post_follows
for delete
to authenticated
using (
  user_id = (select auth.uid())
);

-- ── feed_community ganha my_follow (acao "Acompanhar" do cartao) ───────────────
-- Versao vigente de 20260821000000_community_feed_locality_reach.sql mais a
-- coluna my_follow; drop + create porque returns table muda de forma.

drop function if exists public.feed_community(uuid, text);

create function public.feed_community(
  p_community_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  community_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  my_follow boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with am_member as (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.community_id = p_community_id
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  ),
  community_locality as (
    select locality_id
    from public.communities
    where id = p_community_id
  )
  select
    p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join lateral (
    select true as has_followed from public.post_follows f
    where f.post_id = p.id and f.user_id = (select auth.uid()) limit 1
  ) my_f on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  where exists (select 1 from am_member)
    and p.is_deleted = false
    and (
      p.community_id = p_community_id
      or p.group_id in (select id from visible_groups)
      or (
        p.community_id is null
        and p.group_id is null
        and exists (
          select 1 from community_locality cl
          where cl.locality_id = p.locality_id
        )
      )
    )
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_community(uuid, text) from public;
revoke all on function public.feed_community(uuid, text) from anon;
revoke all on function public.feed_community(uuid, text) from authenticated;
grant execute on function public.feed_community(uuid, text) to authenticated;

-- ── feed_posts / feed_group ganham my_follow (consistencia do cartao) ─────────
-- Versoes vigentes de 20260817031237_belonging_multi_membership.sql mais a
-- coluna my_follow.

drop function if exists public.feed_posts(uuid, text);

create function public.feed_posts(
  p_locality_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  my_follow boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with am_member as (
    select 1
    from public.locality_memberships
    where user_id = (select auth.uid())
      and locality_id = p_locality_id
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.locality_id = p_locality_id
      and g.community_id is null
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join lateral (
    select true as has_followed from public.post_follows f
    where f.post_id = p.id and f.user_id = (select auth.uid()) limit 1
  ) my_f on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  where exists (select 1 from am_member)
    and p.locality_id = p_locality_id
    and p.is_deleted = false
    and p.community_id is null
    and (p.group_id is null or p.group_id in (select id from visible_groups))
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_posts(uuid, text) from public;
revoke all on function public.feed_posts(uuid, text) from anon;
revoke all on function public.feed_posts(uuid, text) from authenticated;
grant execute on function public.feed_posts(uuid, text) to authenticated;

drop function if exists public.feed_group(uuid, text);

create function public.feed_group(
  p_group_id uuid,
  p_order text default 'recent'
)
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  my_follow boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with can_see as (
    select 1
    from public.groups g
    where g.id = p_group_id
      and private.is_locality_member(g.locality_id)
      and (g.community_id is null or private.is_community_member(g.community_id))
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join lateral (
    select true as has_followed from public.post_follows f
    where f.post_id = p.id and f.user_id = (select auth.uid()) limit 1
  ) my_f on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  where exists (select 1 from can_see)
    and p.group_id = p_group_id
    and p.is_deleted = false
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;

revoke all on function public.feed_group(uuid, text) from public;
revoke all on function public.feed_group(uuid, text) from anon;
revoke all on function public.feed_group(uuid, text) from authenticated;
grant execute on function public.feed_group(uuid, text) to authenticated;

-- ── feed_following: posts acompanhados com a matriz de visibilidade ───────────
-- Mesmas colunas dos feeds (my_follow sempre true): o front usa o mesmo tipo.
-- Um post so entra se a pessoa ainda o veria por um dos canais atuais:
--   - post de cidade (sem comunidade e sem grupo): membro da localidade;
--   - post de comunidade: membro aprovado da comunidade;
--   - post de grupo: grupo publico ou membro aprovado do grupo.
-- Seguir um post que a pessoa deixou de ver (saiu da vila, grupo fechado)
-- nao ressuscita o post: ele desaparece do feed de acompanhados.

create function public.feed_following()
returns table (
  id uuid,
  locality_id uuid,
  user_id uuid,
  community_id uuid,
  group_id uuid,
  post_type public.post_type,
  content text,
  photo_path text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz,
  comment_count bigint,
  reaction_count bigint,
  my_reaction boolean,
  my_follow boolean,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), true, pr.display_name
  from public.post_follows f
  join public.posts p on p.id = f.post_id
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  where f.user_id = (select auth.uid())
    and p.is_deleted = false
    and (
      (
        p.community_id is null
        and p.group_id is null
        and private.is_locality_member(p.locality_id)
      )
      or (
        p.community_id is not null
        and p.group_id is null
        and exists (
          select 1
          from public.community_memberships cm
          where cm.community_id = p.community_id
            and cm.user_id = (select auth.uid())
            and cm.status = 'approved'
        )
      )
      or (
        p.group_id is not null
        and exists (
          select 1
          from public.groups g
          where g.id = p.group_id
            and (
              g.visibility = 'public'
              or exists (
                select 1
                from public.group_memberships gm
                where gm.group_id = g.id
                  and gm.user_id = (select auth.uid())
                  and gm.status = 'approved'
              )
            )
        )
      )
    )
  order by p.created_at desc;
$$;

revoke all on function public.feed_following() from public;
revoke all on function public.feed_following() from anon;
revoke all on function public.feed_following() from authenticated;
grant execute on function public.feed_following() to authenticated;
