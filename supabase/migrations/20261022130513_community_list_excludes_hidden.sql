-- Ocultar para mim, no caminho de leitura (ADR-20261022, secao 2.3).
--
-- A lista da Comunidade é `public.list_indications` (20260926004501), a mesma
-- porta da memória de indicações. Ela passa a excluir o que QUEM LÊ ocultou —
-- e só isso. O que outra pessoa ocultou continua na lista, e o que a moderação
-- marcou como `is_deleted` continua fora por policy, como antes.
--
-- "O link direto continua abrindo a pergunta" é consequência do desenho: o
-- filtro vive na função de LISTA. O SELECT direto em
-- `recommendation_requests` (a rota /indicacoes/[id]) não muda.
--
-- `list_hidden_questions` é a leitura da tela "Ocultados": a pergunta, a data
-- da ocultação e nada mais. Também é SECURITY INVOKER — quem chama só alcança
-- as próprias linhas de `hidden_questions` e as perguntas que já podia ler.

create or replace function public.list_indications(
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
      -- Ocultar é pessoal: some só da lista de quem ocultou.
      and not exists (
        select 1
        from public.hidden_questions h
        where h.request_id = r.id
          and h.user_id = (select auth.uid())
      )
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

-- ── "Ocultados" ────────────────────────────────────────────────────────────
--
-- Devolve o que a pessoa ocultou, do mais recente para o mais antigo. O filtro
-- `is_deleted = false` é explícito de propósito: "Ocultados" não é a lixeira da
-- moderação — pergunta removida para todos não aparece para ninguém, nem para
-- quem a havia ocultado (o ADR pede "sem as removidas pela moderação").

create function public.list_hidden_questions()
returns table (
  id uuid,
  title text,
  body text,
  category public.recommendation_category,
  created_at timestamptz,
  hidden_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.title, r.body, r.category, r.created_at, h.hidden_at
  from public.hidden_questions h
  join public.recommendation_requests r on r.id = h.request_id
  where h.user_id = (select auth.uid())
    and r.is_deleted = false
  order by h.hidden_at desc, r.id desc;
$$;

revoke all on function public.list_hidden_questions() from public, anon;

grant execute on function public.list_hidden_questions() to authenticated;
