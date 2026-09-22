-- FEED-PAGINACAO-CURSOR — rodada 1 (BANCO). `Recentes` vira fluxo paginado por
-- cursor; `Relevantes` vira lista limitada, sem rolagem infinita.
--
-- Autoridade: docs/decisions/ADR-20260922-feed-paginado-por-cursor.md (aprovado
-- pelo dono em 22/09/2026; R3 pela regra operável da RISK_MATRIX, que torna R3
-- qualquer mudança que toque supabase/migrations). Card: FEED-PAGINACAO-CURSOR.
--
-- Esta rodada é SÓ BANCO. Nenhum chamador de `apps/web` muda aqui: a rodada 2
-- carrega a primeira página no servidor e as seguintes sob demanda.
--
-- O problema medido nesta base: a Home de membro ativo rende 376 cartões e
-- `main.scrollHeight` de 131.155 px a 1440 (a medição do dono dizia 372 cartões e
-- 129.980 px; a diferença é resíduo de dados desta base, não divergência de
-- causa). `public.feed_community` (última definição em
-- 20260915013344_post_follows.sql:79) recebia só `p_community_id` e `p_order` —
-- sem limit, sem offset, sem cursor —, rodava quatro subconsultas laterais por
-- post ANTES de ordenar, e era chamada sem limite em três lugares.
--
-- O que esta migration entrega:
--   1. a nova assinatura com o cursor (par `created_at` + `id`) e `p_limit` com
--      default 20, com o teto de 50 imposto pelo SERVIDOR;
--   2. a assinatura antiga de dois argumentos APAGADA aqui dentro — no Postgres
--      acrescentar parâmetros cria SOBRECARGA, e a versão sem limite continuaria
--      existindo e chamável, deixando a correção decorativa;
--   3. as três origens do `OR` viram três ramos em `UNION ALL`, cada um com seu
--      cursor e seu limite pelo próprio índice, juntando e cortando no fim;
--   4. os três índices de `posts` ganham `id` para casar com o cursor, e nasce o
--      de `group_id`;
--   5. os números de `Relevantes` viram funções SQL em `private`, no padrão de
--      `private.guide_candidate_max_per_locality` (20260921134129:41-57);
--   6. a autorização é preservada INTEGRALMENTE: `security definer`,
--      `search_path` vazio, a checagem `am_member`, a visibilidade de grupo
--      privado e os MESMOS `revoke`/`grant`. Muda QUANTO se lê, nunca QUEM pode
--      ler.

-- ── 1. os parâmetros, como funções prováveis por pgTAP ───────────────────────
--
-- São funções SQL, e não constantes no corpo da consulta, para que o pgTAP prove
-- o número que está valendo pelo catálogo e mudar qualquer um deles seja UMA
-- LINHA.

-- Janela de `Relevantes`. O dono REJEITOU explicitamente os 30 dias propostos
-- pelo coordenador, com a razão registrada no ADR: é um feed local, e 30 dias num
-- feed de bairro é tempo demais. 7 dias é o parâmetro reversível do coordenador
-- dentro da forma que o dono escolheu.
create function private.feed_community_relevant_window()
returns interval
language sql
stable
set search_path = ''
as $$
  select interval '7 days';
$$;

-- Teto de posts de `Relevantes`. É lista limitada: sem rolagem infinita.
create function private.feed_community_relevant_limit()
returns integer
language sql
stable
set search_path = ''
as $$
  select 20::integer;
$$;

-- Piso de comentários. Sem ele, numa semana quieta `Relevantes` mostraria posts
-- sem nenhuma interação em ordem de data — que é `Recentes` com rótulo falso. O
-- nome prometeria curadoria e entregaria cronologia.
create function private.feed_community_relevant_min_comments()
returns bigint
language sql
stable
set search_path = ''
as $$
  select 1::bigint;
$$;

-- Teto de UMA página de `Recentes`. Sem teto, qualquer cliente pede 100 mil
-- linhas e recria exatamente o problema que esta migration resolve — por isso o
-- teto é do SERVIDOR, não do cliente.
create function private.feed_community_max_limit()
returns integer
language sql
stable
set search_path = ''
as $$
  select 50::integer;
$$;

revoke all on function private.feed_community_relevant_window() from public;
revoke all on function private.feed_community_relevant_limit() from public;
revoke all on function private.feed_community_relevant_min_comments() from public;
revoke all on function private.feed_community_max_limit() from public;

-- ── 2. o cursor é o PAR (created_at, id) ─────────────────────────────────────
--
-- Os ids de post são `gen_random_uuid()` — ALEATÓRIOS, sem ordem —, então o id
-- sozinho não pagina nada; e `created_at` sozinho não é total, porque dois posts
-- gravados no mesmo instante empatam. O par é a chave: `created_at` ordena e o
-- `id` desempata.
--
-- Os índices que existiam — posts (community_id, created_at desc) desde
-- 20260805214709:50 e posts (locality_id, created_at desc) desde
-- 20260802000900:50 — não têm `id`, e sem ele o desempate vira filtro depois da
-- leitura. Os três ganham `id`. Os dois antigos de duas colunas são prefixo
-- redundante dos novos e caem aqui: manter os dois lados deixaria o planejador
-- escolhendo entre um índice completo e um truncado para a mesma consulta.
--
-- `posts_single_scope` (20260805214709:33-35) garante
-- `num_nonnulls(group_id, community_id) <= 1`, e é ELA que torna os três ramos do
-- `UNION ALL` disjuntos: o ramo da comunidade exige `community_id` não nulo, o
-- dos grupos exige `group_id` não nulo, e o da cidade exige os dois nulos. Sem
-- essa garantia o `UNION ALL` duplicaria a linha que casa dois ramos e a página
-- repetiria post.

drop index if exists public.posts_community_idx;
drop index if exists public.posts_locality_created_idx;

create index posts_community_created_id_idx
  on public.posts (community_id, created_at desc, id desc);

create index posts_locality_created_id_idx
  on public.posts (locality_id, created_at desc, id desc);

create index posts_group_created_id_idx
  on public.posts (group_id, created_at desc, id desc);

-- ── 3. o sentinela da primeira página precisa ser inalcançável DE FATO ───────
--
-- A primeira página não tem cursor, e a alternativa a omitir o predicado seria um
-- `OR`, que impede o uso do índice e faz cada página ler o histórico inteiro
-- acima do cursor. A forma que mantém o intervalo de índice é comparar contra um
-- cursor sentinela no fim dos tempos. Para isso o sentinela tem de ser
-- inalcançável, e `created_at` aceita `'infinity'` — um membro poderia gravar um
-- post que nunca apareceria na primeira página. A restrição fecha isso: com
-- `created_at` sempre finito, `(created_at, id) < ('infinity', ...)` é verdadeiro
-- para toda linha e o id do sentinela nunca chega a ser comparado.

alter table public.posts
  add constraint posts_created_at_finite
  check (created_at <> 'infinity'::timestamptz);

-- ── 4. a assinatura antiga morre AQUI, na mesma migration ────────────────────
--
-- `drop` explícito da assinatura de dois argumentos antes do `create`: se ela
-- sobrevivesse como sobrecarga, `feed_community(uuid)` continuaria lendo a base
-- inteira e a correção não existiria de fato.

drop function if exists public.feed_community(uuid, text);

create function public.feed_community(
  p_community_id uuid,
  p_order text default 'recent',
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
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
language plpgsql
stable
security definer
set search_path = ''
as $$
-- As colunas de `returns table` são variáveis em plpgsql, e várias delas têm o
-- mesmo nome de coluna de `posts` (`id`, `user_id`, `community_id`, `group_id`,
-- `created_at`…). Sem esta diretiva, `select id from visible_groups` é ambíguo e
-- a função só falha na PRIMEIRA EXECUÇÃO, não no `create`. Com `use_column`,
-- nome ambíguo resolve para a COLUNA — que é sempre o que estas consultas
-- querem: nenhuma delas lê as variáveis de saída.
#variable_conflict use_column
declare
  -- Teto do SERVIDOR, não do cliente: acima de private.feed_community_max_limit()
  -- o pedido é cortado; abaixo de 1 ele sobe para 1. Zero ou negativo não vira
  -- página vazia silenciosa — o cliente que pediu "nada" enganou-se, e devolver o
  -- feed vazio esconderia o engano.
  v_page_size integer := least(
    greatest(coalesce(p_limit, 20), 1),
    private.feed_community_max_limit()
  );
  -- Cursor efetivo. Sem cursor (primeira página) o par vira o fim dos tempos, que
  -- é inalcançável por posts_created_at_finite.
  v_cursor_at timestamptz := coalesce(p_before_created_at, 'infinity'::timestamptz);
  v_cursor_id uuid := coalesce(
    p_before_id,
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
  );
begin
  -- O par anda junto. Meio cursor não é primeira página nem página seguinte: sem
  -- esta recusa, `p_before_id` nulo devolveria a primeira página outra vez e a
  -- rolagem travaria repetindo cartões em silêncio.
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception
      'cursor incompleto: p_before_created_at e p_before_id andam juntos';
  end if;

  -- `Recentes` é o único pedido cronológico; qualquer outro valor mantém a
  -- semântica anterior (`case when p_order = 'recent'`), que tratava todo o resto
  -- como relevância.
  if p_order = 'recent' then
    -- ── RECENTES ─────────────────────────────────────────────────────────────
    -- Cada ramo corta pelo PRÓPRIO índice (cursor + limite), os três juntam e o
    -- corte final escolhe a página. As quatro laterais rodam DEPOIS do corte,
    -- sobre os escolhidos: é isso que faz a página custar a página, e não o
    -- histórico.
    return query
      with am_member as (
        select 1
        from public.community_memberships cm
        where cm.community_id = p_community_id
          and cm.user_id = (select auth.uid())
          and cm.status = 'approved'
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
        select c.locality_id
        from public.communities c
        where c.id = p_community_id
      ),
      page as (
        select chosen.id, chosen.created_at
        from (
          (
            select p.id, p.created_at
            from public.posts p
            where exists (select 1 from am_member)
              and p.is_deleted = false
              and p.community_id = p_community_id
              and (p.created_at, p.id) < (v_cursor_at, v_cursor_id)
            order by p.created_at desc, p.id desc
            limit v_page_size
          )
          union all
          (
            select p.id, p.created_at
            from public.posts p
            where exists (select 1 from am_member)
              and p.is_deleted = false
              and p.group_id in (select vg.id from visible_groups vg)
              and (p.created_at, p.id) < (v_cursor_at, v_cursor_id)
            order by p.created_at desc, p.id desc
            limit v_page_size
          )
          union all
          (
            select p.id, p.created_at
            from public.posts p
            where exists (select 1 from am_member)
              and p.is_deleted = false
              and p.community_id is null
              and p.group_id is null
              and (p.created_at, p.id) < (v_cursor_at, v_cursor_id)
              and exists (
                select 1
                from community_locality cl
                where cl.locality_id = p.locality_id
              )
            order by p.created_at desc, p.id desc
            limit v_page_size
          )
        ) chosen
        order by chosen.created_at desc, chosen.id desc
        limit v_page_size
      )
      select
        p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
        p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
        coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
        coalesce(my_r.has_reacted, false),
        coalesce(my_f.has_followed, false),
        pr.display_name
      from page g
      join public.posts p on p.id = g.id
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
      order by g.created_at desc, g.id desc;
    return;
  end if;

  -- ── RELEVANTES ─────────────────────────────────────────────────────────────
  -- A contagem de comentários é o CRITÉRIO DE ORDEM, então aqui ela não pode
  -- rodar depois do corte: roda sobre a janela de 7 dias, que já é pequena por
  -- construção. Os três ramos continuam sendo três (mesma visibilidade, mesmo
  -- índice), e a contagem entra sobre a janela inteira — cortar por ramo antes de
  -- contar faria a ordem depender do tamanho da página.
  --
  -- ATENÇÃO: os três ramos abaixo são os MESMOS da página de Recentes, de
  -- propósito, e mudar a visibilidade de um exige mudar a do outro. O pgTAP trava
  -- essa paridade: um post que aparece em Recentes dentro da janela, com pelo
  -- menos um comentário, tem de aparecer em Relevantes.
  return query
    with am_member as (
      select 1
      from public.community_memberships cm
      where cm.community_id = p_community_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'approved'
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
      select c.locality_id
      from public.communities c
      where c.id = p_community_id
    ),
    window_start as (
      select now() - private.feed_community_relevant_window() as at
    ),
    in_window as (
      (
        select p.id, p.created_at
        from public.posts p
        where exists (select 1 from am_member)
          and p.is_deleted = false
          and p.community_id = p_community_id
          and p.created_at >= (select at from window_start)
      )
      union all
      (
        select p.id, p.created_at
        from public.posts p
        where exists (select 1 from am_member)
          and p.is_deleted = false
          and p.group_id in (select vg.id from visible_groups vg)
          and p.created_at >= (select at from window_start)
      )
      union all
      (
        select p.id, p.created_at
        from public.posts p
        where exists (select 1 from am_member)
          and p.is_deleted = false
          and p.community_id is null
          and p.group_id is null
          and p.created_at >= (select at from window_start)
          and exists (
            select 1
            from community_locality cl
            where cl.locality_id = p.locality_id
          )
      )
    ),
    scored as (
      select w.id, w.created_at, coalesce(c_counts.cnt, 0) as comment_count
      from in_window w
      left join lateral (
        select count(*) as cnt from public.comments c
        where c.post_id = w.id and c.is_deleted = false
      ) c_counts on true
    ),
    chosen as (
      select s.id, s.created_at, s.comment_count
      from scored s
      where s.comment_count >= private.feed_community_relevant_min_comments()
      order by s.comment_count desc, s.created_at desc, s.id desc
      limit least(v_page_size, private.feed_community_relevant_limit())
    )
    select
      p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
      p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
      g.comment_count, coalesce(r_counts.cnt, 0),
      coalesce(my_r.has_reacted, false),
      coalesce(my_f.has_followed, false),
      pr.display_name
    from chosen g
    join public.posts p on p.id = g.id
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
    order by g.comment_count desc, g.created_at desc, g.id desc;
end;
$$;

revoke all on function public.feed_community(uuid, text, timestamptz, uuid, integer) from public;
revoke all on function public.feed_community(uuid, text, timestamptz, uuid, integer) from anon;
revoke all on function public.feed_community(uuid, text, timestamptz, uuid, integer) from authenticated;
grant execute on function public.feed_community(uuid, text, timestamptz, uuid, integer) to authenticated;