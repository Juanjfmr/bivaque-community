-- O feed da cidade (lote 5, tarefa N2, ADR-20261023-comunidade-do-prototipo).
--
-- O feed que a tela mostrava em /community lia a VILA (feed_community) ou a
-- localidade inteira, grupos inclusive (feed_posts). O protótipo coloca o feed
-- da cidade no Início, e a regra de leitura que o dono fixou é:
--
--   publicações da cidade da pessoa, SEM grupo e SEM vila
--   (`group_id is null and community_id is null`)
--
-- A coluna `community_id` continua existindo (vila não existe nesta versão do
-- produto, mas as tabelas ficam até um ADR de remoção): por isso ela é
-- excluída EXPLICITAMENTE aqui, na mesma migration que cria a leitura — não
-- "no futuro". Sem essa exclusão, a publicação de vila entra no feed da
-- cidade. O pgTAP `supabase/tests/feed-cidade.sql` prova o negativo.
--
-- Paginada DENTRO da função, como `feed_community` (20260925213256): escolhe a
-- página só pelo que decide a ordem (na ordem Relevantes, o número de
-- respostas) e só DEPOIS conta respostas, reações e o estado da pessoa, e só
-- para as publicações da página. Sem `p_limit` (NULL = sem limite) e sem
-- `p_offset` (0), devolve o feed inteiro, como as outras leituras.
--
-- `my_reaction` e `my_follow` saem como nos feeds existentes: o cartão do feed
-- (feed-post-card) usa os dois.

create index posts_city_feed_idx
  on public.posts (locality_id, created_at desc, id desc)
  where group_id is null
    and community_id is null
    and is_deleted = false;

create function public.feed_locality(
  p_locality_id uuid,
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
  with
  -- A única porta de entrada: quem não é membro da localidade não lê nada,
  -- nem na primeira nem em nenhuma página seguinte.
  am_member as (
    select 1
    where private.is_locality_member(p_locality_id)
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
      and p.locality_id = p_locality_id
      and p.is_deleted = false
      -- A regra da cidade: fora grupo, fora vila.
      and p.group_id is null
      and p.community_id is null
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

revoke all on function public.feed_locality(uuid, text, integer, integer) from public;
revoke all on function public.feed_locality(uuid, text, integer, integer) from anon;
grant execute on function public.feed_locality(uuid, text, integer, integer) to authenticated;