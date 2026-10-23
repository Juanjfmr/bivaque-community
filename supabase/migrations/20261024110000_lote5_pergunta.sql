-- Lote 5, tarefa A1 (COM-002) — o ciclo da pergunta segue o prototipo.
--
-- Autoridade: docs/decisions/ADR-20261023-comunidade-do-prototipo.md, secao
-- "2. Pergunta e resposta" (aceito pelo dono em 23/10/2026). O que entrega:
--
--   1. a pergunta tem de 8 a 300 caracteres. A regra de "2 termos" do prototipo
--      NAO entra (escolha do dono);
--   2. `recommendation_replies.edited_at` guarda o instante da edicao. A
--      pergunta usa o `updated_at` que ja tem, escrito pela autoria ao editar;
--   3. a resolucao passa a ter dois campos: `resolved_reply_id` e a resolucao
--      ATUAL e `last_resolved_reply_id` a ULTIMA resposta que resolveu;
--   4. "resolvida sem resposta" e um estado da pergunta (is_resolved = true com
--      a resolucao atual vazia), escrito por mark_recommendation_resolved;
--   5. reabrir esvazia a resolucao ATUAL e MANTEM a ultima;
--   6. `list_indications` ganha `p_mine` (Minhas / Para ajudar) e, no filtro
--      "Para ajudar", quem ainda nao tem resposta aparece primeiro;
--   7. `list_question_replies` e o caminho de leitura da conversa: a resposta
--      removida pela moderacao volta como aviso, sem texto e sem autor.
--
-- O banco de producao nao tem uso real (dono, 23/10/2026): o CHECK do titulo
-- entra validando, sem `not valid`. As colunas novas entram junto das policies
-- e funcoes que as leem, na mesma migration.

-- ── 1. tamanho da pergunta: 8..300 ─────────────────────────────────────────

alter table public.recommendation_requests
  drop constraint if exists recommendation_requests_title_check;

alter table public.recommendation_requests
  add constraint recommendation_requests_title_check
  check (char_length(title) between 8 and 300);

-- ── 2. marca de edicao da resposta ─────────────────────────────────────────
--
-- Nula em toda resposta que nunca foi editada; quem edita escreve o instante.
-- A pergunta nao ganha coluna nova: o `updated_at` dela ja e esse instante.

alter table public.recommendation_replies
  add column edited_at timestamptz;

-- A marca e do BANCO: quem escreve o texto de novo ganha o instante gravado sem
-- depender do cliente. A moderacao (is_deleted) nao mexe no texto, entao nao
-- marca edicao.
create function private.mark_recommendation_reply_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

create trigger recommendation_replies_mark_edited
before update on public.recommendation_replies
for each row execute function private.mark_recommendation_reply_edited();

revoke all on function private.mark_recommendation_reply_edited() from public;

-- A pergunta ganha a mesma marca, nula em quem nunca foi editado. A coluna e
-- propria (e nao o `updated_at` que a tabela ja tem) porque o `updated_at`
-- carrega o instante do INSERT: as fixtures e o seed gravam `created_at` antigo
-- com `updated_at` de hoje, e todo pedido antigo apareceria "editada".
alter table public.recommendation_requests
  add column edited_at timestamptz;

create function private.mark_recommendation_request_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.edited_at = now();
  return new;
end;
$$;

-- Só o CONTEUDO muda a marca. Resolver, reabrir ou trocar o marcador nao sao
-- edicoes e nao mexem em `edited_at`.
create trigger recommendation_requests_mark_edited
before update on public.recommendation_requests
for each row
when (
  new.title is distinct from old.title
  or new.body is distinct from old.body
  or new.category is distinct from old.category
)
execute function private.mark_recommendation_request_edited();

revoke all on function private.mark_recommendation_request_edited() from public;

-- ── 3. a ultima resposta que resolveu ──────────────────────────────────────

alter table public.recommendation_requests
  add column last_resolved_reply_id uuid;

-- on delete set null, como em `resolved_reply_id`: apagar a resposta leva o
-- ponteiro junto e nao deixa referencia pendurada.
alter table public.recommendation_requests
  add constraint recommendation_requests_last_resolved_reply_id_fkey
  foreign key (last_resolved_reply_id)
  references public.recommendation_replies (id)
  on delete set null;

create index recommendation_requests_last_resolved_reply_idx
  on public.recommendation_requests (last_resolved_reply_id)
  where last_resolved_reply_id is not null;

-- ── 4. os dois ponteiros TEM de pertencer a pergunta ───────────────────────
--
-- A FK garante que a resposta existe; NAO garante que e resposta DESTA
-- pergunta. A policy recommendation_requests_update_own deixa a autora atualizar
-- a propria linha por PATCH direto, entao um cliente sem interface poderia
-- apontar qualquer campo para resposta alheia. O trigger fecha isso no servidor,
-- para o caminho RPC e para o caminho direto.

create or replace function private.validate_recommendation_resolved_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matches boolean;
begin
  -- Limpar (null) e sempre valido — inclusive no ON DELETE SET NULL disparado
  -- quando a resposta apagada e removida.
  if new.resolved_reply_id is not null then
    select exists (
      select 1
      from public.recommendation_replies reply
      where reply.id = new.resolved_reply_id
        and reply.request_id = new.id
        and reply.is_deleted = false
    ) into v_matches;

    if not v_matches then
      raise exception 'resolved reply must belong to the request'
        using errcode = '23514';
    end if;
  end if;

  -- A memoria da ultima resolucao aceita a resposta removida pela moderacao: o
  -- que importa e que ela pertence a esta pergunta. A validacao olha so uma
  -- TROCA de valor: o ON DELETE SET NULL esvazia o campo no mesmo instante em
  -- que a resposta apagada deixa de existir, e revalidar ali seria falso
  -- positivo.
  if new.last_resolved_reply_id is not null
    and new.last_resolved_reply_id is distinct from old.last_resolved_reply_id
  then
    select exists (
      select 1
      from public.recommendation_replies reply
      where reply.id = new.last_resolved_reply_id
        and reply.request_id = new.id
    ) into v_matches;

    if not v_matches then
      raise exception 'last resolved reply must belong to the request'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_recommendation_resolved_reply() from public;
revoke all on function private.validate_recommendation_resolved_reply() from anon;
revoke all on function private.validate_recommendation_resolved_reply() from authenticated;
grant execute on function private.validate_recommendation_resolved_reply() to service_role;

drop trigger if exists validate_recommendation_resolved_reply
  on public.recommendation_requests;
create trigger validate_recommendation_resolved_reply
  before insert or update of resolved_reply_id, last_resolved_reply_id
  on public.recommendation_requests
  for each row
  execute function private.validate_recommendation_resolved_reply();

-- ── 5. marcar / reabrir — sempre no servidor ───────────────────────────────
--
-- Espelha o padrao da RECON-035: SECURITY DEFINER, valida a autoria, eleva erro
-- P0002 quando a operacao nao e da autora. Os RPCs sao idempotentes.

-- Marca uma resposta da propria pergunta e fecha a resolucao num so ato. A
-- resposta marcada passa a ser a resolucao ATUAL e a ULTIMA ao mesmo tempo.
create or replace function public.mark_recommendation_reply_resolved(
  p_request_id uuid,
  p_reply_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.recommendation_requests request
    join public.recommendation_replies reply
      on reply.id = p_reply_id
     and reply.request_id = request.id
     and reply.is_deleted = false
    where request.id = p_request_id
      and request.author_id = v_uid
  ) then
    raise exception 'request not found, reply does not belong to it, or you are not the author'
      using errcode = 'P0002';
  end if;

  update public.recommendation_requests
  set is_resolved = true,
      -- Trocar a resposta marcada atualiza o instante; repetir a mesma marca
      -- preserva resolved_at (idempotencia).
      resolved_at = case
        when resolved_reply_id is distinct from p_reply_id then now()
        else coalesce(resolved_at, now())
      end,
      resolved_by = v_uid,
      resolved_reply_id = p_reply_id,
      last_resolved_reply_id = p_reply_id
  where id = p_request_id
    and author_id = v_uid;
end;
$$;

revoke all on function public.mark_recommendation_reply_resolved(uuid, uuid) from public;
revoke all on function public.mark_recommendation_reply_resolved(uuid, uuid) from anon;
revoke all on function public.mark_recommendation_reply_resolved(uuid, uuid) from authenticated;
grant execute on function public.mark_recommendation_reply_resolved(uuid, uuid) to authenticated;

-- "Resolvida sem resposta": põe a pergunta como resolvida com a resolucao
-- atual vazia. A ULTIMA resposta que resolveu fica guardada. Reescrita da
-- versao de 20260821000011, que nao mexia nos ponteiros.
create or replace function public.mark_recommendation_resolved(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.recommendation_requests
  set is_resolved = true,
      -- Primeira resolucao guarda o instante; repetir preserva (idempotencia).
      resolved_at = coalesce(resolved_at, now()),
      resolved_by = v_uid,
      resolved_reply_id = null
  where id = p_request_id
    and author_id = v_uid;

  if not found then
    raise exception 'request not found or you are not the author' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.mark_recommendation_resolved(uuid) from public;
revoke all on function public.mark_recommendation_resolved(uuid) from anon;
revoke all on function public.mark_recommendation_resolved(uuid) from authenticated;
grant execute on function public.mark_recommendation_resolved(uuid) to authenticated;

-- Desmarca a resposta mantendo a pergunta resolvida. Equivale a "resolvida sem
-- resposta" quando a pergunta ja esta resolvida; mantida para nao quebrar quem
-- ja a chama.
create or replace function public.clear_recommendation_resolved_reply(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.recommendation_requests
  set resolved_reply_id = null
  where id = p_request_id
    and author_id = v_uid;

  if not found then
    raise exception 'request not found or you are not the author' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.clear_recommendation_resolved_reply(uuid) from public;
revoke all on function public.clear_recommendation_resolved_reply(uuid) from anon;
revoke all on function public.clear_recommendation_resolved_reply(uuid) from authenticated;
grant execute on function public.clear_recommendation_resolved_reply(uuid) to authenticated;

-- Reabre a pergunta: esvazia a resolucao ATUAL e MANTEM a ultima. O
-- `last_resolved_reply_id` nao e tocado de proposito — e a memoria da resolucao.
create or replace function public.reopen_recommendation(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.recommendation_requests
  set is_resolved = false,
      resolved_at = null,
      resolved_by = null,
      resolved_reply_id = null
  where id = p_request_id
    and author_id = v_uid;

  if not found then
    raise exception 'request not found or you are not the author' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.reopen_recommendation(uuid) from public;
revoke all on function public.reopen_recommendation(uuid) from anon;
revoke all on function public.reopen_recommendation(uuid) from authenticated;
grant execute on function public.reopen_recommendation(uuid) to authenticated;

-- ── 6. a lista da memoria ganha "Minhas" ───────────────────────────────────
--
-- `p_mine` e tri-estado: nulo = as duas autorias (padrao), verdadeiro = so os
-- pedidos de quem le ("Minhas"), falso = so os de outras pessoas ("Para
-- ajudar" com p_resolved = false). O filtro e por autoria, no servidor.

drop function if exists public.list_indications(
  uuid, text, public.recommendation_category, boolean, integer, integer
);

create function public.list_indications(
  p_locality_id uuid,
  p_query text default null,
  p_category public.recommendation_category default null,
  p_resolved boolean default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_mine boolean default null
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
      -- Minhas / Para ajudar: a autoria entra no filtro, no servidor.
      and (p_mine is null or (r.author_id = (select auth.uid())) = p_mine)
      -- Ocultar e pessoal: some so da lista de quem ocultou.
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
      ) as matched_reply_body,
      (
        select count(*)::integer
        from public.recommendation_replies rep
        where rep.request_id = c.id
      ) as reply_count
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
    s.reply_count,
    (
      select rep.body
      from public.recommendation_replies rep
      where rep.id = s.resolved_reply_id
    ),
    s.matched_reply_body
  from scored s
  -- Entra quem tem termo na propria pergunta, ou quem casa pelo menos metade
  -- dos termos nas respostas: "fonoaudiologo infantil" nao traz a natacao so
  -- porque uma resposta fala em "turma infantil".
  where not exists (select 1 from terms)
    or s.hits_question > 0
    or s.hits * 2 >= (select count(*) from terms)
  order by
    s.hits desc,
    (s.is_resolved and exists (select 1 from terms)) desc,
    -- "Para ajudar": perguntas sem resposta aparecem primeiro, como no
    -- prototipo. Nos outros filtros a expressao e nula e nada muda.
    case when p_mine is false and p_resolved is false then s.reply_count end asc nulls last,
    s.created_at desc,
    s.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.list_indications(
  uuid, text, public.recommendation_category, boolean, integer, integer, boolean
) from public, anon;

grant execute on function public.list_indications(
  uuid, text, public.recommendation_category, boolean, integer, integer, boolean
) to authenticated;

-- ── 7. a conversa como leitura segura do removido ──────────────────────────
--
-- A policy de SELECT esconde a resposta removida pela moderacao. Para o aviso
-- no lugar ("Resposta removida pela moderacao") existir sem vazar nada, a
-- leitura da conversa passa por esta funcao: SECURITY DEFINER, mas com o
-- portao de quem alcanca o pedido (autora, membro da cidade ou do grupo), e
-- devolvendo autor e texto VAZIOS quando a resposta foi removida. O aviso nunca
-- expoe o texto removido nem o nome de quem escreveu.

create function public.list_question_replies(p_request_id uuid)
returns table (
  id uuid,
  author_id uuid,
  body text,
  created_at timestamptz,
  edited_at timestamptz,
  is_removed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.recommendation_requests request
    where request.id = p_request_id
      and request.is_deleted = false
      and (
        request.author_id = v_uid
        or (
          request.locality_id is not null
          and private.can_see_locality_recommendation(request.locality_id)
        )
        or (request.group_id is not null and private.is_group_member(request.group_id))
      )
  ) then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  return query
    select
      reply.id,
      case when reply.is_deleted then null else reply.author_id end,
      case when reply.is_deleted then null else reply.body end,
      reply.created_at,
      reply.edited_at,
      reply.is_deleted
    from public.recommendation_replies reply
    where reply.request_id = p_request_id
    order by reply.created_at, reply.id;
end;
$$;

revoke all on function public.list_question_replies(uuid) from public, anon;

grant execute on function public.list_question_replies(uuid) to authenticated;