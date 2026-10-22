-- A purga da conta passa a conhecer as entidades do ADR-20261022.
--
-- hidden_questions e support_tickets tem FK com ON DELETE CASCADE para
-- auth.users, o que basta se a linha de origem for apagada. A purga real nao
-- apaga: a rota chama auth.admin.deleteUser(id, true) (soft delete), a linha
-- de auth.users continua la e o cascade nao dispara. Por isso as remocoes
-- entram aqui, na mesma funcao que ja apaga o resto do dado pessoal - e na
-- mesma transacao que marca finalized_at.
--
-- Alem das tabelas, a purga resolve o que o cascade nao alcanca:
--   * a resposta do chamado que ficou no outbox, ligada pelo ticket_id do
--     payload - o destinatario pode ser um endereco que a pessoa ja trocou;
--   * a autoria (answered_by) em chamados de terceiros que o operador
--     respondeu antes de sair.
--
-- O resto da funcao e o de 20260915101543, linha por linha. Mudar qualquer
-- outra coisa aqui seria reabrir uma decisao que nao e desta migration.

create or replace function public.finalize_account_deletion(
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
         -- DATA-001 (20261022120200): o bairro do perfil é dado pessoal e sai na purga.
         neighborhood = null,
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

  -- Entidades novas do ADR-20261022 que a purga precisa conhecer. A conta nao e
  -- apagada de verdade: o GoTrue faz soft delete em auth.users, entao o ON
  -- DELETE CASCADE da FK nunca dispara aqui. Sem estas duas linhas, ocultacoes
  -- e chamados ficariam para sempre depois da exclusao.
  delete from public.hidden_questions where user_id = p_user_id;

  -- A resposta do chamado tambem foi para a fila de envio, endereçada ao e-mail
  -- da epoca. Se a pessoa trocou o endereco antes de excluir a conta,
  -- purge_account_contact_data (que limpa POR ENDERECO) nao acha essa linha, e
  -- ela sobreviveria com assunto e texto da resposta. O vinculo e o ticket_id no
  -- payload, nao o destinatario; por isso a remocao vem antes do chamado.
  delete from public.outbox o
   where o.type = 'support_answered'
     and exists (
       select 1
       from public.support_tickets t
       where t.user_id = p_user_id
         and t.id::text = o.payload ->> 'ticket_id'
     );

  delete from public.support_tickets where user_id = p_user_id;

  -- A pessoa pode ter respondido chamados de terceiros antes de sair. A resposta
  -- fica (e dela que o destinatario depende), mas a autoria sai: o ON DELETE SET
  -- NULL da FK nao dispara, porque a exclusao real e soft delete.
  update public.support_tickets
     set answered_by = null
   where answered_by = p_user_id;

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
