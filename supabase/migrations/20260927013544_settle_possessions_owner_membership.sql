-- A heranca de posse da purga passa a promover o herdeiro tambem na membership.
--
-- settle_account_possessions trocava so owner_user_id em communities/groups. O
-- dono, porem, e lido em dois lugares: a coluna e a linha de membership com
-- role = 'owner'. private.is_group_owner (delete_group, transfer_group_ownership)
-- e as telas de grupo e comunidade leem a MEMBERSHIP. Resultado: o herdeiro
-- recebia a coluna e nenhum poder — e, quando a posse ia para a operacao, a
-- operacao nem membro era. transfer_*_ownership sempre moveu os dois fatos
-- juntos; a purga agora faz o mesmo:
--   * herdeiro: upsert owner/approved (cria a linha quando a operacao nao era
--     membro; aprova uma linha pendente);
--   * dono antigo: rebaixado a 'member'. finalize_account_deletion remove essa
--     linha logo depois (ela so poupa a linha do DONO), mas o estado entre as
--     duas chamadas ja fica coerente se a finalizacao falhar e for repetida;
--   * grupo dentro de comunidade: enforce_group_community_membership exige que
--     o dono do grupo seja membro aprovado da comunidade. O moderador herdeiro
--     ja e; a operacao pode nao ser, e entra como membro aprovado — sem isso o
--     upsert falha e a purga fica presa em settle_failed para sempre;
--   * a operacao escolhida nunca e a propria conta purgada (uma conta que e a
--     operacao e sai herdaria de si mesma). Sem ninguem para herdar, nada muda,
--     como antes.

create or replace function public.settle_account_possessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_successor uuid;
  v_operations uuid;
  v_new_owner uuid;
  v_community uuid;
  v_group record;
begin
  select o.auth_user_id
    into v_operations
    from public.operators o
   where o.revoked_at is null
     and o.auth_user_id <> p_user_id
   order by o.granted_at
   limit 1;

  -- Comunidades antes dos grupos: se a operacao herda a comunidade, ela ja e
  -- membro aprovado quando o laco dos grupos passa pelos grupos dessa comunidade.
  for v_community in
    select c.id
      from public.communities c
     where c.owner_user_id = p_user_id
       and c.is_deleted = false
  loop
    select m.user_id
      into v_successor
      from public.community_memberships m
     where m.community_id = v_community
       and m.role = 'moderator'
       and m.status = 'approved'
       and m.user_id <> p_user_id
     order by m.joined_at
     limit 1;

    v_new_owner := coalesce(v_successor, v_operations);
    v_successor := null;

    continue when v_new_owner is null;

    update public.communities
       set owner_user_id = v_new_owner
     where id = v_community;

    insert into public.community_memberships (community_id, user_id, role, status)
    values (v_community, v_new_owner, 'owner', 'approved')
    on conflict (community_id, user_id)
    do update set role = 'owner', status = 'approved';

    update public.community_memberships
       set role = 'member'
     where community_id = v_community
       and user_id = p_user_id;
  end loop;

  for v_group in
    select g.id, g.community_id
      from public.groups g
     where g.owner_user_id = p_user_id
  loop
    select m.user_id
      into v_successor
      from public.group_memberships m
     where m.group_id = v_group.id
       and m.role = 'moderator'
       and m.status = 'approved'
       and m.user_id <> p_user_id
     order by m.joined_at
     limit 1;

    v_new_owner := coalesce(v_successor, v_operations);
    v_successor := null;

    continue when v_new_owner is null;

    if v_group.community_id is not null then
      insert into public.community_memberships (community_id, user_id, role, status)
      values (v_group.community_id, v_new_owner, 'member', 'approved')
      on conflict (community_id, user_id)
      do update set status = 'approved';
    end if;

    update public.groups
       set owner_user_id = v_new_owner
     where id = v_group.id;

    insert into public.group_memberships (group_id, user_id, role, status)
    values (v_group.id, v_new_owner, 'owner', 'approved')
    on conflict (group_id, user_id)
    do update set role = 'owner', status = 'approved';

    update public.group_memberships
       set role = 'member'
     where group_id = v_group.id
       and user_id = p_user_id;
  end loop;

  perform set_config('bivaque.listing_transition', 'on', true);
  update public.listings
     set status = 'closed',
         closed_at = now(),
         updated_at = now()
   where owner_user_id = p_user_id
     and status <> 'closed';
  perform set_config('bivaque.listing_transition', '', true);

  update public.provider_accounts
     set revoked_at = now(),
         revoked_by = null
   where auth_user_id = p_user_id
     and revoked_at is null;

  -- Pedidos de servico abertos: cancelam, e a OUTRA PONTA e avisada (ver
  -- 20260918214735_service_request_cancelled_notice.sql).
  with cancelados as (
    update public.service_requests
       set status = 'cancelled',
           updated_at = now()
     where (requester_user_id = p_user_id or provider_user_id = p_user_id)
       and status in ('open', 'in_conversation')
    returning id, requester_user_id, provider_user_id
  )
  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  )
  select
    case
      when c.requester_user_id = p_user_id then c.provider_user_id
      else c.requester_user_id
    end,
    null,
    'service_request',
    'cancelled_counterpart_left',
    'service_request',
    c.id
  from cancelados c;
end;
$$;

comment on function public.settle_account_possessions(uuid) is
  'Aplica as tres regras de posse da purga (decisoes de 18/09/2026): comunidade e grupo passam a moderador ou a operacao — coluna owner_user_id E membership owner/approved do herdeiro, dono antigo rebaixado a member; vitrine e anuncios encerram; pedidos de servico abertos cancelam, com aviso neutro a outra ponta (tipo service_request). Chamada pela rota de purga ANTES do soft delete da credencial.';

revoke all on function public.settle_account_possessions(uuid) from public;
revoke all on function public.settle_account_possessions(uuid) from anon;
revoke all on function public.settle_account_possessions(uuid) from authenticated;
grant execute on function public.settle_account_possessions(uuid) to service_role;

-- Reparo do que purgas anteriores ja deixaram: o dono da coluna sem a linha
-- owner/approved. Idempotente e restrito ao estado quebrado — onde a membership
-- ja esta certa, nada e tocado. Grupos de comunidade primeiro garantem a
-- membership na comunidade, pelo mesmo motivo do laco acima.
insert into public.community_memberships (community_id, user_id, role, status)
select c.id, c.owner_user_id, 'owner', 'approved'
  from public.communities c
 where c.is_deleted = false
   and not exists (
     select 1 from public.community_memberships m
      where m.community_id = c.id
        and m.user_id = c.owner_user_id
        and m.role = 'owner'
        and m.status = 'approved'
   )
on conflict (community_id, user_id)
do update set role = 'owner', status = 'approved';

insert into public.community_memberships (community_id, user_id, role, status)
select distinct g.community_id, g.owner_user_id, 'member'::public.community_membership_role,
       'approved'::public.community_membership_status
  from public.groups g
 where g.community_id is not null
   and not exists (
     select 1 from public.group_memberships m
      where m.group_id = g.id
        and m.user_id = g.owner_user_id
        and m.role = 'owner'
        and m.status = 'approved'
   )
on conflict (community_id, user_id)
do update set status = 'approved';

insert into public.group_memberships (group_id, user_id, role, status)
select g.id, g.owner_user_id, 'owner', 'approved'
  from public.groups g
 where not exists (
   select 1 from public.group_memberships m
    where m.group_id = g.id
      and m.user_id = g.owner_user_id
      and m.role = 'owner'
      and m.status = 'approved'
 )
on conflict (group_id, user_id)
do update set role = 'owner', status = 'approved';
