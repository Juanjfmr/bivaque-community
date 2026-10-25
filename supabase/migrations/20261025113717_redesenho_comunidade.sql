-- ============================================================================
-- RED-003 — Redesenho da Comunidade e saída da vila
--
-- equivalente a 20261025100000 (faixa reservada pelo ADR-20261024 §7)
-- Criada pela CLI 2.107.0 em 25/10/2026 11:37:17; a CLI emitiu uma data
-- diferente da faixa reservada, então o nome gerado foi CONSERVADO e a
-- equivalência fica registrada em docs/agents/redesenho/R3-evidencias.md.
--
-- Fonte: ADR-20261024, docs/agents/redesenho/R2-comum.md, R2-decisoes.md e as
-- quatro matrizes (grupos, publicacoes, evento-pergunta, vila-fundacao),
-- conferidas contra o retrato R1 (docs/agents/redesenho/R1-retrato.md) e o
-- estado final do banco (docs/agents/redesenho/schema-dump.sql).
--
-- Uma transação só. Nenhum DROP por padrão de nome; nenhum CASCADE cego.
-- Os nomes de tabela ficam; a vila sai na mesma leva.
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- 1. POLICIES DO DOMÍNIO E DA VILA — drop nome a nome
-- ----------------------------------------------------------------------------
-- vila
drop policy if exists community_images_delete_owner on storage.objects;
drop policy if exists community_images_select_reachable on storage.objects;
drop policy if exists community_join_reasons_select_author_or_moderator on public.community_join_reasons;
drop policy if exists community_memberships_select_comember on public.community_memberships;
drop policy if exists communities_select_authenticated on public.communities;
-- perfil lia vila
drop policy if exists profiles_select_community_comember on public.profiles;
-- grupos
drop policy if exists groups_select_locality_member on public.groups;
drop policy if exists groups_insert_verified_member on public.groups;
drop policy if exists groups_update_owner on public.groups;
drop policy if exists groups_delete_owner on public.groups;
-- participacao em grupo
drop policy if exists group_memberships_select on public.group_memberships;
drop policy if exists group_memberships_delete_moderator on public.group_memberships;
drop policy if exists group_memberships_delete_self on public.group_memberships;
-- motivo do pedido
drop policy if exists group_join_reasons_select_author_or_moderator on public.group_join_reasons;
-- publicacoes
drop policy if exists posts_select_locality_member on public.posts;
drop policy if exists posts_insert_locality_member on public.posts;
drop policy if exists posts_update_own on public.posts;
drop policy if exists posts_delete_own on public.posts;
drop policy if exists comments_select_via_post on public.comments;
drop policy if exists comments_insert_member on public.comments;
drop policy if exists comments_update_own on public.comments;
drop policy if exists comments_delete_own on public.comments;
drop policy if exists post_reactions_select_locality_member on public.post_reactions;
drop policy if exists post_reactions_insert_locality_member on public.post_reactions;
drop policy if exists post_reactions_insert_self on public.post_reactions;
drop policy if exists post_reactions_delete_own on public.post_reactions;
drop policy if exists post_saves_select_own on public.post_saves;
drop policy if exists post_saves_insert_own on public.post_saves;
drop policy if exists post_saves_delete_own on public.post_saves;
drop policy if exists post_follows_select_own on public.post_follows;
drop policy if exists post_follows_insert_own on public.post_follows;
drop policy if exists post_follows_delete_own on public.post_follows;
-- eventos e confirmacoes
drop policy if exists events_select_locality_member on public.events;
drop policy if exists events_insert_verified_member on public.events;
drop policy if exists events_update_organizer on public.events;
drop policy if exists event_rsvps_select_locality_member on public.event_rsvps;
drop policy if exists event_rsvps_insert_self on public.event_rsvps;
drop policy if exists event_rsvps_update_self on public.event_rsvps;
drop policy if exists event_rsvps_delete_self on public.event_rsvps;
-- perguntas de indicacao
drop policy if exists recommendation_requests_select_locality on public.recommendation_requests;
drop policy if exists recommendation_requests_insert_locality on public.recommendation_requests;
drop policy if exists recommendation_requests_update_own on public.recommendation_requests;
drop policy if exists recommendation_requests_delete_own on public.recommendation_requests;
-- fundacao que perde a vila
drop policy if exists listings_insert_owner on public.listings;
drop policy if exists listings_update_owner on public.listings;
drop policy if exists provider_reach_insert_owner_free_community on public.provider_reach;
drop policy if exists provider_reach_update_owner_free_community on public.provider_reach;
drop policy if exists provider_reach_delete_owner_free_community on public.provider_reach;
drop policy if exists event_photos_select_scoped on storage.objects;

-- ----------------------------------------------------------------------------
-- 2. TRIGGERS — drop nome a nome
-- ----------------------------------------------------------------------------
drop trigger if exists block_group_community_change_trigger on public.groups;
drop trigger if exists block_soft_delete_groups on public.groups;
drop trigger if exists enforce_group_community_membership_trigger on public.group_memberships;
-- gatilhos das tabelas de vila: saem antes das funções que os servem
drop trigger if exists cascade_community_membership_downgrade_trigger on public.community_memberships;
drop trigger if exists cascade_community_membership_loss_trigger on public.community_memberships;
-- E3 (R2-decisoes): o organizador confirma presença e conta uma vez, sem se
-- notificar. O gatilho que proibia a própria confirmação sai nesta leva.
drop trigger if exists event_rsvps_block_self_trigger on public.event_rsvps;

-- ----------------------------------------------------------------------------
-- 3. FUNÇÕES — dependentes primeiro (sem CASCADE), depois a vila
-- ----------------------------------------------------------------------------
-- (a) Dependência de política: funções de assinatura INALTERADA são substituídas
--     por CREATE OR REPLACE (não DROP), para não derrubar as policies que as
--     usam. Aqui entram com um corpo neutro só para soltar a dependência de
--     colunas/types que mudam; o corpo final volta depois do ajuste de colunas.
create or replace function private.can_access_post(p_post_id uuid)
    returns boolean language sql stable security definer set search_path to ''
    as $$ select false; $$;
create or replace function private.can_access_event(p_event_id uuid)
    returns boolean language sql stable security definer set search_path to ''
    as $$ select false; $$;
create or replace function private.can_read_listing(p_listing_id uuid)
    returns boolean language sql stable security definer set search_path to ''
    as $$ select false; $$;
create or replace function private.can_user_read_listing(p_user_id uuid, p_listing_id uuid)
    returns boolean language sql stable security definer set search_path to ''
    as $$ select false; $$;
create or replace function private.can_see_provider(p_provider_id uuid)
    returns boolean language sql stable security definer set search_path to ''
    as $$ select false; $$;
create or replace function private.dm_context_valid(
  p_a uuid, p_b uuid, p_type public.dm_context_type, p_context_id uuid)
    returns boolean language sql stable security definer set search_path to ''
    as $$ select false; $$;
create or replace function public.get_profile_neighborhood(p_user_id uuid)
    returns text language sql stable security definer set search_path to ''
    as $$ select null::text; $$;
create or replace function public.list_group_activity(p_locality_id uuid)
    returns table(group_id uuid, recent_post_count bigint)
    language sql stable security definer set search_path to ''
    as $$ select null::uuid, 0::bigint where false; $$;

-- (b) assinaturas que mudam, ou returns/params que dependem de enum recriado: DROP
drop function if exists private.can_write_post_to(uuid, uuid, uuid);
drop function if exists private.can_access_post_scope(uuid, uuid, uuid);
drop function if exists public.feed_following();
drop function if exists public.feed_group(uuid, text);
drop function if exists public.feed_posts(uuid, text);
drop function if exists public.profile_posts_for(uuid, uuid);
drop function if exists public.list_available_groups_for_interests(uuid, uuid);
drop function if exists public.suggest_groups_for_user(uuid, uuid);
drop function if exists public.search_providers(public.provider_category, uuid, text);
drop function if exists public.create_group(text, public.group_visibility, uuid, text, text);
drop function if exists public.create_provider_invitation(uuid, text, text);
drop function if exists public.read_provider_invitation(text);

-- (b) funções exclusivas da vila
drop function if exists private.cascade_community_membership_downgrade();
drop function if exists private.cascade_community_membership_loss();
drop function if exists private.enforce_group_community_membership();
drop function if exists private.is_community_image_owner(text);
drop function if exists private.is_community_member(uuid);
drop function if exists private.block_group_community_change();
drop function if exists public.accept_community_invitation(bytea, uuid);
drop function if exists public.add_community_moderator(uuid, uuid, uuid);
drop function if exists public.approve_community_member(uuid, uuid, uuid);
drop function if exists public.cancel_community_request(uuid);
drop function if exists public.create_community(text, text, uuid, uuid);
drop function if exists public.create_community_invitation(uuid, uuid, bytea, timestamp with time zone);
drop function if exists public.create_group_in_community(text, text, public.group_visibility, uuid);
drop function if exists public.feed_community(uuid, text, integer, integer);
drop function if exists public.is_community_member(uuid, uuid);
drop function if exists public.is_current_user_community_moderator(uuid, uuid);
drop function if exists public.leave_community(uuid);
drop function if exists public.list_community_pending_arrivals(uuid, uuid, integer);
drop function if exists public.list_community_providers(uuid, uuid, integer);
drop function if exists public.list_pending_community_invitations(uuid, uuid);
drop function if exists public.remove_community_member(uuid, uuid, uuid);
drop function if exists public.remove_community_moderator(uuid, uuid, uuid);
drop function if exists public.request_community_membership(uuid, text);
drop function if exists public.revoke_community_invitation(uuid, uuid);
drop function if exists public.set_community_image(uuid, text, text, uuid);
drop function if exists public.transfer_community_ownership(uuid, uuid);
-- exclusão física do grupo deixa de existir; encerrar/reabrir entram abaixo
drop function if exists public.delete_group(uuid);
-- R1-232/R1-428 eram "mantida"; E3 supersede: sem gatilho de auto-confirmação.
drop function if exists private.event_rsvps_block_self();

-- ----------------------------------------------------------------------------
-- 4. COLUNAS E CONSTRAINTS — a vila sai; entra o estado do grupo
-- ----------------------------------------------------------------------------
-- groups
alter table public.groups drop constraint if exists groups_community_id_fkey;
alter table public.groups drop constraint if exists groups_community_same_locality;
drop index if exists public.groups_community_idx;
alter table public.groups drop column if exists community_id;
alter table public.groups drop column if exists is_deleted;
alter table public.groups drop constraint if exists groups_name_check;
alter table public.groups add constraint groups_name_check check (char_length(name) between 3 and 60);
alter table public.groups drop constraint if exists groups_description_check;
alter table public.groups add constraint groups_description_check
  check (description is null or char_length(description) between 1 and 300);
-- visibilidade passa de public/private a open/closed
alter table public.groups alter column visibility drop default;
alter table public.groups alter column visibility type text using visibility::text;
drop type if exists public.group_visibility;
create type public.group_visibility as enum ('open', 'closed');
alter table public.groups alter column visibility type public.group_visibility
  using (case visibility when 'public' then 'open' when 'private' then 'closed' else 'open' end)::public.group_visibility;
alter table public.groups alter column visibility set default 'open';
-- estado de ciclo de vida (encerrado = archived)
create type public.group_status as enum ('active', 'archived');
alter table public.groups add column status public.group_status not null default 'active';

-- posts
alter table public.posts drop constraint if exists posts_community_id_fkey;
alter table public.posts drop constraint if exists posts_community_same_locality;
drop index if exists public.posts_community_idx;
alter table public.posts drop constraint if exists posts_single_scope;
alter table public.posts drop column if exists community_id;
alter table public.posts drop constraint if exists post_poll_requires_poll_type;
alter table public.posts drop column if exists poll_options;
alter table public.posts alter column group_id set not null;
-- publicacao pertence a um grupo e a cidade da publicacao e a do grupo
alter table public.posts add constraint posts_single_scope check (group_id is not null);
-- CHECKs que citam post_type saem antes de o enum mudar e voltam depois
alter table public.posts drop constraint if exists post_link_requires_link_type;
alter table public.posts drop constraint if exists post_link_type_requires_url;
alter table public.posts drop constraint if exists post_photo_requires_photo_type;
alter table public.posts alter column post_type type text using post_type::text;
drop type if exists public.post_type;
create type public.post_type as enum ('text', 'photo', 'link');
alter table public.posts alter column post_type type public.post_type
  using (case post_type when 'poll' then 'text' else post_type end)::public.post_type;
alter table public.posts add constraint post_link_requires_link_type
  check (link_url is null or post_type = 'link');
alter table public.posts add constraint post_link_type_requires_url
  check (post_type <> 'link' or link_url is not null);
alter table public.posts add constraint post_photo_requires_photo_type
  check (photo_path is null or post_type = 'photo');

-- events
alter table public.events drop constraint if exists events_community_id_fkey;
alter table public.events drop constraint if exists events_community_same_locality;
drop index if exists public.events_community_idx;
alter table public.events drop constraint if exists events_single_scope;
alter table public.events drop column if exists community_id;

-- listings
alter table public.listings drop constraint if exists listings_community_id_fkey;
alter table public.listings drop column if exists community_id;
alter table public.listings drop constraint if exists listings_audience_exclusive;
alter table public.listings add constraint listings_audience_exclusive
  check (status = 'draft' or locality_id is not null);

-- provider_accounts
alter table public.provider_accounts drop constraint if exists provider_accounts_community_id_fkey;
drop index if exists public.provider_accounts_community_idx;
alter table public.provider_accounts drop column if exists community_id;

-- private.provider_invitations
alter table private.provider_invitations drop constraint if exists provider_invitations_community_id_fkey;
alter table private.provider_invitations drop column if exists community_id;

-- provider_reach: alcance so de localidade
delete from public.provider_reach where scope_type::text = 'community';
alter table public.provider_reach alter column scope_type type text using scope_type::text;
drop type if exists public.provider_reach_scope;
create type public.provider_reach_scope as enum ('locality');
alter table public.provider_reach alter column scope_type type public.provider_reach_scope
  using scope_type::public.provider_reach_scope;

-- recommendation_requests: origem dupla permitida; nenhuma origem proibida
alter table public.recommendation_requests drop constraint if exists recommendation_origin_scope;
alter table public.recommendation_requests add constraint recommendation_origin_scope
  check (num_nonnulls(locality_id, group_id) >= 1);

-- group_membership_status permanece (pending/approved) — mudanca nominal R1-201

-- ----------------------------------------------------------------------------
-- 5. hidden_posts (D3) — vinculo pessoal de ocultacao
-- ----------------------------------------------------------------------------
create table if not exists public.hidden_posts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  hidden_at timestamp with time zone not null default now(),
  primary key (user_id, post_id)
);
alter table public.hidden_posts enable row level security;
alter table public.hidden_posts force row level security;
grant select, insert, delete on table public.hidden_posts to authenticated;
grant select, references, trigger, truncate, maintain on table public.hidden_posts to service_role;

-- ----------------------------------------------------------------------------
-- 6. A VILA SAI — tabelas, enums e bucket
-- ----------------------------------------------------------------------------
drop table if exists public.community_join_reasons;
drop table if exists public.community_invitations;
drop table if exists public.community_memberships;
drop table if exists public.communities;
drop type if exists public.community_invitation_status;
drop type if exists public.community_membership_role;
drop type if exists public.community_membership_status;
-- storage protege delete direto e as tabelas são de supabase_storage_admin;
-- replica desliga o gatilho só nesta transação
set local session_replication_role = replica;
delete from storage.buckets where id = 'community-images';
set local session_replication_role = default;

-- ----------------------------------------------------------------------------
-- 7. CONTRATO DO BLOQUEIO (D1/D2 implementam o corpo depois)
-- ----------------------------------------------------------------------------
create or replace function private.block_allows(p_actor uuid, p_author uuid, p_action text)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select true;
$$;
revoke all on function private.block_allows(uuid, uuid, text) from public;
grant execute on function private.block_allows(uuid, uuid, text) to authenticated;
grant execute on function private.block_allows(uuid, uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 8. FUNÇÕES DO DOMÍNIO — reescritas a partir da matriz
-- ----------------------------------------------------------------------------
-- acesso a conteudo de grupo: membro ativo, ou cidade em grupo Aberto ativo
create or replace function private.can_read_group_content_for(p_group_id uuid, p_user_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and (
        exists (
          select 1 from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = p_user_id
            and gm.status = 'approved'
        )
        or (
          g.status = 'active'
          and g.visibility = 'open'
          and exists (
            select 1 from public.locality_memberships lm
            where lm.locality_id = g.locality_id
              and lm.user_id = p_user_id
          )
        )
      )
  );
$$;
revoke all on function private.can_read_group_content_for(uuid, uuid) from public;
grant execute on function private.can_read_group_content_for(uuid, uuid) to authenticated;
grant execute on function private.can_read_group_content_for(uuid, uuid) to service_role;

create or replace function private.can_read_group_content(p_group_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select private.can_read_group_content_for(p_group_id, (select auth.uid()));
$$;
revoke all on function private.can_read_group_content(uuid) from public;
grant execute on function private.can_read_group_content(uuid) to authenticated;

-- Conta suspensa ou em exclusão nunca ganha acesso: só pode retirar permissão
-- (R2-decisoes G3/G4/E6/F11).
create or replace function private.current_account_can_act()
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select (select auth.uid()) is not null
    and not public.is_account_suspended((select auth.uid()))
    and not private.account_deletion_requested((select auth.uid()));
$$;
revoke all on function private.current_account_can_act() from public;
grant execute on function private.current_account_can_act() to authenticated;

-- Evento aceita interação: existe, está upcoming e o grupo (se houver) não está
-- encerrado. Grupo Encerrado é só leitura, sem RSVP novo.
create or replace function private.event_accepts_interaction(p_event_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.status = 'upcoming'
      and (
        e.group_id is null
        or exists (select 1 from public.groups g where g.id = e.group_id and g.status = 'active')
      )
  );
$$;
revoke all on function private.event_accepts_interaction(uuid) from public;
grant execute on function private.event_accepts_interaction(uuid) to authenticated;

create or replace function private.can_access_post_scope(p_locality_id uuid, p_group_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select
    private.is_locality_member(p_locality_id)
    and (p_group_id is null or private.can_read_group_content(p_group_id));
$$;
revoke all on function private.can_access_post_scope(uuid, uuid) from public;
grant execute on function private.can_access_post_scope(uuid, uuid) to authenticated;

-- Escrever em publicação exige participação APROVADA no grupo, mesmo Aberto:
-- a cidade lê o Aberto, mas só membros publicam/comentam/reagem (R2 §2).
create or replace function private.can_write_post_to(p_locality_id uuid, p_group_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select
    private.is_active_locality_member(p_locality_id)
    and exists (
      select 1
      from public.groups g
      where g.id = p_group_id
        and g.status = 'active'
        and g.locality_id = p_locality_id
        and exists (
          select 1 from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
    );
$$;
revoke all on function private.can_write_post_to(uuid, uuid) from public;
grant execute on function private.can_write_post_to(uuid, uuid) to authenticated;

create or replace function private.can_access_post(p_post_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and not p.is_deleted
      and private.can_read_group_content(p.group_id)
  );
$$;
revoke all on function private.can_access_post(uuid) from public;
grant execute on function private.can_access_post(uuid) to authenticated;

create or replace function private.post_accepts_interaction(p_post_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
    from public.posts p
    join public.groups g on g.id = p.group_id
    where p.id = p_post_id
      and not p.is_deleted
      and g.status = 'active'
      and not exists (
        select 1 from public.account_deletion_requests r where r.user_id = p.user_id
      )
  );
$$;
revoke all on function private.post_accepts_interaction(uuid) from public;
grant execute on function private.post_accepts_interaction(uuid) to authenticated;

create or replace function private.can_access_event(p_event_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and (
        (e.group_id is null and private.is_locality_member(e.locality_id))
        or (e.group_id is not null and private.can_read_group_content(e.group_id))
      )
  );
$$;
revoke all on function private.can_access_event(uuid) from public;
grant execute on function private.can_access_event(uuid) to authenticated;

create or replace function private.can_receive_invite_to_event(p_event_id uuid, p_user_id uuid)
    returns boolean
    language plpgsql
    stable
    security definer
    set search_path to ''
    as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event from public.events e where e.id = p_event_id;
  if not found then
    return false;
  end if;

  if not exists (
    select 1 from public.locality_memberships lm
    where lm.locality_id = v_event.locality_id
      and lm.user_id = p_user_id
  ) then
    return false;
  end if;

  if v_event.group_id is not null then
    if not private.can_read_group_content_for(v_event.group_id, p_user_id) then
      return false;
    end if;
  end if;

  return true;
end;
$$;
revoke all on function private.can_receive_invite_to_event(uuid, uuid) from public;
grant execute on function private.can_receive_invite_to_event(uuid, uuid) to authenticated;

create or replace function private.can_read_listing(p_listing_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and (
        l.owner_user_id = (select auth.uid())
        or (
          l.status = 'active'
          and l.locality_id is not null
          and (
            exists (
              select 1 from public.locality_memberships lm
              where lm.locality_id = l.locality_id
                and lm.user_id = (select auth.uid())
            )
            or private.has_current_locality()
          )
        )
      )
  );
$$;
revoke all on function private.can_read_listing(uuid) from public;
grant execute on function private.can_read_listing(uuid) to authenticated;
grant execute on function private.can_read_listing(uuid) to service_role;

create or replace function private.can_user_read_listing(p_user_id uuid, p_listing_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and (
        l.owner_user_id = p_user_id
        or (
          l.status = 'active'
          and l.locality_id is not null
          and exists (
            select 1 from public.locality_memberships lm
            where lm.locality_id = l.locality_id
              and lm.user_id = p_user_id
          )
        )
      )
  );
$$;
revoke all on function private.can_user_read_listing(uuid, uuid) from public;
grant execute on function private.can_user_read_listing(uuid, uuid) to authenticated;
grant execute on function private.can_user_read_listing(uuid, uuid) to service_role;

create or replace function private.can_see_provider(p_provider_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select exists (
    select 1
      from public.provider_profiles p
     where p.id = p_provider_id
       and p.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
      from public.provider_profiles p
      join public.provider_reach r
        on r.provider_id = p.id
       and r.active
     where p.id = p_provider_id
       and p.is_deleted = false
       and r.scope_type = 'locality'
       and (
         (
           exists (
             select 1 from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
                and pa.revoked_at is null
           )
           and exists (
             select 1 from public.locality_memberships lm
              where lm.locality_id = r.scope_id
                and lm.user_id = (select auth.uid())
           )
         )
         or (
           not exists (
             select 1 from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
           )
           and r.source = 'free'
           and exists (
             select 1 from public.locality_memberships owner_membership
              where owner_membership.user_id = p.owner_user_id
                and owner_membership.locality_id = r.scope_id
                and owner_membership.kind = 'current'
                and owner_membership.access = 'active'
           )
           and exists (
             select 1 from public.locality_memberships viewer_membership
              where viewer_membership.user_id = (select auth.uid())
                and viewer_membership.locality_id = r.scope_id
                and viewer_membership.kind = 'current'
                and viewer_membership.access = 'active'
           )
         )
       )
  );
$$;
revoke all on function private.can_see_provider(uuid) from public;
grant execute on function private.can_see_provider(uuid) to authenticated;
grant execute on function private.can_see_provider(uuid) to service_role;

create or replace function private.listing_audience_immutable()
    returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  if new.locality_id is distinct from old.locality_id
     or new.kind is distinct from old.kind then
    raise exception 'listing audience and kind are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_group_join_attempt_limit()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if new.status = 'pending' then
    if exists (
      select 1 from public.groups
      where id = new.group_id and visibility = 'closed'
    ) then
      if not private.consume_group_join_attempt(new.group_id, new.user_id) then
        raise exception 'maximum 3 join requests per group in 30 days'
          using errcode = '54000';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- encerrar/reabrir: estado do grupo, sem exclusão física
create or replace function public.archive_group(p_group_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can archive the group' using errcode = '42501';
  end if;

  update public.groups
     set status = 'archived',
         pinned_post_id = null
   where id = p_group_id;

  if not found then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  delete from public.group_join_reasons where group_id = p_group_id;
  delete from public.group_memberships where group_id = p_group_id and status = 'pending';
end;
$$;
revoke all on function public.archive_group(uuid) from public;
grant execute on function public.archive_group(uuid) to authenticated;

create or replace function public.reopen_group(p_group_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can reopen the group' using errcode = '42501';
  end if;

  update public.groups set status = 'active' where id = p_group_id;
  if not found then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.reopen_group(uuid) from public;
grant execute on function public.reopen_group(uuid) to authenticated;

create or replace function public.update_group(
  p_group_id uuid,
  p_name text,
  p_description text,
  p_rules text,
  p_visibility public.group_visibility
)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can edit the group' using errcode = '42501';
  end if;

  update public.groups
     set name = p_name,
         description = nullif(btrim(coalesce(p_description, '')), ''),
         rules = nullif(btrim(coalesce(p_rules, '')), ''),
         visibility = p_visibility
   where id = p_group_id
     and status = 'active';

  if not found then
    raise exception 'group not found or archived' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.update_group(uuid, text, text, text, public.group_visibility) from public;
grant execute on function public.update_group(uuid, text, text, text, public.group_visibility) to authenticated;

create or replace function public.update_guard_group_direct_update()
    returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  if current_user = 'authenticated' then
    if new.status is distinct from old.status
       or new.visibility is distinct from old.visibility
       or new.locality_id is distinct from old.locality_id
       or new.created_by is distinct from old.created_by
       or new.owner_user_id is distinct from old.owner_user_id
       or new.pinned_post_id is distinct from old.pinned_post_id then
      raise exception 'group columns change only through RPCs' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_group_direct_update
  before update on public.groups
  for each row execute function public.update_guard_group_direct_update();

-- ----------------------------------------------------------------------------
-- 9. RPCs DO DOMÍNIO (reconstruídas a partir do estado atual, sem a vila)
-- ----------------------------------------------------------------------------
create or replace function public.create_group(
  p_name text,
  p_visibility public.group_visibility,
  p_locality_id uuid,
  p_description text default null,
  p_rules text default null
)
    returns uuid
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_group_id uuid;
begin
  if not private.is_verified_locality_member(p_locality_id) then
    raise exception 'only verified locality members can create groups' using errcode = '42501';
  end if;

  if public.is_account_suspended((select auth.uid()))
     or private.account_deletion_requested((select auth.uid())) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  insert into public.groups (
    name, description, rules, visibility, locality_id, created_by, owner_user_id
  )
  values (
    p_name,
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_rules, '')), ''),
    p_visibility,
    p_locality_id,
    (select auth.uid()),
    (select auth.uid())
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, (select auth.uid()), 'owner', 'approved');

  return v_group_id;
end;
$$;
revoke all on function public.create_group(text, public.group_visibility, uuid, text, text) from public;
grant execute on function public.create_group(text, public.group_visibility, uuid, text, text) to authenticated;

create or replace function public.join_group(p_group_id uuid, p_reason text default null)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_locality_id uuid;
  v_visibility public.group_visibility;
  v_status public.group_status;
  v_me uuid := (select auth.uid());
  v_reason text;
begin
  select locality_id, visibility, status
  into v_locality_id, v_visibility, v_status
  from public.groups
  where id = p_group_id;

  if not found then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if v_status = 'archived' then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if public.is_account_suspended(v_me)
     or private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'must be a locality member to join groups' using errcode = '42501';
  end if;

  if v_visibility = 'open' then
    insert into public.group_memberships (group_id, user_id, role, status)
    values (p_group_id, v_me, 'member', 'approved')
    on conflict (group_id, user_id) do nothing;
    return;
  end if;

  -- Grupo Fechado. Um pedido já aberto ou participação aprovada não consome tentativa.
  if exists (
    select 1 from public.group_memberships
    where group_id = p_group_id and user_id = v_me
  ) then
    return;
  end if;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (p_group_id, v_me, 'member', 'pending');

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is not null then
    insert into public.group_join_reasons (group_id, user_id, reason)
    values (p_group_id, v_me, left(v_reason, 300));
  end if;
end;
$$;
revoke all on function public.join_group(uuid, text) from public;
grant execute on function public.join_group(uuid, text) to authenticated;

create or replace function public.approve_group_member(p_group_id uuid, p_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id and status = 'active') then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can approve members' using errcode = '42501';
  end if;

  update public.group_memberships
     set status = 'approved'
   where group_id = p_group_id
     and user_id = p_user_id
     and status = 'pending';

  if not found then
    raise exception 'pending membership not found for this user' using errcode = 'P0002';
  end if;

  delete from public.group_join_reasons
   where group_id = p_group_id and user_id = p_user_id;
end;
$$;
revoke all on function public.approve_group_member(uuid, uuid) from public;
grant execute on function public.approve_group_member(uuid, uuid) to authenticated;

create or replace function public.add_group_moderator(p_group_id uuid, p_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id and status = 'active') then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can add moderators' using errcode = '42501';
  end if;

  update public.group_memberships
     set role = 'moderator'
   where group_id = p_group_id
     and user_id = p_user_id
     and status = 'approved'
     and role = 'member';

  if not found then
    raise exception 'user is not an approved member of this group' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.add_group_moderator(uuid, uuid) from public;
grant execute on function public.add_group_moderator(uuid, uuid) to authenticated;

create or replace function public.remove_group_moderator(p_group_id uuid, p_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id and status = 'active') then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can remove moderators' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.group_memberships
    where group_id = p_group_id and user_id = p_user_id and role = 'owner'
  ) then
    raise exception 'cannot demote the group owner' using errcode = '42501';
  end if;

  update public.group_memberships
     set role = 'member'
   where group_id = p_group_id
     and user_id = p_user_id
     and role = 'moderator';

  if not found then
    raise exception 'user is not a moderator of this group' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.remove_group_moderator(uuid, uuid) from public;
grant execute on function public.remove_group_moderator(uuid, uuid) to authenticated;

create or replace function public.cancel_group_request(p_group_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  delete from public.group_join_reasons
   where group_id = p_group_id and user_id = (select auth.uid());

  delete from public.group_memberships
   where group_id = p_group_id
     and user_id = (select auth.uid())
     and status = 'pending';

  if not found then
    raise exception 'no pending request to cancel' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.cancel_group_request(uuid) from public;
grant execute on function public.cancel_group_request(uuid) to authenticated;

create or replace function public.reject_group_member(p_group_id uuid, p_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id and status = 'active') then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can reject requests' using errcode = '42501';
  end if;

  delete from public.group_join_reasons
   where group_id = p_group_id and user_id = p_user_id;

  delete from public.group_memberships
   where group_id = p_group_id
     and user_id = p_user_id
     and status = 'pending';

  if not found then
    raise exception 'pending membership not found for this user' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.reject_group_member(uuid, uuid) from public;
grant execute on function public.reject_group_member(uuid, uuid) to authenticated;

create or replace function public.remove_group_member(p_group_id uuid, p_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id and status = 'active') then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can remove members' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.group_memberships
    where group_id = p_group_id and user_id = p_user_id and role = 'owner'
  ) then
    raise exception 'cannot remove the group owner' using errcode = '42501';
  end if;

  delete from public.group_join_reasons
   where group_id = p_group_id and user_id = p_user_id;

  -- Quem perde o vínculo sai das próprias confirmações de eventos do grupo e
  -- deixa de receber lembretes (R2-matriz-evento-pergunta E2).
  delete from public.event_rsvps r
   using public.events e
   where r.event_id = e.id
     and e.group_id = p_group_id
     and r.user_id = p_user_id;

  delete from public.group_memberships
   where group_id = p_group_id and user_id = p_user_id;

  if not found then
    raise exception 'membership not found for this user' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

create or replace function public.leave_group(p_group_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.group_memberships
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role = 'owner'
  ) then
    raise exception 'transfer ownership before leaving the group' using errcode = '42501';
  end if;

  delete from public.group_join_reasons
   where group_id = p_group_id and user_id = (select auth.uid());

  -- Sair corta a leitura de conteúdo privado: as próprias confirmações de
  -- eventos do grupo saem, e os lembretes deixam de alcançar a pessoa (E2).
  delete from public.event_rsvps r
   using public.events e
   where r.event_id = e.id
     and e.group_id = p_group_id
     and r.user_id = (select auth.uid());

  delete from public.group_memberships
   where group_id = p_group_id and user_id = (select auth.uid());

  if not found then
    raise exception 'membership not found for this user' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;

-- RPCs administrativas restantes: conta ativa, grupo ativo, papel conferido.
create or replace function public.set_group_rules(p_group_id uuid, p_rules text)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can edit the rules' using errcode = '42501';
  end if;

  update public.groups
     set rules = nullif(btrim(coalesce(p_rules, '')), '')
   where id = p_group_id and status = 'active';

  if not found then
    raise exception 'group not found or archived' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.set_group_rules(uuid, text) from public;
grant execute on function public.set_group_rules(uuid, text) to authenticated;

create or replace function public.set_group_notify_level(p_group_id uuid, p_level public.group_notify_level)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  update public.group_memberships
     set notify_level = p_level
   where group_id = p_group_id
     and user_id = (select auth.uid())
     and status = 'approved';

  if not found then
    raise exception 'no active membership for this user' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.set_group_notify_level(uuid, public.group_notify_level) from public;
grant execute on function public.set_group_notify_level(uuid, public.group_notify_level) to authenticated;

create or replace function public.transfer_group_ownership(p_group_id uuid, p_new_owner_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_me uuid := (select auth.uid());
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id and status = 'active') then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can transfer ownership' using errcode = '42501';
  end if;

  if p_new_owner_user_id = v_me then
    raise exception 'already the group owner' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.group_memberships
    where group_id = p_group_id
      and user_id = p_new_owner_user_id
      and status = 'approved'
  ) then
    raise exception 'new owner must be an approved member' using errcode = '42501';
  end if;

  update public.group_memberships
     set role = 'member'
   where group_id = p_group_id and user_id = v_me and role = 'owner';

  update public.group_memberships
     set role = 'owner'
   where group_id = p_group_id and user_id = p_new_owner_user_id;

  update public.groups
     set owner_user_id = p_new_owner_user_id
   where id = p_group_id;
end;
$$;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;

create or replace function public.pin_group_post(p_group_id uuid, p_post_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can pin publications' using errcode = '42501';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id and status = 'active') then
    raise exception 'group is archived' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.posts
    where id = p_post_id and group_id = p_group_id and is_deleted = false
  ) then
    raise exception 'publication is not an active publication of this group' using errcode = 'P0002';
  end if;

  update public.groups set pinned_post_id = p_post_id where id = p_group_id;
end;
$$;
revoke all on function public.pin_group_post(uuid, uuid) from public;
grant execute on function public.pin_group_post(uuid, uuid) to authenticated;

create or replace function public.unpin_group_post(p_group_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if not private.current_account_can_act() then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can unpin publications' using errcode = '42501';
  end if;

  update public.groups set pinned_post_id = null where id = p_group_id;
  if not found then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.unpin_group_post(uuid) from public;
grant execute on function public.unpin_group_post(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 9b. IMUTABILIDADE DIRETA — escopo de evento, publicação e comentário
-- ----------------------------------------------------------------------------
create or replace function private.guard_event_scope_immutable()
    returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  if current_user = 'authenticated' then
    if new.organizer_id is distinct from old.organizer_id
       or new.locality_id is distinct from old.locality_id
       or new.group_id is distinct from old.group_id
       or new.status is distinct from old.status
       or new.created_at is distinct from old.created_at
       or new.recurrence_type is distinct from old.recurrence_type
       or new.recurrence_weekday is distinct from old.recurrence_weekday
       or new.recurrence_ordinal is distinct from old.recurrence_ordinal
       or new.recurrence_day_of_month is distinct from old.recurrence_day_of_month
       or new.last_reminder_sent_for is distinct from old.last_reminder_sent_for then
      raise exception 'event scope and state change only through authorized flows'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_event_scope_immutable
  before update on public.events
  for each row execute function private.guard_event_scope_immutable();

create or replace function private.guard_post_immutable()
    returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  if current_user = 'authenticated' then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.group_id is distinct from old.group_id
       or new.locality_id is distinct from old.locality_id
       or new.post_type is distinct from old.post_type
       or new.created_at is distinct from old.created_at then
      raise exception 'publication identity and scope are immutable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_post_immutable
  before update on public.posts
  for each row execute function private.guard_post_immutable();

create or replace function private.guard_comment_immutable()
    returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  if current_user = 'authenticated' then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.post_id is distinct from old.post_id
       or new.created_at is distinct from old.created_at then
      raise exception 'comment identity and target are immutable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_comment_immutable
  before update on public.comments
  for each row execute function private.guard_comment_immutable();

-- ----------------------------------------------------------------------------
-- 10. FEEDS E LEITURAS — sem a vila, com estado e bloqueio
-- ----------------------------------------------------------------------------
create or replace function public.feed_group(p_group_id uuid, p_order text default 'recent')
    returns table(
      id uuid, locality_id uuid, user_id uuid, group_id uuid,
      post_type public.post_type, content text, photo_path text, link_url text,
      created_at timestamp with time zone, comment_count bigint, reaction_count bigint,
      my_reaction boolean, my_follow boolean, display_name text
    )
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from public.posts p
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
  left join public.profiles pr on pr.user_id = p.user_id
  where p.group_id = p_group_id
    and p.is_deleted = false
    and private.can_read_group_content(p_group_id)
    and private.block_allows((select auth.uid()), p.user_id, 'ler')
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;
revoke all on function public.feed_group(uuid, text) from public;
grant execute on function public.feed_group(uuid, text) to authenticated;

create or replace function public.feed_following()
    returns table(
      id uuid, locality_id uuid, user_id uuid, group_id uuid,
      post_type public.post_type, content text, photo_path text, link_url text,
      created_at timestamp with time zone, comment_count bigint, reaction_count bigint,
      my_reaction boolean, my_follow boolean, display_name text
    )
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), true, pr.display_name
  from public.post_follows f
  join public.posts p on p.id = f.post_id
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
  left join public.profiles pr on pr.user_id = p.user_id
  where f.user_id = (select auth.uid())
    and p.is_deleted = false
    and private.can_read_group_content(p.group_id)
    and private.block_allows((select auth.uid()), p.user_id, 'ler')
  order by p.created_at desc;
$$;
revoke all on function public.feed_following() from public;
grant execute on function public.feed_following() to authenticated;

create or replace function public.feed_posts(p_locality_id uuid, p_order text default 'recent')
    returns table(
      id uuid, locality_id uuid, user_id uuid, group_id uuid,
      post_type public.post_type, content text, photo_path text, link_url text,
      created_at timestamp with time zone, comment_count bigint, reaction_count bigint,
      my_reaction boolean, my_follow boolean, display_name text
    )
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from public.posts p
  join public.groups g on g.id = p.group_id
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
  left join public.profiles pr on pr.user_id = p.user_id
  where private.is_locality_member(p_locality_id)
    and p.locality_id = p_locality_id
    and p.is_deleted = false
    and private.can_read_group_content(p.group_id)
    and private.block_allows((select auth.uid()), p.user_id, 'ler')
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;
revoke all on function public.feed_posts(uuid, text) from public;
grant execute on function public.feed_posts(uuid, text) to authenticated;

create or replace function public.profile_posts_for(p_target_user_id uuid, p_viewer_user_id uuid)
    returns table(
      id uuid, locality_id uuid, group_id uuid, post_type public.post_type,
      content text, photo_path text, link_url text, created_at timestamp with time zone
    )
    language plpgsql
    stable
    security definer
    set search_path to ''
    as $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests'
      using errcode = '42501';
  end if;

  return query
  select
    p.id, p.locality_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.created_at
  from public.posts p
  where p.user_id = p_target_user_id
    and p.is_deleted = false
    and private.can_read_group_content_for(p.group_id, p_viewer_user_id)
    and private.block_allows(p_viewer_user_id, p.user_id, 'ler')
  order by p.created_at desc
  limit 50;
end;
$$;
revoke all on function public.profile_posts_for(uuid, uuid) from public;
grant execute on function public.profile_posts_for(uuid, uuid) to authenticated;
grant execute on function public.profile_posts_for(uuid, uuid) to service_role;

create or replace function public.list_available_groups_for_interests(p_user_id uuid, p_locality_id uuid)
    returns table(
      id uuid, name text, description text,
      visibility public.group_visibility, already_member boolean, already_interest boolean
    )
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select
    g.id,
    g.name,
    g.description,
    g.visibility,
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = g.id and gm.user_id = p_user_id and gm.status = 'approved'
    ) as already_member,
    exists (
      select 1 from public.user_group_interests ugi
      where ugi.group_id = g.id and ugi.user_id = p_user_id
    ) as already_interest
  from public.groups g
  where g.locality_id = p_locality_id
    and g.status = 'active'
    and (
      g.visibility = 'open'
      or exists (
        select 1 from public.group_memberships gm
        where gm.group_id = g.id and gm.user_id = p_user_id and gm.status = 'approved'
      )
    )
  order by g.name;
$$;
revoke all on function public.list_available_groups_for_interests(uuid, uuid) from public;
grant execute on function public.list_available_groups_for_interests(uuid, uuid) to service_role;

create or replace function public.suggest_groups_for_user(p_user_id uuid, p_locality_id uuid)
    returns table(id uuid, name text, description text, visibility public.group_visibility)
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select g.id, g.name, g.description, g.visibility
  from public.groups g
  where g.locality_id = p_locality_id
    and g.status = 'active'
    and (
      g.visibility = 'open'
      or exists (
        select 1 from public.group_memberships gm
        where gm.group_id = g.id and gm.user_id = p_user_id and gm.status = 'approved'
      )
    )
    and not exists (
      select 1 from public.user_group_interests ugi
      where ugi.group_id = g.id and ugi.user_id = p_user_id
    )
    and not exists (
      select 1 from public.group_memberships gm
      where gm.group_id = g.id and gm.user_id = p_user_id and gm.status = 'approved'
    )
  order by g.name;
$$;
revoke all on function public.suggest_groups_for_user(uuid, uuid) from public;
grant execute on function public.suggest_groups_for_user(uuid, uuid) to service_role;

create or replace function public.list_group_activity(p_locality_id uuid)
    returns table(group_id uuid, recent_post_count bigint)
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select
    g.id,
    coalesce(count(p.id), 0)::bigint
  from public.groups g
  left join public.posts p
    on p.group_id = g.id
   and p.is_deleted = false
   and p.created_at >= now() - interval '30 days'
   and private.can_read_group_content(g.id)
   and private.block_allows((select auth.uid()), p.user_id, 'ler')
  where g.locality_id = p_locality_id
    and g.status = 'active'
    and private.is_locality_member(p_locality_id)
    and (
      g.visibility = 'open'
      or private.is_group_member(g.id)
    )
  group by g.id;
$$;
revoke all on function public.list_group_activity(uuid) from public;
grant execute on function public.list_group_activity(uuid) to authenticated;

-- leitura de indicacoes: cidade, membro do grupo, ou grupo Aberto da cidade
create or replace function public.list_indications(
  p_locality_id uuid,
  p_query text default null,
  p_category public.recommendation_category default null,
  p_resolved boolean default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_mine boolean default null
)
    returns table(
      id uuid, title text, body text, category public.recommendation_category,
      created_at timestamp with time zone, is_resolved boolean,
      group_id uuid, group_name text, reply_count integer,
      resolved_reply_body text, matched_reply_body text
    )
    language sql
    stable
    set search_path to ''
    as $$
  with terms as (
    select t.term, to_tsquery('public.bivaque_pt', t.term || ':*') as tsq
    from unnest(private.indication_terms(p_query)) as t(term)
  ),
  candidates as (
    select r.*, g.name as group_name
    from public.recommendation_requests r
    left join public.groups g on g.id = r.group_id
    where (
        r.locality_id = p_locality_id
        or private.can_read_group_content(r.group_id)
        or (g.status = 'active' and g.visibility = 'open' and g.locality_id = p_locality_id)
      )
      and (p_category is null or r.category = p_category)
      and (p_resolved is null or r.is_resolved = p_resolved)
      and (p_mine is null or (r.author_id = (select auth.uid())) = p_mine)
      and private.block_allows((select auth.uid()), r.author_id, 'ler')
      and not exists (
        select 1 from public.hidden_questions h
        where h.request_id = r.id and h.user_id = (select auth.uid())
      )
  ),
  scored as (
    select
      c.*,
      (
        select count(*)::integer from terms t
        where to_tsvector('public.bivaque_pt', c.title || ' ' || c.body) @@ t.tsq
      ) as hits_question,
      (
        select count(*)::integer from terms t
        where to_tsvector('public.bivaque_pt', c.title || ' ' || c.body) @@ t.tsq
          or exists (
            select 1 from public.recommendation_replies rep
            where rep.request_id = c.id
              and to_tsvector('public.bivaque_pt', rep.body) @@ t.tsq
          )
      ) as hits,
      (
        select rep.body from public.recommendation_replies rep
        where rep.request_id = c.id
          and exists (
            select 1 from terms t where to_tsvector('public.bivaque_pt', rep.body) @@ t.tsq
          )
        order by (rep.id = c.resolved_reply_id) desc, rep.created_at
        limit 1
      ) as matched_reply_body,
      (
        select count(*)::integer from public.recommendation_replies rep
        where rep.request_id = c.id
      ) as reply_count
    from candidates c
  )
  select
    s.id, s.title, s.body, s.category, s.created_at, s.is_resolved,
    s.group_id, s.group_name, s.reply_count,
    (
      select rep.body from public.recommendation_replies rep
      where s.is_resolved and rep.id = s.resolved_reply_id
    ),
    s.matched_reply_body
  from scored s
  where not exists (select 1 from terms)
    or s.hits_question > 0
    or s.hits * 2 >= (select count(*) from terms)
  order by
    s.hits desc,
    (s.is_resolved and exists (select 1 from terms)) desc,
    case when p_mine is false and p_resolved is false then s.reply_count end asc nulls last,
    s.created_at desc,
    s.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.list_indications(uuid, text, public.recommendation_category, boolean, integer, integer, boolean) from public;
grant execute on function public.list_indications(uuid, text, public.recommendation_category, boolean, integer, integer, boolean) to authenticated;

create or replace function public.mark_recommendation_reply_resolved(p_request_id uuid, p_reply_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
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

  if exists (
    select 1
    from public.recommendation_requests r
    join public.groups g on g.id = r.group_id
    where r.id = p_request_id and g.status = 'archived'
  ) then
    raise exception 'question belongs to an archived group' using errcode = '42501';
  end if;

  update public.recommendation_requests
     set is_resolved = true,
         resolved_at = case
           when resolved_reply_id is distinct from p_reply_id then now()
           else coalesce(resolved_at, now())
         end,
         resolved_by = v_uid,
         resolved_reply_id = p_reply_id,
         last_resolved_reply_id = p_reply_id
   where id = p_request_id and author_id = v_uid;
end;
$$;
revoke all on function public.mark_recommendation_reply_resolved(uuid, uuid) from public;
grant execute on function public.mark_recommendation_reply_resolved(uuid, uuid) to authenticated;

create or replace function public.complete_event(p_event_id uuid, p_caller_user_id uuid default auth.uid())
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if p_caller_user_id <> (select auth.uid()) then
    raise exception 'caller identity mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.organizer_id = p_caller_user_id
  ) then
    raise exception 'only the event organizer can complete the event' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = p_event_id and g.status = 'archived'
  ) then
    raise exception 'event belongs to an archived group' using errcode = '42501';
  end if;

  update public.events
     set status = 'completed', updated_at = now()
   where id = p_event_id;
end;
$$;
revoke all on function public.complete_event(uuid, uuid) from public;
grant execute on function public.complete_event(uuid, uuid) to authenticated;
grant execute on function public.complete_event(uuid, uuid) to service_role;

create or replace function public.profile_events_for(p_target_user_id uuid, p_viewer_user_id uuid)
    returns table(id uuid, title text, starts_at timestamp with time zone, locality_id uuid)
    language plpgsql
    stable
    security definer
    set search_path to ''
    as $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests'
      using errcode = '42501';
  end if;

  return query
  select e.id, e.title, e.starts_at, e.locality_id
  from public.events e
  where e.organizer_id = p_target_user_id
    and e.status = 'upcoming'
    and exists (
      select 1 from public.locality_memberships lm
      where lm.locality_id = e.locality_id and lm.user_id = p_viewer_user_id
    )
    and (e.group_id is null or private.can_read_group_content_for(e.group_id, p_viewer_user_id))
    and private.block_allows(p_viewer_user_id, e.organizer_id, 'ler')
  order by e.starts_at asc
  limit 20;
end;
$$;
revoke all on function public.profile_events_for(uuid, uuid) from public;
grant execute on function public.profile_events_for(uuid, uuid) to authenticated;
grant execute on function public.profile_events_for(uuid, uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 11. FUNDAÇÃO QUE PERDIA A VILA
-- ----------------------------------------------------------------------------
create or replace function public.get_profile_neighborhood(p_user_id uuid)
    returns text
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select p.neighborhood
  from public.profiles p
  where p.user_id = p_user_id
    and (select auth.uid()) is not null
    and (
      p.user_id = (select auth.uid())
      or (
        p.show_neighborhood
        and not private.account_deletion_requested(p_user_id)
        and private.shares_locality_with(p_user_id)
      )
    );
$$;
comment on function public.get_profile_neighborhood(uuid)
  is 'Bairro de um perfil: dono sempre; terceiro só com show_neighborhood e mesma localidade. NULL quando não pode ver.';

-- Contexto de conversa revalidado no corpo: vínculos históricos não bastam
-- (R1-229 mudada). Sem a vila; os demais contextos permanecem.
create or replace function private.dm_context_valid(
  p_a uuid,
  p_b uuid,
  p_type public.dm_context_type,
  p_context_id uuid
)
    returns boolean
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select case p_type
    when 'shared_group' then exists (
      select 1
        from public.group_memberships gm
       where gm.group_id = p_context_id
         and gm.user_id in (p_a, p_b)
         and gm.status = 'approved'
       having count(distinct gm.user_id) = 2
    )
    when 'shared_event' then exists (
      select 1
        from public.event_rsvps e
       where e.event_id = p_context_id
         and e.user_id in (p_a, p_b)
       having count(distinct e.user_id) = 2
    )
    when 'recommendation_thread' then (
      exists (
        select 1 from public.recommendation_requests r
         where r.id = p_context_id and r.author_id in (p_a, p_b)
      )
      and exists (
        select 1 from public.recommendation_replies rep
         where rep.request_id = p_context_id and rep.author_id in (p_a, p_b)
      )
    )
    when 'accepted_family' then exists (
      select 1 from private.family_account_links l
       where l.holder_user_id in (p_a, p_b)
         and l.family_user_id in (p_a, p_b)
         and l.holder_user_id <> l.family_user_id
    )
    when 'provider' then (
      p_context_id is not null
      and exists (
        select 1 from public.provider_profiles pp
         where pp.id = p_context_id
           and pp.owner_user_id in (p_a, p_b)
           and pp.owner_user_id <> (select auth.uid())
      )
      and private.can_see_provider(p_context_id)
    )
    when 'listing' then (
      p_context_id is not null
      and exists (
        select 1 from public.listings l
         where l.id = p_context_id
           and l.status = 'active'
           and l.owner_user_id in (p_a, p_b)
           and l.owner_user_id <> (select auth.uid())
      )
      and exists (
        select 1 from public.listings l
         where l.id = p_context_id
           and private.can_read_listing(l.id)
      )
    )
    else false
  end;
$$;
revoke all on function private.dm_context_valid(uuid, uuid, public.dm_context_type, uuid) from public;
grant execute on function private.dm_context_valid(uuid, uuid, public.dm_context_type, uuid) to authenticated;

-- Abrir conversa contextual consulta o contrato do bloqueio (R2-comum §5,
-- ação 'contatar'). DM genérica sem contexto elegível continua negada.
create or replace function public.open_conversation(
  p_other_user_id uuid,
  p_context_type public.dm_context_type,
  p_context_id uuid
)
    returns uuid
    language plpgsql
    security definer
    set search_path to ''
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

  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if private.account_deletion_requested(p_other_user_id) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  if p_context_type = 'service_request' then
    raise exception 'service request conversations are created with the request'
      using errcode = '42501';
  end if;

  if not private.dm_context_valid(v_me, p_other_user_id, p_context_type, p_context_id) then
    raise exception 'no valid context between these users' using errcode = '42501';
  end if;

  if not private.block_allows(v_me, p_other_user_id, 'contatar') then
    raise exception 'blocked' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = p_other_user_id)
       or (blocker_user_id = p_other_user_id and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  v_a := least(v_me, p_other_user_id);
  v_b := greatest(v_me, p_other_user_id);

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, p_context_type, p_context_id)
  on conflict (participant_a, participant_b) where context_type <> 'service_request'
  do update set participant_a = excluded.participant_a
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.open_conversation(uuid, public.dm_context_type, uuid) from public;
grant execute on function public.open_conversation(uuid, public.dm_context_type, uuid) to authenticated;

create or replace function public.search_providers(
  p_category public.provider_category default null,
  p_locality_id uuid default null,
  p_query text default null
)
    returns table(
      id uuid, display_name text, category public.provider_category,
      bio text, reach_source public.provider_reach_source
    )
    language sql
    stable
    security definer
    set search_path to ''
    as $$
  select distinct on (p.id)
    p.id, p.display_name, p.category, p.bio, r.source
  from public.provider_profiles p
  join public.provider_reach r on r.provider_id = p.id and r.active
  where p.is_deleted = false
    and private.can_see_provider(p.id)
    and (p_category is null or p.category = p_category)
    and (
      p_locality_id is null
      or (r.scope_type = 'locality' and r.scope_id = p_locality_id)
    )
    and (
      p_query is null
      or extensions.similarity(p.display_name, p_query) > 0.2
      or p.display_name ilike '%' || p_query || '%'
    )
  order by p.id, extensions.similarity(p.display_name, coalesce(p_query, '')) desc,
           p.display_name asc;
$$;
revoke all on function public.search_providers(public.provider_category, uuid, text) from public;
grant execute on function public.search_providers(public.provider_category, uuid, text) to authenticated;

create or replace function public.create_provider_invitation(
  p_locality_id uuid,
  p_email text,
  p_display_name text
)
    returns uuid
    language plpgsql
    security definer
    set search_path to ''
    as $_$
declare
  v_inviter_user_id uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_display_name text := btrim(p_display_name);
  v_active_count integer;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_invitation_id uuid;
begin
  if v_inviter_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.is_current_user_operator(v_inviter_user_id) then
    raise exception 'only operators invite providers' using errcode = '42501';
  end if;

  if not exists (select 1 from public.localities l where l.id = p_locality_id) then
    raise exception 'locality not found' using errcode = 'P0002';
  end if;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid provider e-mail' using errcode = '22023';
  end if;

  if char_length(v_display_name) not between 2 and 80 then
    raise exception 'provider display name must have between 2 and 80 characters'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_inviter_user_id::text, 0)
  );

  select count(*)::integer
    into v_active_count
    from private.provider_invitations pi
   where pi.inviter_user_id = v_inviter_user_id
     and pi.status = 'pending'
     and pi.expires_at > now();

  if v_active_count >= 50 then
    raise exception 'maximum 50 active provider invitations per operator'
      using errcode = '54000';
  end if;

  insert into private.provider_invitations (
    inviter_user_id, locality_id, display_name, token_digest, invitee_email_digest, expires_at
  )
  values (
    v_inviter_user_id,
    p_locality_id,
    v_display_name,
    extensions.digest(decode(v_token, 'hex'), 'sha256'),
    extensions.digest(v_email, 'sha256'),
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  insert into public.outbox (recipient, channel, type, payload)
  values (
    v_email, 'email', 'provider_invite',
    jsonb_build_object('display_name', v_display_name, 'invite_path', '/prestador-convite/' || v_token)
  );

  return v_invitation_id;
end;
$_$;
revoke all on function public.create_provider_invitation(uuid, text, text) from public;
grant execute on function public.create_provider_invitation(uuid, text, text) to authenticated;

create or replace function public.accept_provider_invitation(p_token text, p_email text)
    returns uuid
    language plpgsql
    security definer
    set search_path to ''
    as $_$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_invitation private.provider_invitations;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_token !~ '^[0-9A-Fa-f]{64}$' then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from auth.users u where u.id = v_user_id and lower(u.email) = v_email
  ) then
    raise exception 'authenticated e-mail does not match' using errcode = '42501';
  end if;

  select pi.* into v_invitation
    from private.provider_invitations pi
   where pi.token_digest = extensions.digest(decode(lower(p_token), 'hex'), 'sha256')
   for update;

  if not found then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  if v_invitation.status = 'accepted' then
    raise exception 'provider invitation already accepted' using errcode = 'P0003';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'provider invitation is not pending' using errcode = 'P0003';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'provider invitation expired' using errcode = 'P0004';
  end if;

  if v_invitation.invitee_email_digest <> extensions.digest(v_email, 'sha256') then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.locality_memberships lm where lm.user_id = v_user_id) then
    raise exception 'member accounts cannot accept provider invitations' using errcode = '42501';
  end if;

  insert into public.provider_accounts (auth_user_id, invited_by, locality_id)
  values (v_user_id, v_invitation.inviter_user_id, v_invitation.locality_id);

  update private.provider_invitations
     set status = 'accepted', accepted_by_user_id = v_user_id, accepted_at = now()
   where id = v_invitation.id;

  return v_user_id;
end;
$_$;
revoke all on function public.accept_provider_invitation(text, text) from public;
grant execute on function public.accept_provider_invitation(text, text) to authenticated;

create or replace function public.read_provider_invitation(p_token text)
    returns table(locality_id uuid, locality_name text, status text)
    language sql
    stable
    security definer
    set search_path to ''
    as $_$
  select
    l.id,
    l.city_name,
    case
      when pi.status = 'pending' and pi.expires_at <= now() then 'expired'
      else pi.status::text
    end
  from private.provider_invitations pi
  join public.localities l on l.id = pi.locality_id
  where p_token ~ '^[0-9A-Fa-f]{64}$'
    and pi.token_digest = extensions.digest(decode(lower(p_token), 'hex'), 'sha256');
$_$;
revoke all on function public.read_provider_invitation(text) from public;
grant execute on function public.read_provider_invitation(text) to anon;
grant execute on function public.read_provider_invitation(text) to authenticated;

create or replace function public.revoke_provider_account(
  p_provider_user_id uuid,
  p_owner_user_id uuid,
  p_reason text
)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a revogação exige motivo' using errcode = '22023';
  end if;

  if not public.is_current_user_operator(p_owner_user_id) then
    raise exception 'only operators revoke provider accounts' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.provider_accounts pa
    where pa.auth_user_id = p_provider_user_id and pa.revoked_at is null
  ) then
    raise exception 'provider account not found or already revoked' using errcode = 'P0002';
  end if;

  update public.provider_accounts
     set revoked_at = now(), revoked_by = p_owner_user_id
   where auth_user_id = p_provider_user_id;

  update public.provider_reach r
     set active = false
    from public.provider_profiles p
   where p.id = r.provider_id and p.owner_user_id = p_provider_user_id;
end;
$$;
revoke all on function public.revoke_provider_account(uuid, uuid, text) from public;
grant execute on function public.revoke_provider_account(uuid, uuid, text) to service_role;

create or replace function public.create_property_listing(p_listing jsonb, p_details jsonb)
    returns uuid
    language plpgsql
    set search_path to ''
    as $$
declare
  v_me uuid := (select auth.uid());
  v_listing uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  insert into public.listings (
    owner_user_id, kind, status, title, description, neighborhood, address,
    published_at, locality_id
  ) values (
    v_me,
    'property',
    coalesce((p_listing ->> 'status')::public.listing_status, 'draft'),
    p_listing ->> 'title',
    nullif(btrim(coalesce(p_listing ->> 'description', '')), ''),
    nullif(btrim(coalesce(p_listing ->> 'neighborhood', '')), ''),
    nullif(btrim(coalesce(p_listing ->> 'address', '')), ''),
    nullif(p_listing ->> 'published_at', '')::timestamptz,
    nullif(p_listing ->> 'locality_id', '')::uuid
  )
  returning id into v_listing;

  insert into public.property_details (
    listing_id, deal, property_type, rent_cents, condo_fee_cents, iptu_cents,
    sale_price_cents, bedrooms, suites, parking_spots, area_m2, available_from
  ) values (
    v_listing,
    (p_details ->> 'deal')::public.listing_deal,
    (p_details ->> 'property_type')::public.property_type,
    (p_details ->> 'rent_cents')::integer,
    (p_details ->> 'condo_fee_cents')::integer,
    (p_details ->> 'iptu_cents')::integer,
    (p_details ->> 'sale_price_cents')::integer,
    (p_details ->> 'bedrooms')::integer,
    (p_details ->> 'suites')::integer,
    (p_details ->> 'parking_spots')::integer,
    (p_details ->> 'area_m2')::numeric,
    nullif(p_details ->> 'available_from', '')::date
  );

  return v_listing;
end;
$$;

create or replace function public.transition_listing(p_listing_id uuid, p_action text)
    returns public.listing_status
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_uid uuid := (select auth.uid());
  v_listing public.listings;
  v_target public.listing_status;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.owner_user_id <> v_uid then
    raise exception 'only the listing owner can change its status' using errcode = '42501';
  end if;

  v_target := case p_action
    when 'publish' then 'active'::public.listing_status
    when 'pause' then 'paused'::public.listing_status
    when 'reactivate' then 'active'::public.listing_status
    when 'reserve' then 'reserved'::public.listing_status
    when 'sell' then 'sold'::public.listing_status
    when 'close' then 'closed'::public.listing_status
    else null
  end;

  if v_target is null then
    raise exception 'unknown listing action: %', p_action using errcode = '22023';
  end if;

  if v_target = 'sold' and v_listing.kind <> 'item' then
    raise exception 'only an item can be marked sold' using errcode = '22023';
  end if;

  if v_listing.status = v_target then
    return v_listing.status;
  end if;

  if not (
    (v_listing.status = 'draft' and v_target = 'active')
    or (v_listing.status = 'active' and v_target in ('paused', 'reserved', 'sold', 'closed'))
    or (v_listing.status = 'paused' and v_target in ('active', 'closed'))
    or (v_listing.status = 'reserved' and v_target in ('active', 'sold', 'closed'))
    or (v_listing.status = 'sold' and v_target in ('active', 'closed'))
  ) then
    raise exception 'cannot move listing from % to %', v_listing.status, v_target
      using errcode = '22023';
  end if;

  if v_target = 'active' then
    if v_listing.locality_id is null then
      raise exception 'an active listing requires a locality' using errcode = '42501';
    end if;
    if not private.is_locality_member(v_listing.locality_id) then
      raise exception 'listing audience requires locality membership' using errcode = '42501';
    end if;
  end if;

  perform set_config('bivaque.listing_transition', 'on', true);

  update public.listings
     set status = v_target,
         published_at = case
           when v_target = 'active' and published_at is null then now()
           else published_at
         end
   where id = p_listing_id;

  perform set_config('bivaque.listing_transition', '', true);

  insert into public.listing_status_events (listing_id, actor_id, from_status, to_status)
  values (p_listing_id, v_uid, v_listing.status, v_target);

  return v_target;
end;
$$;
revoke all on function public.transition_listing(uuid, text) from public;
grant execute on function public.transition_listing(uuid, text) to authenticated;

-- encerramento de conta: sem a vila
create or replace function public.finalize_account_deletion(p_user_id uuid, p_error text default null)
    returns text
    language plpgsql
    security definer
    set search_path to ''
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

  if v_finalized_at is not null then
    return 'already_purged';
  end if;

  if p_error is not null then
    update public.account_deletion_requests
       set purge_last_error = left(p_error, 500)
     where user_id = p_user_id;
    return 'failed';
  end if;

  if v_due_at > now() then
    return 'not_due';
  end if;

  delete from private.verification_documents where user_id = p_user_id;

  update public.profiles
     set bio = null, neighborhood = null, consent_version = 0, consented_at = null, updated_at = now()
   where user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
  delete from public.notifications where recipient_user_id = p_user_id;
  delete from public.dm_read_states where user_id = p_user_id;
  delete from public.dm_blocks where blocker_user_id = p_user_id or blocked_user_id = p_user_id;
  delete from public.post_saves where user_id = p_user_id;
  delete from public.post_reactions where user_id = p_user_id;
  delete from public.post_follows where user_id = p_user_id;
  delete from public.hidden_posts where user_id = p_user_id;
  delete from public.listing_saves where user_id = p_user_id;
  delete from public.listing_alerts where owner_user_id = p_user_id;
  delete from public.recommendation_saves where user_id = p_user_id;
  delete from public.user_group_interests where user_id = p_user_id;
  delete from public.event_rsvps where user_id = p_user_id;
  delete from public.hidden_questions where user_id = p_user_id;
  delete from public.member_entry_moments where user_id = p_user_id;

  delete from public.outbox o
   where o.type = 'support_answered'
     and exists (
       select 1 from public.support_tickets t
       where t.user_id = p_user_id and t.id::text = o.payload ->> 'ticket_id'
     );

  delete from public.support_tickets where user_id = p_user_id;

  update public.support_tickets set answered_by = null where answered_by = p_user_id;

  -- Participação sai; posse de grupo não é dissolvida (settle_account_possessions).
  delete from public.group_memberships gm
   where gm.user_id = p_user_id
     and not exists (
       select 1 from public.groups g where g.id = gm.group_id and g.owner_user_id = p_user_id
     );

  delete from public.locality_memberships where user_id = p_user_id;

  update public.operators
     set revoked_at = coalesce(revoked_at, now())
   where auth_user_id = p_user_id and revoked_at is null;

  update public.arrival_guide_entries set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports set resolved_by = null where resolved_by = p_user_id;

  delete from private.family_invitations
   where inviter_user_id = p_user_id or accepted_by_user_id = p_user_id;

  update public.account_deletion_requests
     set finalized_at = now(), purge_last_error = null
   where user_id = p_user_id;

  return 'purged';
end;
$$;
revoke all on function public.finalize_account_deletion(uuid, text) from public;
grant execute on function public.finalize_account_deletion(uuid, text) to service_role;

create or replace function public.settle_account_possessions(p_user_id uuid)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_successor uuid;
  v_operations uuid;
  v_group uuid;
begin
  select o.auth_user_id into v_operations
    from public.operators o
   where o.revoked_at is null
   order by o.granted_at
   limit 1;

  for v_group in
    select g.id from public.groups g where g.owner_user_id = p_user_id
  loop
    select m.user_id into v_successor
      from public.group_memberships m
     where m.group_id = v_group
       and m.role = 'moderator'
       and m.status = 'approved'
       and m.user_id <> p_user_id
     order by m.joined_at
     limit 1;

    update public.groups
       set owner_user_id = coalesce(v_successor, v_operations, p_user_id)
     where id = v_group;

    v_successor := null;
  end loop;

  perform set_config('bivaque.listing_transition', 'on', true);
  update public.listings
     set status = 'closed', closed_at = now(), updated_at = now()
   where owner_user_id = p_user_id and status <> 'closed';
  perform set_config('bivaque.listing_transition', '', true);

  update public.provider_accounts
     set revoked_at = now(), revoked_by = null
   where auth_user_id = p_user_id and revoked_at is null;

  with cancelados as (
    update public.service_requests
       set status = 'cancelled', updated_at = now()
     where (requester_user_id = p_user_id or provider_user_id = p_user_id)
       and status in ('open', 'in_conversation')
    returning id, requester_user_id, provider_user_id
  )
  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  )
  select
    case when c.requester_user_id = p_user_id then c.provider_user_id else c.requester_user_id end,
    null, 'service_request', 'cancelled_counterpart_left', 'service_request', c.id
  from cancelados c;
end;
$$;
comment on function public.settle_account_possessions(uuid)
  is 'Aplica as regras de posse da purga: grupo passa a moderador ou operação; vitrine e anúncios encerram; pedidos de serviço abertos cancelam com aviso neutro.';
revoke all on function public.settle_account_possessions(uuid) from public;
grant execute on function public.settle_account_possessions(uuid) to service_role;

create or replace function public.resolve_report(
  p_report_id uuid,
  p_operator_user_id uuid,
  p_action text,
  p_note text default null
)
    returns void
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_report public.reports;
begin
  if p_action not in ('hide', 'dismiss') then
    raise exception 'action must be hide or dismiss' using errcode = '22023';
  end if;

  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators resolve reports' using errcode = '42501';
  end if;

  select * into v_report from public.reports
   where id = p_report_id and status = 'open' for update;

  if not found then
    raise exception 'report not found or already resolved' using errcode = 'P0002';
  end if;

  if p_action = 'hide' then
    case v_report.target_type
      when 'post' then update public.posts set is_deleted = true where id = v_report.target_id;
      when 'comment' then update public.comments set is_deleted = true where id = v_report.target_id;
      when 'group' then
        update public.groups set status = 'archived', pinned_post_id = null where id = v_report.target_id;
      when 'message' then update public.dm_messages set is_deleted = true where id = v_report.target_id;
      when 'recommendation_request' then
        update public.recommendation_requests set is_deleted = true where id = v_report.target_id;
      when 'recommendation_reply' then
        update public.recommendation_replies set is_deleted = true where id = v_report.target_id;
      when 'provider_profile' then
        update public.provider_profiles set is_deleted = true where id = v_report.target_id;
      else
        raise exception 'unknown target type: %', v_report.target_type using errcode = '22023';
    end case;
  end if;

  update public.reports
     set status = 'resolved',
         operator_note = coalesce(p_note, p_action),
         resolved_by = p_operator_user_id,
         resolved_at = now()
   where id = p_report_id;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_report.reporter_user_id, p_operator_user_id, 'report_resolved', 'resolved', 'report', p_report_id
  );
end;
$$;
revoke all on function public.resolve_report(uuid, uuid, text, text) from public;
grant execute on function public.resolve_report(uuid, uuid, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- 12. NOTIFICAÇÕES — consultam o contrato do bloqueio antes de emitir
-- ----------------------------------------------------------------------------
create or replace function private.notify_comment()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_post_author uuid;
  v_post_group uuid;
begin
  select p.user_id, p.group_id into v_post_author, v_post_group
  from public.posts p
  where p.id = new.post_id;

  if v_post_author is null or v_post_author = new.user_id then
    return new;
  end if;

  if not private.block_allows(new.user_id, v_post_author, 'notificar') then
    return new;
  end if;

  if v_post_group is not null
     and not private.group_notify_allows(v_post_group, 'highlight', v_post_author) then
    return new;
  end if;

  if private.notification_channel_allows('comment', 'in_app', v_post_author) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_post_author, new.user_id, 'comment', 'created', 'post', new.post_id);
  end if;

  return new;
end;
$$;

create or replace function private.notify_group_post()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if new.group_id is null or new.is_deleted then
    return new;
  end if;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select gm.user_id, new.user_id, 'group_post', 'created', 'group', new.group_id
  from public.group_memberships gm
  where gm.group_id = new.group_id
    and gm.status = 'approved'
    and gm.user_id <> new.user_id
    and private.block_allows(new.user_id, gm.user_id, 'notificar')
    and private.group_notify_allows(new.group_id, 'post', gm.user_id)
    and private.notification_channel_allows('group_post', 'in_app', gm.user_id);

  return new;
end;
$$;

create or replace function private.notify_group_pin()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_actor uuid;
begin
  if new.pinned_post_id is null
     or new.pinned_post_id is not distinct from old.pinned_post_id then
    return new;
  end if;

  v_actor := (select auth.uid());

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select gm.user_id, v_actor, 'group_post', 'pinned', 'group', new.id
  from public.group_memberships gm
  where gm.group_id = new.id
    and gm.status = 'approved'
    and gm.user_id is distinct from v_actor
    and private.block_allows(v_actor, gm.user_id, 'notificar')
    and private.group_notify_allows(new.id, 'highlight', gm.user_id)
    and private.notification_channel_allows('group_post', 'in_app', gm.user_id);

  return new;
end;
$$;

create or replace function private.notify_group_admission()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_actor uuid;
begin
  if old.status <> 'pending' or new.status <> 'approved' then
    return new;
  end if;

  v_actor := (select auth.uid());

  if v_actor is not null
     and v_actor <> new.user_id
     and private.block_allows(v_actor, new.user_id, 'notificar') then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (new.user_id, v_actor, 'group_admission', 'approved', 'group', new.group_id);
  end if;

  return new;
end;
$$;

create or replace function private.notify_event_change()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
begin
  if old.title is not distinct from new.title
     and old.starts_at is not distinct from new.starts_at
     and old.status is not distinct from new.status
     and old.venue is not distinct from new.venue
     and old.description is not distinct from new.description then
    return new;
  end if;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select r.user_id, new.organizer_id, 'event_change', 'updated', 'event', new.id
  from public.event_rsvps r
  where r.event_id = new.id
    and r.user_id <> new.organizer_id
    and (new.group_id is null or private.can_read_group_content_for(new.group_id, r.user_id))
    and private.block_allows(new.organizer_id, r.user_id, 'notificar')
    and private.notification_channel_allows('event_change', 'in_app', r.user_id);

  return new;
end;
$$;

create or replace function private.notify_event_rsvp()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_organizer uuid;
begin
  select e.organizer_id into v_organizer
  from public.events e
  where e.id = new.event_id;

  if v_organizer is null or v_organizer = new.user_id then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  if not private.block_allows(new.user_id, v_organizer, 'notificar') then
    return new;
  end if;

  if private.notification_channel_allows('event_rsvp', 'in_app', v_organizer) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_organizer, new.user_id, 'event_rsvp', new.status::text, 'event', new.event_id);
  end if;

  return new;
end;
$$;

create or replace function private.notify_recommendation_reply()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_author uuid;
  v_prefs_enabled boolean;
  v_email text;
begin
  select r.author_id, u.email into v_author, v_email
  from public.recommendation_requests r
  join auth.users u on u.id = r.author_id
  where r.id = new.request_id;

  if v_author is null or v_author = new.author_id then
    return new;
  end if;

  if not private.block_allows(new.author_id, v_author, 'notificar') then
    return new;
  end if;

  select coalesce(np.comments, true) into v_prefs_enabled
  from public.notification_preferences np
  where np.user_id = v_author;

  if v_prefs_enabled is false then
    return new;
  end if;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_author, new.author_id, 'recommendation_reply', 'replied', 'recommendation_request', new.request_id
  );

  if v_email is not null and v_email <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email, 'email', 'recommendation_reply',
      jsonb_build_object('request_id', new.request_id, 'reply_id', new.id)
    );
  end if;

  return new;
end;
$$;

create or replace function private.notify_recommendation_reply_followers()
    returns trigger
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_request_author uuid;
  v_follower record;
begin
  select r.author_id into v_request_author
  from public.recommendation_requests r
  where r.id = new.request_id;

  for v_follower in
    select s.user_id
    from public.recommendation_saves s
    where s.request_id = new.request_id
      and s.user_id <> new.author_id
      and s.user_id <> coalesce(v_request_author, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    if coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = v_follower.user_id),
      true
    ) and private.block_allows(new.author_id, v_follower.user_id, 'notificar') then
      insert into public.notifications (
        recipient_user_id, actor_user_id, type, action, target_type, target_id
      ) values (
        v_follower.user_id, new.author_id, 'recommendation_reply', 'replied_to_saved',
        'recommendation_request', new.request_id
      );

      insert into public.outbox (recipient, channel, type, payload)
      values (
        concat('saved-notify:', v_follower.user_id::text),
        'email', 'recommendation_reply',
        jsonb_build_object('request_id', new.request_id, 'reply_id', new.id, 'follower_id', v_follower.user_id)
      );
    end if;
  end loop;

  return new;
end;
$$;

create or replace function private.send_recurring_event_reminders()
    returns integer
    language plpgsql
    security definer
    set search_path to ''
    as $$
declare
  v_event record;
  v_recipient record;
  v_prefs_enabled boolean;
  v_count integer := 0;
begin
  for v_event in
    select id, title, starts_at, organizer_id, group_id
    from public.events
    where recurrence_type is not null
      and status = 'upcoming'
      and starts_at::date = current_date + 1
      and (last_reminder_sent_for is null or last_reminder_sent_for <> starts_at::date)
  loop
    for v_recipient in
      select r.user_id, u.email
      from public.event_rsvps r
      join auth.users u on u.id = r.user_id
      where r.event_id = v_event.id
        and r.occurrence_date = v_event.starts_at::date
        and r.status in ('going', 'interested')
        and (v_event.group_id is null or private.can_read_group_content_for(v_event.group_id, r.user_id))
    loop
      select coalesce(np.events, true) into v_prefs_enabled
      from public.notification_preferences np
      where np.user_id = v_recipient.user_id;

      if v_prefs_enabled is not false
         and private.block_allows(v_event.organizer_id, v_recipient.user_id, 'notificar') then
        insert into public.notifications (
          recipient_user_id, actor_user_id, type, action, target_type, target_id
        ) values (
          v_recipient.user_id, null, 'event_reminder', 'upcoming', 'event', v_event.id
        );

        if v_recipient.email is not null and v_recipient.email <> '' then
          insert into public.outbox (recipient, channel, type, payload)
          values (
            v_recipient.email, 'email', 'event_reminder',
            jsonb_build_object('event_id', v_event.id, 'title', v_event.title, 'starts_at', v_event.starts_at)
          );
        end if;

        v_count := v_count + 1;
      end if;
    end loop;

    update public.events
       set last_reminder_sent_for = v_event.starts_at::date
     where id = v_event.id;
  end loop;

  return v_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- 13. POLICIES RECRIADAS A PARTIR DA MATRIZ
-- ----------------------------------------------------------------------------
-- groups: metadados abertos à cidade em grupo ativo; participantes sempre
create policy groups_select_locality_member on public.groups
  for select to authenticated
  using (
    private.is_group_member(id)
    or (status = 'active' and private.is_locality_member(locality_id))
  );

create policy groups_insert_verified_member on public.groups
  for insert to authenticated
  with check (
    private.is_verified_locality_member(locality_id)
    and created_by = (select auth.uid())
    and owner_user_id = (select auth.uid())
    and status = 'active'
  );

create policy groups_update_owner on public.groups
  for update to authenticated
  using (private.is_group_owner(id))
  with check (private.is_group_owner(id));

-- group_memberships: leitura do próprio vínculo ou de grupo legível
create policy group_memberships_select on public.group_memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_group_content(group_id));

-- group_join_reasons: autor ou quem decide
create policy group_join_reasons_select_author_or_moderator on public.group_join_reasons
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_group_moderator(group_id));

-- posts
create policy posts_select_locality_member on public.posts
  for select to authenticated
  using (
    not is_deleted
    and private.can_access_post_scope(locality_id, group_id)
    and private.block_allows((select auth.uid()), user_id, 'ler')
  );

create policy posts_insert_locality_member on public.posts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and group_id is not null
    and private.can_write_post_to(locality_id, group_id)
    and not public.is_account_suspended((select auth.uid()))
    and not private.account_deletion_requested((select auth.uid()))
  );

create policy posts_update_own on public.posts
  for update to authenticated
  using (not is_deleted and user_id = (select auth.uid()))
  with check (
    not is_deleted
    and user_id = (select auth.uid())
    and private.can_write_post_to(locality_id, group_id)
  );

create policy posts_delete_own on public.posts
  for delete to authenticated
  using (not is_deleted and user_id = (select auth.uid()));

-- comments
create policy comments_select_via_post on public.comments
  for select to authenticated
  using (
    not is_deleted
    and private.can_access_post(post_id)
    and private.block_allows((select auth.uid()), user_id, 'ler')
  );

create policy comments_insert_member on public.comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and private.can_write_post_to(p.locality_id, p.group_id)
    )
    and not public.is_account_suspended((select auth.uid()))
    and private.post_accepts_interaction(post_id)
    and not private.account_deletion_requested((select auth.uid()))
    and private.block_allows(
      (select auth.uid()),
      (select p.user_id from public.posts p where p.id = comments.post_id),
      'comentar'
    )
  );

create policy comments_update_own on public.comments
  for update to authenticated
  using (not is_deleted and user_id = (select auth.uid()))
  with check (
    not is_deleted
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and private.can_write_post_to(p.locality_id, p.group_id)
    )
  );

create policy comments_delete_own on public.comments
  for delete to authenticated
  using (not is_deleted and user_id = (select auth.uid()));

-- post_reactions
create policy post_reactions_select_locality_member on public.post_reactions
  for select to authenticated
  using (
    private.can_access_post(post_id)
    and exists (select 1 from public.posts p where p.id = post_reactions.post_id and not p.is_deleted)
  );

create policy post_reactions_insert_locality_member on public.post_reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_reactions.post_id
        and private.can_write_post_to(p.locality_id, p.group_id)
    )
    and not public.is_account_suspended((select auth.uid()))
    and private.post_accepts_interaction(post_id)
    and not private.account_deletion_requested((select auth.uid()))
    and private.block_allows(
      (select auth.uid()),
      (select p.user_id from public.posts p where p.id = post_reactions.post_id),
      'reagir'
    )
  );

create policy post_reactions_delete_own on public.post_reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- post_saves
create policy post_saves_select_own on public.post_saves
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_saves.post_id and not p.is_deleted)
  );

create policy post_saves_insert_own on public.post_saves
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_access_post(post_id)
    and private.post_accepts_interaction(post_id)
    and not private.account_deletion_requested((select auth.uid()))
  );

create policy post_saves_delete_own on public.post_saves
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- post_follows
create policy post_follows_select_own on public.post_follows
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_follows.post_id and not p.is_deleted)
  );

create policy post_follows_insert_own on public.post_follows
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_access_post(post_id)
    and private.post_accepts_interaction(post_id)
    and not private.account_deletion_requested((select auth.uid()))
  );

create policy post_follows_delete_own on public.post_follows
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- hidden_posts
create policy hidden_posts_select_own on public.hidden_posts
  for select to authenticated
  using (user_id = (select auth.uid()) and private.can_access_post(post_id));

create policy hidden_posts_insert_own on public.hidden_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_access_post(post_id));

create policy hidden_posts_delete_own on public.hidden_posts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- events
create policy events_select_locality_member on public.events
  for select to authenticated
  using (
    private.block_allows((select auth.uid()), organizer_id, 'ler')
    and (
      (group_id is null and (private.is_locality_member(locality_id) or private.has_current_locality()))
      or (group_id is not null and private.can_read_group_content(group_id))
    )
  );

create policy events_insert_verified_member on public.events
  for insert to authenticated
  with check (
    organizer_id = (select auth.uid())
    and private.is_verified_locality_member(locality_id)
    and private.is_active_locality_member(locality_id)
    and (
      group_id is null
      or exists (
        select 1 from public.groups g
        where g.id = events.group_id
          and g.status = 'active'
          and g.locality_id = events.locality_id
          and (g.visibility = 'open' or private.is_group_member(g.id))
      )
    )
  );

create policy events_update_organizer on public.events
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

-- event_rsvps
create policy event_rsvps_select_locality_member on public.event_rsvps
  for select to authenticated
  using (
    private.can_access_event(event_id)
    and private.block_allows(
      (select auth.uid()),
      (select e.organizer_id from public.events e where e.id = event_rsvps.event_id),
      'ler'
    )
  );

create policy event_rsvps_insert_self on public.event_rsvps
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_access_event(event_id)
    and private.event_accepts_interaction(event_id)
  );

create policy event_rsvps_update_self on public.event_rsvps
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and private.event_accepts_interaction(event_id)
  );

create policy event_rsvps_delete_self on public.event_rsvps
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- recommendation_requests
create policy recommendation_requests_select_locality on public.recommendation_requests
  for select to authenticated
  using (
    is_deleted = false
    and (
      author_id = (select auth.uid())
      or (locality_id is not null and private.can_see_locality_recommendation(locality_id))
      or (group_id is not null and private.can_read_group_content(group_id))
    )
  );

create policy recommendation_requests_insert_locality on public.recommendation_requests
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (locality_id is not null and group_id is null and private.is_locality_member(locality_id))
      or (locality_id is null and group_id is not null and private.is_group_member(group_id))
      or (
        locality_id is not null
        and group_id is not null
        and private.is_group_member(group_id)
        and exists (
          select 1 from public.groups g
          where g.id = recommendation_requests.group_id
            and g.visibility = 'open'
            and g.status = 'active'
            and g.locality_id = recommendation_requests.locality_id
        )
      )
    )
  );

create policy recommendation_requests_update_own on public.recommendation_requests
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy recommendation_requests_delete_own on public.recommendation_requests
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- listings
create policy listings_insert_owner on public.listings
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and not public.is_account_suspended((select auth.uid()))
    and not private.account_deletion_requested((select auth.uid()))
    and (locality_id is null or private.is_locality_member(locality_id))
  );

create policy listings_update_owner on public.listings
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (
    owner_user_id = (select auth.uid())
    and (locality_id is null or private.is_locality_member(locality_id))
  );

-- provider_reach: alcance só de localidade
create policy provider_reach_insert_owner_free_locality on public.provider_reach
  for insert to authenticated
  with check (
    source = 'free'
    and scope_type = 'locality'
    and exists (
      select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
      where p.id = provider_reach.provider_id
        and p.owner_user_id = (select auth.uid())
        and pa.revoked_at is null
        and pa.locality_id = provider_reach.scope_id
    )
  );

create policy provider_reach_update_owner_free_locality on public.provider_reach
  for update to authenticated
  using (
    source = 'free'
    and scope_type = 'locality'
    and exists (
      select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
      where p.id = provider_reach.provider_id
        and p.owner_user_id = (select auth.uid())
        and pa.revoked_at is null
        and pa.locality_id = provider_reach.scope_id
    )
  )
  with check (
    source = 'free'
    and scope_type = 'locality'
    and exists (
      select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
      where p.id = provider_reach.provider_id
        and p.owner_user_id = (select auth.uid())
        and pa.revoked_at is null
        and pa.locality_id = provider_reach.scope_id
    )
  );

create policy provider_reach_delete_owner_free_locality on public.provider_reach
  for delete to authenticated
  using (
    source = 'free'
    and scope_type = 'locality'
    and exists (
      select 1
      from public.provider_profiles p
      join public.provider_accounts pa on pa.auth_user_id = p.owner_user_id
      where p.id = provider_reach.provider_id
        and p.owner_user_id = (select auth.uid())
        and pa.revoked_at is null
        and pa.locality_id = provider_reach.scope_id
    )
  );

-- storage: foto de evento/grupo herda o acesso ao conteúdo, não só a cidade
create policy event_photos_select_scoped on storage.objects
  for select to authenticated
  using (
    bucket_id = 'event-photos'
    and exists (
      select 1 from public.posts p
      where p.photo_path = objects.name
        and not p.is_deleted
        and private.can_read_group_content(p.group_id)
        and private.block_allows((select auth.uid()), p.user_id, 'ler')
    )
  );

-- ----------------------------------------------------------------------------
-- 14. GRANTS MÍNIMOS (o que sai com a vila já foi revogado pelo DROP)
-- ----------------------------------------------------------------------------
-- A participação perde DELETE/UPDATE direto: sair e remover passam por RPC.
revoke all on table public.group_memberships from authenticated;
-- `notify_level` é privado da própria pessoa: fica fora do grant de coluna.
grant select (group_id, joined_at, role, status, user_id) on table public.group_memberships to authenticated;
grant select on table public.hidden_posts to authenticated;
-- A identidade de quem reagiu não é exposta (R2/P4): só a contagem e a própria
-- reação, que passam pelos feeds (SECURITY DEFINER).
revoke all on table public.post_reactions from authenticated;
grant select (id, post_id, created_at) on table public.post_reactions to authenticated;
grant insert, delete on table public.post_reactions to authenticated;

commit;