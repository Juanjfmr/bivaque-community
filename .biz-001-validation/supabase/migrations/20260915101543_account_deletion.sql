-- Exclusão de conta iniciada pelo titular
-- (ADR-20260914-exclusao-de-conta, aprovado em 14/09/2026; a tabela de
-- parâmetros jurídicos daquele ADR é o contrato desta implementação).
--
-- O mecanismo foi medido em 15/09/2026 contra o stack local, GoTrue v2.190.0:
--
--   * apagar as linhas de auth.sessions revoga a sessão na hora — GET
--     /auth/v1/user com o access token antigo devolve 403 (antes: 200);
--   * auth.users.banned_until bloqueia login novo e refresh — o password grant
--     devolve {"error_code":"user_banned"} e o refresh devolve
--     "Invalid Refresh Token: User Banned";
--   * um access token emitido ANTES do banimento continua valendo até expirar
--     se a sessão existir (medido: 200 com ban + sessão viva, 403 com ban +
--     sessão apagada). Por isso o pedido faz as DUAS coisas.
--   * e as duas coisas fecham o GoTrue, NÃO o Data API: medido em 15/09, com o
--     pedido feito e o token antigo, GET /auth/v1/user devolve 403 mas
--     POST /rest/v1/comments devolve 201 — o PostgREST confia no JWT e não
--     consulta auth.sessions nem banned_until. A janela é o jwt_expiry
--     (3600s). Quem fecha a publicação nessa janela é o veto nas policies
--     (seção 3), não o banimento.
--   * a purga usa auth.admin.deleteUser(id, true) na rota interna: o soft
--     delete do Auth mantém a linha de auth.users — a FK do conteúdo sobrevive,
--     que é o que o item 4 do ADR exige — e apaga credencial e identidade.
--     posts.user_id, comments.user_id e communities.owner_user_id são
--     ON DELETE CASCADE: purga destrutiva apagaria conteúdo de terceiros.
--
-- Nenhum prazo de retenção nasce aqui. A única janela é a da tabela aprovada
-- (até 15 dias do pedido, alinhado ao art. 19 da LGPD) e ela mora em
-- private.account_deletion_window(), provada em pgTAP.
--
-- O que esta migração NÃO decide, de propósito, está no rodapé do arquivo.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. O pedido
-- ═══════════════════════════════════════════════════════════════════════════

-- Uma linha por conta. A linha existe = a conta está pedindo exclusão: é ela
-- que esconde o perfil, no pedido e depois da purga. Nada de conteúdo pessoal
-- além do id — é o mínimo para (a) manter o perfil oculto e (b) provar que o
-- prazo foi cumprido (ADR item 8).
create table public.account_deletion_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  due_at timestamptz not null,
  finalized_at timestamptz,
  purge_attempts integer not null default 0,
  purge_attempted_at timestamptz,
  purge_last_error text,
  constraint account_deletion_requests_due_after_request check (due_at > requested_at)
);

create index account_deletion_requests_due_idx
  on public.account_deletion_requests (due_at)
  where finalized_at is null;

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;

-- Fechada para o Data API. O titular lê o próprio estado pela função
-- is_account_deletion_pending(); ninguém lê a linha de outro.
revoke all on table public.account_deletion_requests from anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_requests to service_role;

-- A janela é parâmetro jurídico, não constante de código: uma função só, para
-- o pgTAP provar o valor e o ADR poder mudá-lo sem caçar literais.
create function private.account_deletion_window()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '15 days';
$$;

revoke all on function private.account_deletion_window() from public;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Perfil oculto — a superfície que vazou em 10/09
-- ═══════════════════════════════════════════════════════════════════════════

-- A lição de 20260911033327: coluna de estado em profiles vira leitura de
-- linha inteira para quem compartilha localidade. Aqui não há coluna e não há
-- função exposta: a policy apenas deixa de devolver a linha. O predicado vive
-- no schema private, sem grant nenhum ao Data API, então não existe oráculo de
-- enumeração — um terceiro observa a ausência, nunca o motivo.
create function private.account_deletion_requested(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.account_deletion_requests where user_id = p_user_id
  );
$$;

-- O papel que AVALIA a policy é authenticated, e o PostgreSQL confere o
-- EXECUTE em tempo de execução — não só na criação. Por isso o predicado
-- precisa do grant, como shares_locality_with, can_write_post_to e
-- can_access_post já têm. Isto NÃO vira oráculo de "quem está saindo": o
-- schema private não está em db-schemas (supabase/config.toml:
-- schemas = ["public", "graphql_public"]), então a Data API não consegue
-- nomear a função — o caminho medido no vazamento de 10/09
-- (GET /rest/v1/profiles?select=user_id,is_suspended) não existe aqui. O
-- teste de escopo trava a lista de schemas expostos para que essa premissa não
-- caia em silêncio.
revoke all on function private.account_deletion_requested(uuid) from public;
grant execute on function private.account_deletion_requested(uuid) to authenticated;

-- A própria linha continua legível para o dono: o app não quebra em estados
-- intermediários e ninguém precisa de um "modo" só para isso.
alter policy profiles_select_visible_in_locality
on public.profiles
using (
  user_id = (select auth.uid())
  or (
    not private.account_deletion_requested(user_id)
    and private.shares_locality_with(user_id)
  )
);

alter policy profiles_select_community_comember
on public.profiles
using (
  not private.account_deletion_requested(profiles.user_id)
  and exists (
    select 1
    from public.community_memberships mine
    join public.community_memberships theirs
      on theirs.community_id = mine.community_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'approved'
      and theirs.user_id = profiles.user_id
      and theirs.status = 'approved'
  )
);

-- A página de perfil decide entre render e notFound() por esta função — e é o
-- overload de DOIS argumentos que ela chama (apps/web/lib/profile-rpcs.ts passa
-- p_target_user_id e p_viewer_user_id, pelo cliente de serviço). Guardar o de um
-- argumento teria sido código morto, e pior: 20260821000023 dropou de propósito
-- aquela assinatura ("nothing may keep calling them"), então recriá-la seria
-- ressuscitar uma porta fechada. As assinaturas ficam como estavam: o de dois
-- argumentos ganha a guarda, o de um argumento continua dropado.
drop function if exists public.profile_is_visible_to_viewer(uuid);

create or replace function public.profile_is_visible_to_viewer(
  p_target_user_id uuid,
  p_viewer_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  -- Perfil oculto vale para QUALQUER leitor, inclusive o caminho de serviço que
  -- a página usa.
  if private.account_deletion_requested(p_target_user_id) then
    return false;
  end if;

  return exists (
    select 1
    from public.locality_memberships lm_target
    where lm_target.user_id = p_target_user_id
      and exists (
        select 1 from public.locality_memberships lm_viewer
        where lm_viewer.locality_id = lm_target.locality_id
          and lm_viewer.user_id = p_viewer_user_id
      )
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Conteúdo deixa de receber interação nova (ADR item 2)
-- ═══════════════════════════════════════════════════════════════════════════

-- O conteúdo PERMANECE legível (ADR item 4); o que para é a interação dirigida
-- ao titular. Ler não muda; comentar, reagir e acompanhar, sim.
create function private.post_accepts_interaction(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.posts p
    join public.account_deletion_requests r on r.user_id = p.user_id
    where p.id = p_post_id
  );
$$;

-- Mesmo motivo do account_deletion_requested: a policy é avaliada como authenticated.
revoke all on function private.post_accepts_interaction(uuid) from public;
grant execute on function private.post_accepts_interaction(uuid) to authenticated;

-- As policies são ALTERADAS, não recriadas: o nome e o papel continuam os
-- mesmos, e os testes que conferem a existência delas seguem valendo.
alter policy comments_insert_member
on public.comments
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
  and not public.is_account_suspended((select auth.uid()))
  and private.post_accepts_interaction(post_id)
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy post_reactions_insert_locality_member
on public.post_reactions
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = post_reactions.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
  and not public.is_account_suspended((select auth.uid()))
  and private.post_accepts_interaction(post_id)
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy post_reactions_insert_self
on public.post_reactions
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = post_reactions.post_id
      and private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
  )
  and not public.is_account_suspended((select auth.uid()))
  and private.post_accepts_interaction(post_id)
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy post_follows_insert_own
on public.post_follows
with check (
  user_id = (select auth.uid())
  and private.post_accepts_interaction(post_id)
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy post_saves_insert_own
on public.post_saves
with check (
  user_id = (select auth.uid())
  and private.can_access_post(post_id)
  and private.post_accepts_interaction(post_id)
  and not private.account_deletion_requested((select auth.uid()))
);

-- ── A conta que está saindo também não publica ──────────────────────────────
--
-- Medido em 15/09: o PostgREST confia no JWT e NÃO consulta auth.sessions nem
-- banned_until. Revogar a sessão e banir a conta fecham o login e o refresh no
-- GoTrue (403 / user_banned), mas um access token já emitido continua aceito no
-- Data API até expirar (jwt_expiry = 3600s). Sem veto na policy, a conta "meio
-- apagada" que o ADR proíbe ainda escreve por até uma hora.
--
-- O veto é o MESMO conjunto de superfícies que a suspensão já veta
-- (20260901124348): posts, comentários, reações, anúncios e denúncias. O que
-- sobra fora dele (preferências, salvos de anúncio, RSVP, edição de perfil) é
-- privado ou não publica — e está registrado no rodapé deste arquivo.
alter policy posts_insert_locality_member
on public.posts
with check (
  user_id = (select auth.uid())
  and private.can_write_post_to(locality_id, community_id, group_id)
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy listings_insert_owner
on public.listings
with check (
  owner_user_id = (select auth.uid())
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
);

alter policy reports_insert_authenticated
on public.reports
with check (
  reporter_user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.locality_memberships
      where locality_memberships.user_id = (select auth.uid())
    )
    or (
      private.is_provider_account((select auth.uid()))
      and target_type = 'message'
    )
  )
  and not public.is_account_suspended((select auth.uid()))
  and not private.account_deletion_requested((select auth.uid()))
);

-- Conversa nova com quem está saindo não é possível, e a conversa que já
-- existe para de receber mensagem nova — o histórico do outro lado continua
-- legível (SELECT e listagem não passam por aqui).
create or replace function public.open_conversation(
  p_other_user_id uuid,
  p_context_type public.dm_context_type,
  p_context_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null or v_me = p_other_user_id then
    raise exception 'invalid conversation' using errcode = '22023';
  end if;

  -- Quem está saindo também não abre conversa: a sessão morreu, mas um access
  -- token ainda aceito pelo Data API não pode virar conversa nova.
  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if private.account_deletion_requested(p_other_user_id) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  if not private.dm_context_valid(v_me, p_other_user_id, p_context_type, p_context_id) then
    raise exception 'no valid context between these users' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = p_other_user_id)
       or (blocker_user_id = p_other_user_id and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A ordenação é aqui, e só aqui. O cliente nunca escolhe quem é A.
  v_a := least(v_me, p_other_user_id);
  v_b := greatest(v_me, p_other_user_id);

  -- O "do update" não muda nada: é o idioma para conseguir RETURNING quando a
  -- linha já existe. Reabrir conversa é devolver a mesma, não criar outra.
  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, p_context_type, p_context_id)
  on conflict (participant_a, participant_b) do update set participant_a = excluded.participant_a
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.open_conversation(uuid, public.dm_context_type, uuid)
  from public, anon, authenticated;
grant execute on function public.open_conversation(uuid, public.dm_context_type, uuid) to authenticated;

create or replace function public.send_conversation_message(
  p_conversation_id uuid,
  p_content text,
  p_client_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_content text := btrim(coalesce(p_content, ''));
  v_key text := nullif(btrim(coalesce(p_client_key, '')), '');
  v_conv public.dm_conversations%rowtype;
  v_msg public.dm_messages%rowtype;
  v_other uuid;
  v_status public.service_request_status;
  v_provider uuid;
  v_request_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_content = '' then
    raise exception 'message required' using errcode = '22023';
  end if;
  if char_length(v_content) > 2000 then
    raise exception 'message too long' using errcode = '22023';
  end if;

  select * into v_conv from public.dm_conversations where id = p_conversation_id;
  if not found then
    raise exception 'conversation not found' using errcode = '42501';
  end if;
  if v_me <> v_conv.participant_a and v_me <> v_conv.participant_b then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  v_other := case
    when v_conv.participant_a = v_me then v_conv.participant_b
    else v_conv.participant_a
  end;
  if private.account_deletion_requested(v_other) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.dm_blocks b
     where (b.blocker_user_id = v_conv.participant_a
            and b.blocked_user_id = v_conv.participant_b)
        or (b.blocker_user_id = v_conv.participant_b
            and b.blocked_user_id = v_conv.participant_a)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- Reenvio repetido devolve a linha ja gravada em vez de criar outra.
  if v_key is not null then
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    if found then
      return to_jsonb(v_msg);
    end if;
  end if;

  insert into public.dm_messages (conversation_id, sender_id, content, client_key)
  values (p_conversation_id, v_me, v_content, v_key)
  on conflict (conversation_id, sender_id, client_key) where client_key is not null
  do nothing
  returning * into v_msg;

  if v_msg.id is null then
    -- Corrida: outra transacao gravou a mesma chave primeiro.
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    return to_jsonb(v_msg);
  end if;

  -- A situacao muda na PRIMEIRA resposta do PRESTADOR, na mesma transacao em
  -- que a mensagem e gravada. Depois disso a coluna permanece. Enquanto o
  -- pedido nao esta encerrado, a mensagem tambem move a "ultima atualizacao"
  -- que a lista mostra.
  select r.id, r.status, r.provider_user_id
    into v_request_id, v_status, v_provider
    from public.service_requests r
   where r.conversation_id = p_conversation_id
   for update;
  if found then
    if v_status = 'open' and v_me = v_provider then
      update public.service_requests
         set status = 'in_conversation'
       where id = v_request_id;
    elsif v_status <> 'closed' and v_status <> 'cancelled' then
      update public.service_requests
         set updated_at = now()
       where id = v_request_id;
    end if;
  end if;

  return to_jsonb(v_msg);
end;
$$;

revoke all on function public.send_conversation_message(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.send_conversation_message(uuid, text, text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Moderação: anonimização imediata (tabela aprovada)
-- ═══════════════════════════════════════════════════════════════════════════

-- "Registros de moderação: anonimização do titular imediatamente; o caso
-- permanece anonimizado". O denunciante sai da linha e o caso continua de pé
-- para a operação e para o terceiro protegido — por isso a coluna deixa de ser
-- NOT NULL: antes, só a exclusão em cascata resolvia, e ela levaria o caso.
alter table public.reports alter column reporter_user_id drop not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. O pedido, pelo titular
-- ═══════════════════════════════════════════════════════════════════════════

-- Dados de contato do titular, por endereço. Chamada pela rota ANTES de
-- auth.admin.deleteUser: depois do soft delete o GoTrue troca o e-mail por uma
-- cadeia aleatória (medido em 15/09: email = 'TROCADO:gyn9...'), então qualquer
-- limpeza por endereço feita depois disso não casa com nada — e uma tentativa
-- repetida nunca mais acharia o endereço real.
--
-- Idempotente de propósito: repetir é no-op. Sem p_contact_email, não faz nada —
-- não existe "apagar por aproximação".
create function public.purge_account_contact_data(p_user_id uuid, p_contact_email text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := nullif(btrim(coalesce(p_contact_email, '')), '');
  v_total integer := 0;
  v_rows integer := 0;
begin
  if p_user_id is null or v_email is null then
    return 0;
  end if;

  delete from public.notification_opt_outs where recipient = v_email;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  delete from public.outbox where recipient = v_email;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  delete from public.waitlist where email = v_email;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  return v_total;
end;
$$;

revoke all on function public.purge_account_contact_data(uuid, text)
  from public, anon, authenticated;
grant execute on function public.purge_account_contact_data(uuid, text) to service_role;

create function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_requested_at timestamptz;
  v_due_at timestamptz;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  -- Idempotente: repetir o pedido não estende o prazo nem duplica efeito.
  insert into public.account_deletion_requests (user_id, due_at)
  values (v_user, now() + private.account_deletion_window())
  on conflict (user_id) do nothing;

  select requested_at, due_at into v_requested_at, v_due_at
  from public.account_deletion_requests
  where user_id = v_user;

  -- 1. Moderação anonimizada já (tabela aprovada: "anonimização imediata").
  update public.reports set reporter_user_id = null where reporter_user_id = v_user;

  -- 2. Família: o vínculo é encerrado, o outro lado permanece intacto.
  delete from private.family_account_links
  where holder_user_id = v_user or family_user_id = v_user;

  update private.family_invitations
     set status = 'revoked'
   where inviter_user_id = v_user
     and status = 'pending';

  -- 3. Sessão revogada e login bloqueado (as duas medições do cabeçalho).
  delete from auth.sessions where user_id = v_user;
  update auth.users
     set banned_until = now() + interval '100 years'
   where id = v_user;

  return jsonb_build_object('requested_at', v_requested_at, 'due_at', v_due_at);
end;
$$;

revoke all on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

-- Leitura do próprio estado, sem parâmetro: não existe forma de perguntar por
-- outra pessoa, então não existe enumeração.
create function public.is_account_deletion_pending()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_deletion_requests
    where user_id = (select auth.uid())
      and finalized_at is null
  );
$$;

revoke all on function public.is_account_deletion_pending() from public, anon, authenticated;
grant execute on function public.is_account_deletion_pending() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. A purga
-- ═══════════════════════════════════════════════════════════════════════════

-- Chamada pela rota interna com service_role, depois de
-- auth.admin.deleteUser(id, true). p_error grava a falha da rota sem purgar
-- nada: são dois desfechos, não um parâmetro opcional disfarçado.
--
-- O endereço de contato NÃO passa por aqui: quem apaga opt-out, fila de entrega
-- e lista de espera é public.purge_account_contact_data(), chamada pela rota
-- antes do soft delete, porque depois dele o GoTrue troca o e-mail por uma
-- cadeia aleatória (medido em 15/09) e uma tentativa repetida não acharia mais
-- o endereço real.
--
-- Ordem importa: higieniza e só então marca finalized_at. Se algo falhar no
-- meio, a transação desfaz inteira e o job tenta de novo — nunca existe
-- "finalizado" com dado pessoal dentro.
create function public.finalize_account_deletion(
  p_user_id uuid,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due_at timestamptz;
  v_finalized_at timestamptz;
begin
  select due_at, finalized_at into v_due_at, v_finalized_at
  from public.account_deletion_requests
  where user_id = p_user_id
  for update;

  if not found then
    return 'not_found';
  end if;

  -- Uma purga já concluída não volta a ser "falhou": a resposta perdida de uma
  -- chamada bem-sucedida não pode reescrever o estado de uma linha finalizada.
  if v_finalized_at is not null then
    return 'already_purged';
  end if;

  if p_error is not null then
    update public.account_deletion_requests
       set purge_last_error = left(p_error, 500)
     where user_id = p_user_id;
    return 'failed';
  end if;

  -- O prazo é o da tabela aprovada; o chamador não escolhe.
  if v_due_at > now() then
    return 'not_due';
  end if;

  -- Mídias pessoais: as referências saem aqui, os objetos do bucket saem na
  -- rota (única que fala com o Storage). Documentos de verificação nunca
  -- ficaram no schema público.
  delete from private.verification_documents where user_id = p_user_id;

  -- Perfil: o mínimo necessário para atribuir o conteúdo público permanece —
  -- display_name — porque o item 4 do ADR manda o conteúdo continuar atribuído
  -- a ele. Todo o resto do perfil é dado pessoal.
  update public.profiles
     set bio = null,
         consent_version = 0,
         consented_at = null,
         updated_at = now()
   where user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
  delete from public.notifications where recipient_user_id = p_user_id;
  delete from public.dm_read_states where user_id = p_user_id;
  delete from public.dm_blocks
   where blocker_user_id = p_user_id or blocked_user_id = p_user_id;
  delete from public.post_saves where user_id = p_user_id;
  delete from public.post_reactions where user_id = p_user_id;
  delete from public.post_follows where user_id = p_user_id;
  delete from public.listing_saves where user_id = p_user_id;
  delete from public.listing_alerts where owner_user_id = p_user_id;
  delete from public.recommendation_saves where user_id = p_user_id;
  delete from public.user_group_interests where user_id = p_user_id;
  delete from public.event_rsvps where user_id = p_user_id;

  -- Participação sai; posse NÃO é dissolvida (ver rodapé). O trigger
  -- cascade_community_membership_loss recusa remover a linha do dono, e este
  -- caminho não passa por cima dele: a mesma regra vale para a purga.
  delete from public.community_memberships cm
   where cm.user_id = p_user_id
     and not exists (
       select 1 from public.communities c
       where c.id = cm.community_id and c.owner_user_id = p_user_id
     );

  delete from public.group_memberships gm
   where gm.user_id = p_user_id
     and not exists (
       select 1 from public.groups g
       where g.id = gm.group_id and g.owner_user_id = p_user_id
     );

  delete from public.locality_memberships where user_id = p_user_id;

  -- Privilégio de operação morre com a conta; a auditoria da concessão fica.
  update public.operators
     set revoked_at = coalesce(revoked_at, now())
   where auth_user_id = p_user_id
     and revoked_at is null;

  update public.arrival_guide_entries set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports set resolved_by = null where resolved_by = p_user_id;

  -- Convites familiares dos DOIS lados: como convidante (já revogados no
  -- pedido) e como convidado aceito. A linha guarda o digest e o palpite do
  -- e-mail de quem foi convidado — dado do titular, não do produto. Os vínculos
  -- (family_account_links) já saíram no pedido, então a FK de RESTRICT não
  -- segura nada aqui.
  delete from private.family_invitations
   where inviter_user_id = p_user_id or accepted_by_user_id = p_user_id;

  update public.account_deletion_requests
     set finalized_at = now(),
         purge_last_error = null
   where user_id = p_user_id;

  return 'purged';
end;
$$;

revoke all on function public.finalize_account_deletion(uuid, text)
  from public, anon, authenticated;
grant execute on function public.finalize_account_deletion(uuid, text) to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. O job
-- ═══════════════════════════════════════════════════════════════════════════

-- Mesmo desenho do worker do outbox: o banco prepara, o pg_cron agenda e o
-- pg_net entrega os ids para a rota interna, que é quem fala GoTrue e Storage.
create function private.account_deletion_batch_size()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 20::integer;
$$;

-- O relógio da tentativa tem TETO, não desistência. Uma linha que falha cinco
-- vezes continua sendo selecionada (com uma tentativa por dia): desistir em
-- silêncio deixaria a conta banida, oculta e com dado pessoal dentro, contra o
-- prazo que a UI promete. O motivo fica em purge_last_error, na própria linha.
create function private.account_deletion_retry_ceiling()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '1 day';
$$;

create function private.account_deletion_retry_interval()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '1 hour';
$$;

-- Reserva um lote e conta a tentativa na MESMA transação: um cron sobreposto
-- não pega a mesma linha duas vezes (for update skip locked) e uma rota que
-- morra no meio não vira laço infinito.
create function private.account_deletion_claim_due(p_limit integer)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  select array_agg(due.user_id) into v_ids
  from (
    select r.user_id
    from public.account_deletion_requests r
    where r.finalized_at is null
      and r.due_at <= now()
      and (
        r.purge_attempted_at is null
        or r.purge_attempted_at + least(
             private.account_deletion_retry_interval() * power(2, r.purge_attempts),
             private.account_deletion_retry_ceiling()
           ) <= now()
      )
    order by r.due_at asc
    limit greatest(p_limit, 0)
    for update skip locked
  ) as due;

  if v_ids is null then
    return;
  end if;

  update public.account_deletion_requests
     set purge_attempts = purge_attempts + 1,
         purge_attempted_at = now()
   where user_id = any (v_ids);

  return query select unnest(v_ids);
end;
$$;

create function private.account_deletion_dispatch_due()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_endpoint text;
  v_secret text;
  v_ids jsonb;
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'account-deletion-endpoint';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'account-deletion-secret';

  -- Sem os dois segredos do Vault é um no-op: o job pode ser instalado antes
  -- de existir URL de deploy.
  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return 0;
  end if;

  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_ids
  from private.account_deletion_claim_due(private.account_deletion_batch_size()) as id;

  if v_ids = '[]'::jsonb then
    return 0;
  end if;

  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/internal/account-deletion',
    body := jsonb_build_object('user_ids', v_ids),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-account-deletion-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );

  return jsonb_array_length(v_ids);
end;
$$;

revoke all on function private.account_deletion_batch_size() from public;
revoke all on function private.account_deletion_retry_ceiling() from public;
revoke all on function private.account_deletion_retry_interval() from public;
revoke all on function private.account_deletion_claim_due(integer) from public;
revoke all on function private.account_deletion_dispatch_due() from public;

-- Diário, depois do TTL dos documentos de verificação (03:00) e antes do
-- horário comercial.
select cron.schedule(
  'bivaque-account-deletion-purge',
  '0 4 * * *',
  'select private.account_deletion_dispatch_due()'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Rodapé: o que esta migração NÃO decide
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A purga apaga dado pessoal, preferência e participação. Ela não dissolve
-- posse nem encerra superfície operacional, porque isso é decisão de produto
-- que o ADR não tomou — e inventar aqui seria pior do que registrar:
--
--   * communities.owner_user_id / groups.owner_user_id: a conta que possui
--     comunidade ou grupo continua sendo a dona depois da purga. O produto já
--     tem a regra ("transfer community ownership before removing the owner"),
--     disparada pelo trigger; falta saber para quem transferir.
--   * provider_accounts e listings ativos: vitrine e anúncio de quem não
--     existe mais seguem no ar.
--   * service_requests abertos com a conta como parte: seguem abertos.
--
-- E três coisas que o ADR não decide e que ficam registradas em vez de
-- silenciadas:
--
--   * DMs (dm_conversations/dm_messages): o histórico do titular sobrevive
--     inteiro, porque a outra ponta é terceiro e a conversa não é "conteúdo
--     público" do item 4. A tabela jurídica não tem linha para DM; até ela ter,
--     apagar seria decisão inventada. O envio novo para a conta que sai já é
--     recusado (seção 3).
--   * logs de acesso: a tabela jurídica manda guardar 6 meses e purgar depois.
--     A guarda é default do GoTrue; a PURGA depois do prazo não existe em
--     código nenhum — nem aqui. A UI declara só a guarda.
--   * janela do JWT: durante até jwt_expiry (3600s) um access token antigo
--     ainda é aceito pelo Data API. O veto de publicação cobre posts,
--     comentários, reações, anúncios, denúncias, salvos e conversa nova; as
--     superfícies restantes (preferências, RSVP, edição de perfil, pertencimento
--     a comunidade/grupo) continuam aceitando o token até ele expirar. Fechar
--     tudo exige o veto em todas as policies de escrita de authenticated — é
--     mecânico, mas é outro lote, com a matriz de autorização atualizada.
--
-- Cada um desses é uma pergunta para o dono do produto, com card próprio no
-- board (RECON-052-FOLLOWUP). A purga não os resolve sozinha, e "resolver"
-- apagando conteúdo de terceiro contradiria o item 4 do ADR.
