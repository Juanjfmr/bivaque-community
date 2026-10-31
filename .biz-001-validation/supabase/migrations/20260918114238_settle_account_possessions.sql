-- RECON-052-FOLLOWUP: o que a purga NAO podia decidir sozinha, decidido.
--
-- A purga apaga dado pessoal, preferencia e participacao. Ela nao dissolvia
-- posse nem encerrava superficie operacional, e o rodape de
-- 20260915101543_account_deletion.sql registrava a lacuna em vez de inventar:
--
--   * communities.owner_user_id / groups.owner_user_id: a conta purgada
--     continuava dona;   * provider_accounts e listings ativos: vitrine e
--     anuncio de quem nao existe mais seguiam no ar;   * service_requests
--     abertos seguiam abertos.
--
-- O rodape NAO e editado (migration aplicada nao se edita, nem comentario).
-- Esta migration e a reconciliacao: ela fecha as tres lacunas e o comentario
-- fica aqui, onde pode ser lido sem reescrever historia.
--
-- Decisoes do responsavel (18/09/2026):
--   1. posse de comunidade/grupo vai para um MODERADOR existente e, sem
--      moderador, para a OPERACAO. Dissolver esta descartado: apagaria
--      conteudo de terceiros, contra o item 4 do ADR-20260914;
--   2. vitrine e anuncios ENCERRAM (anuncio sem dono e telefone que nao
--      existe);
--   3. pedidos de servico abertos com a conta entre as partes sao CANCELADOS.
--
-- Nomeado e nao entregue aqui: o AVISO neutro ao outro lado do pedido. Ele
-- exige um tipo novo em public.notification_type mais copy e deep-link, e o
-- repositorio tem card proprio (NOTIF-DEEPLINKS) dizendo que tipo mal ligado
-- e defeito. Cancela primeiro; avisa quando a superficie existir.

create function public.settle_account_possessions(p_user_id uuid)
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
  -- A operacao e quem administra quando nao ha sucessor natural. O operador
  -- ativo mais antigo, para o resultado nao depender da ordem de leitura.
  select o.auth_user_id
    into v_operations
    from public.operators o
   where o.revoked_at is null
   order by o.granted_at
   limit 1;

  -- 1. Comunidades: moderador aprovado mais antigo; sem ele, a operacao.
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

    -- Sem sucessor e sem operador, a posse fica como esta: e melhor uma
    -- comunidade sem dono do que um dono que nao existe nem operacao que
    -- nao foi nomeada. O pgTAP cobre os dois caminhos.
    update public.communities
       set owner_user_id = coalesce(v_successor, v_operations, p_user_id)
     where id = v_community;

    v_successor := null;
  end loop;

  -- 2. Grupos: mesma regra.
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

  -- 3. Vitrine e anuncios: encerram. Anuncio de conta que nao existe mais e
  -- porta fechada anunciada como aberta. Quem salvou passa a ver
  -- 'indisponivel' sem herdar conteudo (isso ja esta implementado em /salvos).
  --
  -- O status de listings e protegido por private.listings_guard_status_transition
  -- (o mesmo set_config que public.transition_listing usa). Como aqui a transicao
  -- 'active->closed' e exatamente a regra de negocio da purga, a guarda e aberta
  -- com o mesmo GUC local a transacao e fechada logo depois, para nao salgar o
  -- resto da transacao com statuses que a UI nao autorizaria.
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

  -- 4. Pedidos de servico abertos: cancelam.
  update public.service_requests
     set status = 'cancelled'
   where (requester_user_id = p_user_id or provider_user_id = p_user_id)
     and status in ('open', 'in_conversation');
end;
$$;

comment on function public.settle_account_possessions(uuid) is
  'Aplica as tres regras de posse da purga (decisoes de 18/09/2026): comunidade e grupo passam a moderador ou a operacao; vitrine e anuncios encerram; pedidos de servico abertos cancelam. Chamada pela rota de purga ANTES do soft delete da credencial.';

-- Interna: quem chama e a rota de purga, com service_role. Ninguem mais.
revoke all on function public.settle_account_possessions(uuid) from public;
revoke all on function public.settle_account_possessions(uuid) from anon;
revoke all on function public.settle_account_possessions(uuid) from authenticated;
grant execute on function public.settle_account_possessions(uuid) to service_role;
