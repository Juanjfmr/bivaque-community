-- RECON-035 — a conversa passa a registrar QUAL resposta resolveu a pergunta.
--
-- Autoridade: docs/decisions/ADR-20260909-resposta-que-resolveu.md (aprovado
-- pelo dono em 09/09/2026). Decisões que esta migration implementa:
--   D1 — uma coluna anulável em recommendation_requests, não uma tabela de
--        votos; uma resposta por pergunta, escolhida por quem perguntou.
--   D2 — só a autora da pergunta marca, sobre resposta da MESMA pergunta;
--        desmarcar é permitido; reabrir limpa o marcador. A escrita valida no
--        servidor (RPC), e a FK de integridade não basta porque ela só garante
--        que a resposta existe, não que ela pertence a esta pergunta.
--   D3 — a mesma autorização da conversa governa a leitura da marca. A coluna
--        herda a policy de SELECT já existente em recommendation_requests
--        (recommendation_requests_select_locality, recriada em
--        20260815220000_recommendation_reply_cycle.sql): quem alcança a
--        conversa lê a marca; quem não alcança não lê nem a marca nem a
--        resposta. Nenhuma policy nova é necessária porque não há coluna de
--        escopo nova — a marca vive na própria linha do pedido.
--   D5 — a marca não é reputação, ranking, selo de perfil nem insumo de busca
--        ou recomendação; é um ponteiro dentro de uma conversa.

-- ── D1: a coluna ────────────────────────────────────────────────────────────

alter table public.recommendation_requests
  add column resolved_reply_id uuid;

-- on delete set null: apagar a resposta marcada limpa o ponteiro sozinho e não
-- deixa referência pendurada (D2 / risco de moderação no ADR).
alter table public.recommendation_requests
  add constraint recommendation_requests_resolved_reply_id_fkey
  foreign key (resolved_reply_id)
  references public.recommendation_replies (id)
  on delete set null;

create index recommendation_requests_resolved_reply_idx
  on public.recommendation_requests (resolved_reply_id)
  where resolved_reply_id is not null;

-- ── D2: a resposta marcada TEM de pertencer à pergunta ──────────────────────
-- A FK (acima) garante que a resposta existe; NÃO garante que é resposta
-- DESTA pergunta. A policy recommendation_requests_update_own deixa a autora
-- atualizar a própria linha por PATCH direto, então um cliente sem interface
-- poderia apontar resolved_reply_id para resposta alheia. Este trigger fecha
-- a brecha no servidor, para o caminho RPC e para o caminho direto.

create function private.validate_recommendation_resolved_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matches boolean;
begin
  -- Limpar o marcador (null) é sempre válido — inclusive no ON DELETE SET NULL
  -- disparado quando a resposta apagada é removida.
  if new.resolved_reply_id is null then
    return new;
  end if;

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

  return new;
end;
$$;

revoke all on function private.validate_recommendation_resolved_reply() from public;
revoke all on function private.validate_recommendation_resolved_reply() from anon;
revoke all on function private.validate_recommendation_resolved_reply() from authenticated;
grant execute on function private.validate_recommendation_resolved_reply() to service_role;

create trigger validate_recommendation_resolved_reply
  before insert or update of resolved_reply_id on public.recommendation_requests
  for each row
  execute function private.validate_recommendation_resolved_reply();

-- ── D2: marcar / limpar / reabrir — sempre no servidor ──────────────────────
-- Espelha o padrão de mark_recommendation_resolved
-- (20260821000011_recommendation_reply_notify.sql): SECURITY DEFINER, valida a
-- autoria, eleva erro P0002 quando a operação não é da autora. Os três RPCs
-- são idempotentes: repetir a mesma chamada deixa o mesmo estado.

-- Marca uma resposta da própria pergunta e fecha a resolução num só ato.
create function public.mark_recommendation_reply_resolved(
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
      -- preserva resolved_at (idempotência).
      resolved_at = case
        when resolved_reply_id is distinct from p_reply_id then now()
        else coalesce(resolved_at, now())
      end,
      resolved_by = v_uid,
      resolved_reply_id = p_reply_id
  where id = p_request_id
    and author_id = v_uid;
end;
$$;

revoke all on function public.mark_recommendation_reply_resolved(uuid, uuid) from public;
revoke all on function public.mark_recommendation_reply_resolved(uuid, uuid) from anon;
revoke all on function public.mark_recommendation_reply_resolved(uuid, uuid) from authenticated;
grant execute on function public.mark_recommendation_reply_resolved(uuid, uuid) to authenticated;

-- Desmarca a resposta mantendo a pergunta resolvida (a autora limpa o campo).
create function public.clear_recommendation_resolved_reply(p_request_id uuid)
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

-- Reabre a pergunta e limpa o marcador no mesmo ato (D2).
create function public.reopen_recommendation(p_request_id uuid)
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
