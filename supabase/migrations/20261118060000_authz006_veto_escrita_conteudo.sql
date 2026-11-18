-- AUTHZ-006 (R3, aceito por delegação — ver
-- docs/decisions/ADR-20261118-veto-de-escrita-nas-demais-tabelas-de-conteudo.md).
--
-- O ADR-20260901 pede que conta suspensa não escreva conteúdo; o pedido de
-- exclusão de conta congela a escrita do mesmo jeito (ADR de exclusão). As
-- policies de UPDATE/DELETE de recommendation_requests, recommendation_replies,
-- listings, property_details, listing_photos e events checavam só autoria.
--
-- Em vez de reescrever cada policy permissiva (e arriscar mudar a autoria ou o
-- escopo que cada uma já decide), este arquivo acrescenta policies RESTRITIVAS
-- por comando. O PostgreSQL faz AND entre toda policy restritiva e o OR das
-- permissivas: nada que hoje é negado passa a ser permitido, e toda policy
-- permissiva futura nessas tabelas herda o veto sem precisar lembrar dele.
--
-- As restritivas são `to authenticated`: funções SECURITY DEFINER (rodam como
-- dono) e service_role não passam por elas. Por isso toda RPC definer que
-- cria ou muda conteúdo a pedido do membro ganha o mesmo veto no corpo:
-- create_group, transition_listing, set_group_rules, pin_group_post,
-- unpin_group_post, transfer_group_ownership, delete_group, complete_event e as
-- quatro de resolução de pergunta. Nenhuma delas é chamada por job ou por outra
-- função: só pela sessão do membro.
--
-- Provado em supabase/tests/authz-veto-escrita-conteudo.sql.

create function private.can_write_own_content()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not public.is_account_suspended((select auth.uid()))
    and not private.account_deletion_requested((select auth.uid()));
$$;

revoke all on function private.can_write_own_content() from public, anon;
grant execute on function private.can_write_own_content() to authenticated;

do $$
declare
  v_table text;
  v_cmd text;
begin
  foreach v_table in array array[
    'recommendation_requests',
    'recommendation_replies',
    'listings',
    'property_details',
    'listing_photos',
    'events',
    'groups'
  ] loop
    foreach v_cmd in array array['insert', 'update', 'delete'] loop
      if v_cmd = 'insert' then
        execute format(
          'create policy %I on public.%I as restrictive for insert to authenticated '
          'with check ((select private.can_write_own_content()))',
          v_table || '_veto_conta_' || v_cmd, v_table
        );
      elsif v_cmd = 'update' then
        execute format(
          'create policy %I on public.%I as restrictive for update to authenticated '
          'using ((select private.can_write_own_content())) '
          'with check ((select private.can_write_own_content()))',
          v_table || '_veto_conta_' || v_cmd, v_table
        );
      else
        execute format(
          'create policy %I on public.%I as restrictive for delete to authenticated '
          'using ((select private.can_write_own_content()))',
          v_table || '_veto_conta_' || v_cmd, v_table
        );
      end if;
    end loop;
  end loop;
end;
$$;

-- create_group: mesmo corpo de 20261024120000_group_base.sql, com o veto.
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
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if not private.is_verified_locality_member(p_locality_id) then
    raise exception 'only verified locality members can create groups';
  end if;

  insert into public.groups (
    name, description, rules, visibility, locality_id, created_by, owner_user_id
  )
  values (
    p_name,
    p_description,
    nullif(btrim(coalesce(p_rules, '')), ''),
    p_visibility,
    p_locality_id,
    auth.uid(),
    auth.uid()
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, auth.uid(), 'owner', 'approved');

  return v_group_id;
end;
$$;

-- transition_listing: mesmo corpo de 20261021182942_sec006_listing_transition_audience.sql,
-- com o veto logo depois da autenticação.
create or replace function public.transition_listing(p_listing_id uuid, p_action text)
returns public.listing_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_listing public.listings;
  v_target public.listing_status;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  select *
    into v_listing
    from public.listings
   where id = p_listing_id
     for update;

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

  -- idempotente: já está no destino, nada muda e nada novo é auditado.
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

  -- Tornar o anuncio visivel exige que o dono alcance o publico escolhido.
  if v_target = 'active' then
    if v_listing.locality_id is not null
       and not private.is_locality_member(v_listing.locality_id) then
      raise exception 'listing audience requires locality membership' using errcode = '42501';
    end if;

    if v_listing.community_id is not null
       and not private.is_community_member(v_listing.community_id) then
      raise exception 'listing audience requires community membership' using errcode = '42501';
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

-- set_group_rules: mesmo corpo de 20261024120000_group_base.sql, com o veto no início.
create or replace function public.set_group_rules(
  p_group_id uuid,
  p_rules text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can change the rules';
  end if;

  update public.groups
  set rules = nullif(btrim(coalesce(p_rules, '')), '')
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;

-- pin_group_post: mesmo corpo de 20261024120000_group_base.sql, com o veto no início.
create or replace function public.pin_group_post(
  p_group_id uuid,
  p_post_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can pin publications';
  end if;

  -- O gatilho guard_group_pinned_post confere que a publicação é do grupo e
  -- não está removida; a checagem aqui é para devolver erro claro antes dele.
  if not exists (
    select 1
    from public.posts
    where id = p_post_id
      and group_id = p_group_id
      and is_deleted = false
  ) then
    raise exception 'publication is not an active publication of this group';
  end if;

  update public.groups
  set pinned_post_id = p_post_id
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;

-- unpin_group_post: mesmo corpo de 20261024120000_group_base.sql, com o veto no início.
create or replace function public.unpin_group_post(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can unpin publications';
  end if;

  update public.groups
  set pinned_post_id = null
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;

-- transfer_group_ownership: mesmo corpo de 20260802001000_groups_moderation.sql, com o veto no início.
create or replace function public.transfer_group_ownership(
  p_group_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can transfer ownership';
  end if;

  if not exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = p_new_owner_user_id
      and status = 'approved'
  ) then
    raise exception 'new owner must be an approved member of this group';
  end if;

  -- Demote current owner to moderator.
  update public.group_memberships
  set role = 'moderator'
  where group_id = p_group_id
    and user_id = (select auth.uid());

  -- Promote new owner.
  update public.group_memberships
  set role = 'owner'
  where group_id = p_group_id
    and user_id = p_new_owner_user_id;

  -- Update the owner_user_id column on the group.
  update public.groups
  set owner_user_id = p_new_owner_user_id
  where id = p_group_id;
end;
$$;

-- delete_group: mesmo corpo de 20260821000018_delete_group_rpc.sql, com o veto no início.
create or replace function public.delete_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can delete the group';
  end if;

  update public.groups
  set is_deleted = true
  where id = p_group_id;
end;
$$;

-- complete_event: mesmo corpo de 20261024090000_complete_event_session_identity.sql, com o veto no início.
create or replace function public.complete_event(
  p_event_id uuid,
  p_caller_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

  if v_caller is null or p_caller_user_id is distinct from v_caller then
    raise exception 'only the event organizer can complete the event';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = v_caller
  ) then
    raise exception 'only the event organizer can complete the event';
  end if;

  update public.events
  set status = 'completed', updated_at = now()
  where id = p_event_id;
end;
$$;

-- mark_recommendation_resolved: mesmo corpo de 20261024110000_lote5_pergunta.sql, com o veto no início.
create or replace function public.mark_recommendation_resolved(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

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

-- mark_recommendation_reply_resolved: mesmo corpo de 20261024110000_lote5_pergunta.sql, com o veto no início.
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
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

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

-- clear_recommendation_resolved_reply: mesmo corpo de 20261024110000_lote5_pergunta.sql, com o veto no início.
create or replace function public.clear_recommendation_resolved_reply(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

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

-- reopen_recommendation: mesmo corpo de 20261024110000_lote5_pergunta.sql, com o veto no início.
create or replace function public.reopen_recommendation(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not private.can_write_own_content() then
    raise exception 'account cannot write content' using errcode = '42501';
  end if;

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
