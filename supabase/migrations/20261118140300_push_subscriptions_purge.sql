-- RUN-188 (LAN-PUSH, parte web): a purga da conta apaga a inscricao de push.
--
-- ADR-20261107-push-no-aparelho, item 2 ("ao apagar a conta"). A FK de
-- push_subscriptions ja tem ON DELETE CASCADE, mas a exclusao do GoTrue e soft
-- delete: auth.users nunca sai de verdade, entao o CASCADE nao roda. A purga
-- manual e o caminho real, como nas outras tabelas pessoais. O corpo abaixo e o
-- vigente na main (20261116185541_pedido_cep_bairro_distancia.sql, que ja apaga
-- CEP e coordenadas do perfil, dos anuncios e dos pedidos) com uma linha nova;
-- nada mais mudou.
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
     set bio = null,
         neighborhood = null,
         cep = null,
         latitude = null,
         longitude = null,
         consent_version = 0,
         consented_at = null,
         updated_at = now()
   where user_id = p_user_id;

  update public.listings
     set cep = null,
         latitude = null,
         longitude = null,
         localizacao_publica = null
   where owner_user_id = p_user_id;

  -- LOC-IMPL L2 (RUN-179): a localização do pedido é a do solicitante.
  update public.service_requests
     set cep = null,
         latitude = null,
         longitude = null,
         region = null
   where requester_user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
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

  delete from public.hidden_questions where user_id = p_user_id;

  delete from public.member_entry_moments where user_id = p_user_id;

  delete from public.entry_progress where user_id = p_user_id;

  delete from public.entry_commitments where user_id = p_user_id;

  delete from public.outbox o
   where o.type = 'support_answered'
     and exists (
       select 1
       from public.support_tickets t
       where t.user_id = p_user_id
         and t.id::text = o.payload ->> 'ticket_id'
     );

  delete from public.support_tickets where user_id = p_user_id;

  update public.support_tickets
     set answered_by = null
   where answered_by = p_user_id;

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

  update public.operators
     set revoked_at = coalesce(revoked_at, now())
   where auth_user_id = p_user_id
     and revoked_at is null;

  update public.arrival_guide_entries set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports set resolved_by = null where resolved_by = p_user_id;

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
