-- RUN-178 — Também perguntar à cidade (ADR-20261024 §1; execução no
-- ADR-20261116-execucao-pergunta-origem-dupla).
--
-- A pergunta feita num grupo Aberto é UMA linha de recommendation_requests com
-- origem dupla (locality_id + group_id) — não um post espelho. Esta migration é
-- única e traz tudo o que depende da origem: o CHECK, a policy de INSERT, a
-- policy de seguir (saves) e a contagem que a lista mostra.
--
-- Os vetos da escrita direta na tabela, provados em
-- supabase/tests/pergunta-origem-dupla.sql:
--   1. não membro do grupo;
--   2. grupo Fechado (visibility private) — e por construção nenhuma leitura da
--      cidade expõe pergunta de grupo fechado, porque a linha nem existe;
--   3. grupo fora do ar (is_deleted). O estado "Encerrado" do ADR ainda não
--      existe no schema: groups tem visibility public/private e não há coluna
--      de encerramento. O veto fica escrito como "não apagado" até o dia em que
--      o encerramento existir, e não se inventa estado aqui;
--   4. cidade da pergunta diferente da cidade do grupo.
--
-- O CHECK nunca é relaxado sem a policy nova: as duas coisas estão neste
-- arquivo, na mesma transação.

-- ── 1. origem: cidade, grupo, ou as duas ────────────────────────────────────

alter table public.recommendation_requests
  drop constraint recommendation_origin_scope;

alter table public.recommendation_requests
  add constraint recommendation_origin_scope check (
    (locality_id is not null and group_id is null)
    or (locality_id is null and group_id is not null)
    or (locality_id is not null and group_id is not null)
  );

-- ── 2. escrita: os quatro vetos, na policy ──────────────────────────────────
-- O ramo duplo confere a participação, o grupo Aberto, o grupo vivo e a cidade
-- do grupo. A leitura do grupo dentro da policy passa pela RLS de `groups`, que
-- já esconde grupo de outra cidade — o que só fecha mais, nunca abre.

drop policy if exists recommendation_requests_insert_locality
  on public.recommendation_requests;

create policy recommendation_requests_insert_locality
on public.recommendation_requests
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and (
    (
      locality_id is not null
      and group_id is null
      and private.is_locality_member(locality_id)
    )
    or (
      locality_id is null
      and group_id is not null
      and private.is_group_member(group_id)
    )
    or (
      locality_id is not null
      and group_id is not null
      and private.is_group_member(group_id)
      -- As colunas da linha são qualificadas pelo nome da tabela: dentro do
      -- subselect, `locality_id` sem qualificação resolveria para a coluna de
      -- `groups` (que tem o mesmo nome) e a comparação viraria tautologia —
      -- o teste do veto da cidade diferente pegou exatamente isso.
      and exists (
        select 1
        from public.groups as g
        where g.id = recommendation_requests.group_id
          and g.visibility = 'public'::public.group_visibility
          and g.is_deleted = false
          and g.locality_id = recommendation_requests.locality_id
      )
    )
  )
);

-- ── 3. seguir respostas: o que é visível pode ser seguido ───────────────────
-- A policy só aceitava pergunta da cidade (`req.locality_id is not null`), e a
-- tela traduzia a recusa em "Perguntas de grupo ainda não podem ser seguidas".
-- A linha de origem dupla é visível para a cidade e para o grupo; a policy passa
-- a aceitar exatamente isso, como a policy de SELECT.

drop policy if exists recommendation_saves_insert_own
  on public.recommendation_saves;

create policy recommendation_saves_insert_own
on public.recommendation_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.recommendation_requests as req
    where req.id = recommendation_saves.request_id
      and (
        (
          req.locality_id is not null
          and private.can_see_locality_recommendation(req.locality_id)
        )
        or (req.group_id is not null and private.is_group_member(req.group_id))
      )
  )
);

-- ── 4. contagem da cidade com a régua da lista ──────────────────────────────
-- O cabeçalho de Indicações contava linhas da tabela por `locality_id`, com o
-- atalho declarado "não desconta o que a pessoa ocultou nem soma pergunta de
-- grupo". Agora a pergunta de origem dupla é pergunta para todos os efeitos de
-- leitura, então a contagem usa a mesma régua de `list_indications`: cidade da
-- pergunta OU cidade do grupo, menos o que quem lê ocultou.

create function public.count_indications(p_locality_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.recommendation_requests as r
  left join public.groups as g on g.id = r.group_id
  where (r.locality_id = p_locality_id or g.locality_id = p_locality_id)
    and r.is_resolved
    and not exists (
      select 1
      from public.hidden_questions as h
      where h.request_id = r.id
        and h.user_id = (select auth.uid())
    );
$$;

revoke all on function public.count_indications(uuid) from public, anon;

grant execute on function public.count_indications(uuid) to authenticated;