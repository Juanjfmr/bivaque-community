-- RECON-052-FOLLOWUP, decisao 3: o AVISO neutro que ficou nomeado no lote AN.
--
-- A decisao do responsavel (18/09/2026) foi cancelar o pedido de servico aberto
-- quando a conta purgada e parte dele, COM aviso neutro ao outro lado. O lote
-- AN entregou o cancelamento e deixou o aviso de fora de proposito: ele exige
-- um valor novo em public.notification_type, copy propria e deep-link, e o
-- repositorio tem card proprio (NOTIF-DEEPLINKS) dizendo que tipo mal ligado e
-- defeito. Emprestar um tipo existente seria mentira no dado — o tipo diz o
-- que a notificacao E.
--
-- Como o aviso e neutro, e nao uma explicacao:
--   * ele NAO diz que houve exclusao de conta. O motivo da saida e dado pessoal
--     de quem saiu, e a LGPD nao autoriza contar a terceiro;
--   * ele NAO nomeia ator (actor_user_id fica nulo), pelo mesmo motivo;
--   * ele diz o que a pessoa precisa saber para agir: o pedido foi encerrado
--     porque a outra parte nao esta mais na plataforma.

-- O enum e a unica forma de o tipo existir de verdade. ADD VALUE roda sozinho
-- aqui porque nada neste statement usa o valor novo; a funcao que o usa vem
-- depois (o Postgres proibe usar valor de enum recem-adicionado na mesma
-- transacao).
alter type public.notification_type add value if not exists 'service_request';

create or replace function public.settle_account_possessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_successor uuid;
  v_operations uuid;
  v_community uuid;
  v_group uuid;
begin
  select o.auth_user_id
    into v_operations
    from public.operators o
   where o.revoked_at is null
   order by o.granted_at
   limit 1;

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

    update public.communities
       set owner_user_id = coalesce(v_successor, v_operations, p_user_id)
     where id = v_community;

    v_successor := null;
  end loop;

  for v_group in
    select g.id from public.groups g where g.owner_user_id = p_user_id
  loop
    select m.user_id
      into v_successor
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

  -- 4. Pedidos de servico abertos: cancelam, e a OUTRA PONTA e avisada.
  --
  -- A notificacao nasce das linhas realmente canceladas (CTE), nao de uma
  -- segunda varredura: se nada casar, ninguem e avisado. O destinatario e quem
  -- NAO foi purgado. O CASE cobre as duas posicoes: pedinte e prestador.
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
  'Aplica as tres regras de posse da purga (decisoes de 18/09/2026): comunidade e grupo passam a moderador ou a operacao; vitrine e anuncios encerram; pedidos de servico abertos cancelam, com aviso neutro a outra ponta (tipo service_request). Chamada pela rota de purga ANTES do soft delete da credencial.';

revoke all on function public.settle_account_possessions(uuid) from public;
revoke all on function public.settle_account_possessions(uuid) from anon;
revoke all on function public.settle_account_possessions(uuid) from authenticated;
grant execute on function public.settle_account_possessions(uuid) to service_role;
