-- 033: ocultar funciona para cada tipo de alvo (H-Task 3, Step 1)
--
-- `is_deleted` existia em posts, comments e groups (20260802001600). Os tres
-- alvos que a Task 1 acrescentou — mensagem de DM, pedido de indicacao e
-- resposta de indicacao — nao tinham como ser ocultados: a denuncia chegava ao
-- painel e o operador nao tinha o que fazer com ela.
--
-- Aqui a coluna nasce JUNTO com o filtro no caminho de leitura. Ocultar que nao
-- some da tela nao e ocultar — e o F165, que ja apareceu duas vezes neste
-- repositorio: primeiro porque a policy de comentario nao filtrava, depois
-- (2026-08-20) porque `service_role` tinha UPDATE e nao tinha SELECT na coluna
-- do filtro. Regra 6 da §12: a coluna de escopo e a policy que a le nascem na
-- mesma migration.
--
-- Escolha deliberada: o filtro vai na POLICY, nao so nas funcoes de leitura.
-- O modelo antigo de `posts` filtra dentro de feed_posts() e deixa a policy
-- aberta — quem consultar `posts` direto pelo PostgREST ainda ve o post
-- ocultado. Nao replicar isso aqui.
--
-- Consequencia aceita: o autor tambem deixa de ver o proprio conteudo
-- ocultado. Ocultado e ocultado; a alternativa (o autor continuar vendo) faz
-- ele reescrever a mesma coisa achando que nao publicou.

alter table public.dm_messages add column is_deleted boolean not null default false;
alter table public.recommendation_requests add column is_deleted boolean not null default false;
alter table public.recommendation_replies add column is_deleted boolean not null default false;

-- ── grants: service_role oculta e precisa LER a coluna do filtro ────────────
-- A clausula .eq("id", ...) da rota precisa de SELECT na coluna do filtro. Foi
-- exatamente o que faltou em 20260821000016 e derrubou a ocultacao dos tres
-- alvos antigos com "permission denied".

grant select on table public.dm_messages to service_role;
grant select on table public.recommendation_requests to service_role;
grant select on table public.recommendation_replies to service_role;

grant update (is_deleted) on table public.dm_messages to service_role;
grant update (is_deleted) on table public.recommendation_requests to service_role;
grant update (is_deleted) on table public.recommendation_replies to service_role;

-- ── so service_role vira a chave ───────────────────────────────────────────
-- Mesmo gatilho que 20260802001600 usa nos tres alvos antigos.

create trigger block_soft_delete_dm_messages
before update of is_deleted on public.dm_messages
for each row
when (new.is_deleted is distinct from old.is_deleted)
execute function private.block_authenticated_soft_delete();

create trigger block_soft_delete_recommendation_requests
before update of is_deleted on public.recommendation_requests
for each row
when (new.is_deleted is distinct from old.is_deleted)
execute function private.block_authenticated_soft_delete();

create trigger block_soft_delete_recommendation_replies
before update of is_deleted on public.recommendation_replies
for each row
when (new.is_deleted is distinct from old.is_deleted)
execute function private.block_authenticated_soft_delete();

-- ── o caminho de leitura, recriado com o filtro ─────────────────────────────
-- As expressoes abaixo sao as originais, com `and is_deleted = false` no fim.

drop policy dm_messages_select_participant on public.dm_messages;
create policy dm_messages_select_participant
on public.dm_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (c.participant_a = (select auth.uid())
           or c.participant_b = (select auth.uid()))
  )
  and is_deleted = false
);

drop policy recommendation_requests_select_locality on public.recommendation_requests;
create policy recommendation_requests_select_locality
on public.recommendation_requests
for select
to authenticated
using (
  (
    author_id = (select auth.uid())
    or (locality_id is not null and private.can_see_locality_recommendation(locality_id))
    or (group_id is not null and private.is_group_member(group_id))
  )
  and is_deleted = false
);

drop policy recommendation_replies_select on public.recommendation_replies;
create policy recommendation_replies_select
on public.recommendation_replies
for select
to authenticated
using (
  (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.recommendation_requests req
      where req.id = recommendation_replies.request_id
        and (
          (req.locality_id is not null and private.can_see_locality_recommendation(req.locality_id))
          or (req.group_id is not null and private.is_group_member(req.group_id))
        )
    )
  )
  and is_deleted = false
);

-- ── a fila de curadoria do guia tambem para de ver o que foi ocultado ───────
-- security definer: bypassa a policy acima, entao precisa do filtro proprio.
-- Promover para o Guia de Chegada uma resposta que a moderacao acabou de
-- ocultar seria transformar conteudo removido em acervo permanente.

create or replace function public.list_promotable_replies(p_locality_id uuid, p_limit integer default 50)
returns table (
  reply_id uuid,
  body text,
  created_at timestamptz,
  request_title text,
  request_category public.recommendation_category,
  author_display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rr.id,
    rr.body,
    rr.created_at,
    r.title,
    r.category,
    p.display_name
  from public.recommendation_replies rr
  join public.recommendation_requests r on r.id = rr.request_id
  -- user_id-only: profiles.locality_id was dropped by P0 Task 3
  -- (20260817031237_belonging_multi_membership.sql) — one profile per person.
  left join public.profiles p
    on p.user_id = rr.author_id
  where r.locality_id = p_locality_id
    and rr.is_deleted = false
    and r.is_deleted = false
    and not exists (
      select 1 from public.recommendation_reply_promotions rp
      where rp.reply_id = rr.id
    )
  order by rr.created_at desc
  limit greatest(p_limit, 1);
$$;
