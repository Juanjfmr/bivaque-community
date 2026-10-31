-- Memória de indicações: o que a cidade já perguntou e respondeu fica achável.
--
-- Autoridade: docs/decisions/ADR-20260925-memoria-de-indicacoes.md (decisões do
-- dono na sessão de 25/09/2026). O que esta migration entrega:
--
--   1. Saúde deixa de exigir grupo. A trava `recommendation_health_needs_group`
--      (20260821000013) sai: o pedido de pediatra pode ir para a cidade. Sem
--      aviso no formulário, por decisão do dono ("retirar trava", "retire também
--      o aviso").
--   2. O pedido cabe numa frase. O detalhe (`body`) passa a ser opcional:
--      vazio é aceito, o teto de 2000 continua.
--   3. `list_indications`: a mesma porta lista a memória e responde à busca
--      antes de perguntar. Resolvidos primeiro — o que a D5 do
--      ADR-20260909-resposta-que-resolveu proibia e o dono liberou para busca
--      e ordenação. Continua proibido virar reputação, ranking de pessoa ou
--      selo de perfil.
--
-- A função é SECURITY INVOKER: quem chama só alcança os pedidos e as respostas
-- que as policies de SELECT já deixam ler (membro da cidade, membro do grupo,
-- autor). Nenhum acesso novo.

-- ── 1. saúde sem trava ──────────────────────────────────────────────────────

alter table public.recommendation_requests
  drop constraint recommendation_health_needs_group;

-- ── 2. detalhe opcional ─────────────────────────────────────────────────────

alter table public.recommendation_requests
  drop constraint recommendation_requests_body_check;

alter table public.recommendation_requests
  add constraint recommendation_requests_body_check
  check (char_length(body) <= 2000);

-- ── 3. busca em português, sem depender de acento ───────────────────────────
--
-- "medico" acha "médico". A configuração é a portuguesa com unaccent antes do
-- radical.

create extension if not exists unaccent with schema extensions;

create text search configuration public.bivaque_pt (copy = pg_catalog.portuguese);

alter text search configuration public.bivaque_pt
  alter mapping for hword, hword_part, word
  with extensions.unaccent, portuguese_stem;

-- O que a pessoa digita vira termos: sem acento, sem as palavras de pergunta
-- ("alguém indica", "procuro", "preciso de") e sem as palavras vazias do
-- português. "Alguém indica pediatra na zona sul?" vira pediatra, zona, sul.
create function private.indication_terms(p_text text)
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(distinct word), '{}')
  from (
    select word
    from regexp_split_to_table(
      lower(extensions.unaccent(coalesce(p_text, ''))),
      '[^a-z0-9]+'
    ) as word
    where char_length(word) >= 2
      and word <> all (array[
        'alguem', 'algum', 'alguma', 'indica', 'indicam', 'indicar', 'indique',
        'indicacao', 'indicacoes', 'recomenda', 'recomendam', 'recomendacao',
        'procuro', 'procurando', 'preciso', 'precisando', 'conhece', 'conhecem',
        'sabe', 'sabem', 'bom', 'boa', 'bons', 'boas', 'onde', 'quem', 'qual',
        'quais', 'tem', 'pra', 'pro', 'favor', 'aqui', 'gente', 'pessoal', 'algo'
      ])
      and numnode(to_tsquery('public.bivaque_pt', word)) > 0
    limit 8
  ) words;
$$;

revoke all on function private.indication_terms(text) from public, anon;
grant execute on function private.indication_terms(text) to authenticated;

-- ── 4. a porta única da memória ─────────────────────────────────────────────
--
-- p_query sem termos: lista por data, o mais novo primeiro (um pedido novo sem
-- resposta não afunda sob os antigos resolvidos). Com termos: cada pedido vale
-- pelo número de termos que aparecem nele ou nas respostas; empate vai para o
-- resolvido e depois para o mais novo. Termo que só aparece em resposta conta
-- quando cobre pelo menos metade da busca. p_category e p_resolved filtram nos dois
-- modos.

create function public.list_indications(
  p_locality_id uuid,
  p_query text default null,
  p_category public.recommendation_category default null,
  p_resolved boolean default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  body text,
  category public.recommendation_category,
  created_at timestamptz,
  is_resolved boolean,
  group_id uuid,
  group_name text,
  reply_count integer,
  resolved_reply_body text,
  matched_reply_body text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select t.term, to_tsquery('public.bivaque_pt', t.term || ':*') as tsq
    from unnest(private.indication_terms(p_query)) as t(term)
  ),
  candidates as (
    select r.*, g.name as group_name
    from public.recommendation_requests r
    left join public.groups g on g.id = r.group_id
    where (r.locality_id = p_locality_id or g.locality_id = p_locality_id)
      and (p_category is null or r.category = p_category)
      and (p_resolved is null or r.is_resolved = p_resolved)
  ),
  scored as (
    select
      c.*,
      (
        select count(*)::integer
        from terms t
        where to_tsvector('public.bivaque_pt', c.title || ' ' || c.body) @@ t.tsq
      ) as hits_question,
      (
        select count(*)::integer
        from terms t
        where to_tsvector('public.bivaque_pt', c.title || ' ' || c.body) @@ t.tsq
          or exists (
            select 1
            from public.recommendation_replies rep
            where rep.request_id = c.id
              and to_tsvector('public.bivaque_pt', rep.body) @@ t.tsq
          )
      ) as hits,
      (
        select rep.body
        from public.recommendation_replies rep
        where rep.request_id = c.id
          and exists (
            select 1 from terms t
            where to_tsvector('public.bivaque_pt', rep.body) @@ t.tsq
          )
        order by (rep.id = c.resolved_reply_id) desc, rep.created_at
        limit 1
      ) as matched_reply_body
    from candidates c
  )
  select
    s.id,
    s.title,
    s.body,
    s.category,
    s.created_at,
    s.is_resolved,
    s.group_id,
    s.group_name,
    (
      select count(*)::integer
      from public.recommendation_replies rep
      where rep.request_id = s.id
    ),
    (
      select rep.body
      from public.recommendation_replies rep
      where rep.id = s.resolved_reply_id
    ),
    s.matched_reply_body
  from scored s
  -- Entra quem tem termo na própria pergunta, ou quem casa pelo menos metade
  -- dos termos nas respostas: "fonoaudiólogo infantil" não traz a natação só
  -- porque uma resposta fala em "turma infantil".
  where not exists (select 1 from terms)
    or s.hits_question > 0
    or s.hits * 2 >= (select count(*) from terms)
  order by
    s.hits desc,
    (s.is_resolved and exists (select 1 from terms)) desc,
    s.created_at desc,
    s.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.list_indications(
  uuid, text, public.recommendation_category, boolean, integer, integer
) from public, anon;

grant execute on function public.list_indications(
  uuid, text, public.recommendation_category, boolean, integer, integer
) to authenticated;
