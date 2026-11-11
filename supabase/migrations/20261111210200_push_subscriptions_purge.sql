-- RUN-137 (LAN-PUSH, parte web): a purga da conta apaga a inscricao de push.
--
-- ADR-20261107-push-no-aparelho, item 2 ("ao apagar a conta"). A FK de
-- push_subscriptions ja tem ON DELETE CASCADE, mas a exclusao do GoTrue e soft
-- delete: auth.users nunca sai de verdade, entao o CASCADE nao roda. A purga
-- manual e o caminho real, como nas outras tabelas pessoais. O corpo abaixo e o
-- vigente de 20261110211702_profile_location.sql (que ja apaga CEP e coordenadas)
-- com uma linha nova; nada mais mudou.
--
-- O item 2 tambem manda apagar a inscricao parada ha 90 dias sem envio aceito;
-- e o job diario no fim deste arquivo.

begin;

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
         -- LOC-IMPL (RUN-029): CEP e coordenada de cálculo privado também saem.
         cep = null,
         latitude = null,
         longitude = null,
         consent_version = 0,
         consented_at = null,
         updated_at = now()
   where user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
  -- RUN-137: o destino de push do aparelho e dado do titular. A exclusao real
  -- e soft delete, entao o ON DELETE CASCADE da FK de push_subscriptions nunca
  -- dispara aqui: sem esta linha, o aparelho continuaria recebendo aviso da
  -- conta apagada.
  delete from public.push_subscriptions where user_id = p_user_id;
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

  -- PORT-005: o momento declarado (cidade, datas e destino) é dado pessoal e
  -- some junto. O protótipo descarta o rascunho ao concluir a entrada; a linha
  -- do banco é o que a Início e as boas-vindas leem, e por isso é apagada aqui.
  delete from public.member_entry_moments where user_id = p_user_id;

  -- O rascunho da entrada (progresso do onboarding) também é dado pessoal e
  -- some junto; quem concluiu a entrada já não tem linha, porque a rota apaga
  -- o rascunho ao provisionar.
  delete from public.entry_progress where user_id = p_user_id;

  -- O combinado da entrada também é dado do titular e some junto.
  delete from public.entry_commitments where user_id = p_user_id;

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

-- ── retencao: 90 dias sem envio aceito ──────────────────────────────────────
-- A data de criacao vale como marco inicial para quem nunca recebeu nada;
-- reinscrever o mesmo destino renova a linha. A tela de preferencias regrava a
-- inscricao ao abrir, entao quem usa o push mantem a linha viva.
create or replace function private.purge_stale_push_subscriptions()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with removidas as (
    delete from public.push_subscriptions
     where coalesce(last_success_at, created_at) < now() - interval '90 days'
    returning 1
  )
  select count(*) from removidas;
$$;

comment on function private.purge_stale_push_subscriptions() is
  'Apaga inscricoes de push sem envio aceito ha 90 dias (ADR-20261107, item 2). Chamada pelo job diario do pg_cron; service_role pode executar para prova manual.';

revoke all on function private.purge_stale_push_subscriptions() from public, anon, authenticated;
grant execute on function private.purge_stale_push_subscriptions() to service_role;

-- Idempotente: reaplicar a migration nao cria job duplicado.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'bivaque-push-subscriptions-purge') then
    perform cron.unschedule('bivaque-push-subscriptions-purge');
  end if;
end
$$;

select cron.schedule(
  'bivaque-push-subscriptions-purge',
  '41 4 * * *',
  'select private.purge_stale_push_subscriptions()'
);

commit;
