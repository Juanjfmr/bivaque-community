-- Feed da comunidade paginado DENTRO da função (25/09/2026).
--
-- Antes, `feed_community` montava a comunidade inteira — e, para cada
-- publicação, contava respostas, reações, a própria reação e o próprio
-- acompanhamento — e só então o PostgREST cortava a página pedida pela tela
-- (`.range()`). O custo no banco crescia com o tamanho da comunidade, não com a
-- página. O dono decidiu resolver antes que isso aparecesse ("Isso vai acabar
-- acontecendo, melhor mexer logo").
--
-- Agora a função recebe `p_limit` e `p_offset`:
--   1. escolhe as publicações da página só pelos ids (e, na ordem Relevantes,
--      pelo número de respostas — a única contagem que decide a ordem);
--   2. só DEPOIS conta respostas, reações e o estado da pessoa, e só para as
--      publicações da página.
-- Na ordem Recentes, a contagem de respostas nem é calculada para escolher a
-- página: o CASE só avalia a subconsulta no ramo Relevantes.
--
-- Compatível: sem `p_limit` (NULL = sem limite) e sem `p_offset` (0), a função
-- devolve exatamente o que devolvia — mesmas colunas, mesma ordem, mesma regra
-- de visibilidade. Quem chama com dois argumentos continua funcionando.
--
-- A assinatura muda (dois parâmetros novos), então a função antiga sai e a nova
-- entra com os mesmos grants: manter as duas criaria uma sobrecarga ambígua
-- para as chamadas de dois argumentos.

drop function public.feed_community(uuid, text);

create function public.feed_community(
  p_community_id uuid,
  p_order text default 'recent',
  p_limit integer default null,
  p_offset integer default 0
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
  ),
  -- 1. A página, escolhida só pelo que decide a ordem.
  page as (
    select
      p.id,
      p.created_at,
      case
        when p_order = 'recent' then 0
        else (
          select count(*)
          from public.comments c
          where c.post_id = p.id and c.is_deleted = false
        )
      end as rank_count
    from public.posts p
    where exists (select 1 from am_member)
      and p.is_deleted = false
      and (
        p.community_id = p_community_id
        or p.group_id in (select vg.id from visible_groups vg)
        or (
          p.community_id is null
          and p.group_id is null
          and exists (
            select 1 from community_locality cl
            where cl.locality_id = p.locality_id
          )
        )
      )
    order by rank_count desc, p.created_at desc, p.id desc
    limit p_limit
    offset greatest(coalesce(p_offset, 0), 0)
  )
  -- 2. As contagens e o estado da pessoa, só para a página.
  select
    p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from page
  join public.posts p on p.id = page.id
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
  order by page.rank_count desc, page.created_at desc, page.id desc;
$$;

revoke all on function public.feed_community(uuid, text, integer, integer) from public;
revoke all on function public.feed_community(uuid, text, integer, integer) from anon;
grant execute on function public.feed_community(uuid, text, integer, integer) to authenticated;
