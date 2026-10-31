-- MVP-01-ADMISSION item 2: enfileirar e-mail de decisão documental no outbox.
--
-- O fluxo de admissão por documento decide no painel do operador
-- (decide_verification_document) ou rejeita definitivamente um pending
-- (reject_pending_user). Nenhum dos dois enfileirava mensagem no outbox — só
-- o caminho automático (verification_reconcile_step) enfileirava
-- 'verification_resolved' quando o teto de reconciliação era atingido. Sem a
-- entrega de decisão, quem enviou um documento nunca era avisado do desfecho.
--
-- Esta migration re-cria as duas funções com o mesmo contrato (mesmos
-- parâmetros, mesmos gates, mesmo grant service_role) e adiciona o insert no
-- outbox com o e-mail do usuário e um payload mínimo (user_id, status, motivo
-- apenas quando aplicável). O worker existente (private.outbox_prepare_due +
-- o endpoint interno /api/internal/outbox) entrega pelo adaptador Resend.
--
-- Regra de privacidade preservada: o motivo exato de rejeição NUNCA vai no
-- payload — 'reason' é audit-only no banco; o e-mail usa copy fixa.

create or replace function public.decide_verification_document(
  p_document_id uuid,
  p_decision text,
  p_reason text,
  p_operator_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.verification_documents;
  v_locality_id uuid;
  v_email text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  if p_decision = 'rejected' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'a rejection requires a reason';
  end if;

  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can decide verification documents';
  end if;

  select * into v_row
    from private.verification_documents
    where id = p_document_id
    for update;

  if not found then
    raise exception 'document not found';
  end if;

  if v_row.review_status <> 'pending' then
    raise exception 'document already reviewed';
  end if;

  if v_row.expires_at <= now() then
    raise exception 'document already expired; no decision possible';
  end if;

  if p_decision = 'approved' then
    select locality_id into v_locality_id
    from public.locality_memberships
    where user_id = v_row.user_id
    order by locality_id asc
    limit 1;

    if v_locality_id is null then
      raise exception 'cannot approve: no locality for the user';
    end if;

    update private.verification_documents
      set review_status = 'approved',
          reviewed_by = p_operator_user_id,
          reviewed_at = now(),
          reviewed_locality_id = v_locality_id,
          purge_state = null
      where id = p_document_id;

    perform private.upsert_verification_outcome(
      v_row.user_id,
      'verified'::private.verification_status,
      'active_federal_military'::private.eligibility_class
    );

    insert into public.locality_memberships (user_id, locality_id)
    values (v_row.user_id, v_locality_id)
    on conflict (user_id, locality_id) do nothing;

    insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
    values (
      v_row.user_id,
      'Membro',
      'locality_members'::public.profile_visibility,
      1,
      now()
    )
    on conflict (user_id) do update
      set visibility = 'locality_members'::public.profile_visibility,
          consent_version = greatest(profiles.consent_version, excluded.consent_version),
          consented_at = coalesce(profiles.consented_at, excluded.consented_at);

    select u.email into v_email
    from auth.users u
    where u.id = v_row.user_id;

    if v_email is not null and v_email <> '' then
      insert into public.outbox (recipient, channel, type, payload)
      values (
        v_email,
        'email',
        'verification_decision',
        jsonb_build_object(
          'user_id', v_row.user_id,
          'status', 'approved'
        )
      );
    end if;
  else
    update private.verification_documents
      set review_status = 'rejected',
          reviewed_by = p_operator_user_id,
          reviewed_at = now(),
          reviewed_locality_id = (select locality_id from public.locality_memberships where user_id = v_row.user_id limit 1),
          rejection_reason = p_reason
      where id = p_document_id;

    perform private.upsert_verification_outcome(
      v_row.user_id,
      'rejected'::private.verification_status
    );

    select u.email into v_email
    from auth.users u
    where u.id = v_row.user_id;

    if v_email is not null and v_email <> '' then
      insert into public.outbox (recipient, channel, type, payload)
      values (
        v_email,
        'email',
        'verification_decision',
        jsonb_build_object(
          'user_id', v_row.user_id,
          'status', 'rejected'
        )
      );
    end if;
  end if;
end;
$$;

revoke all on function public.decide_verification_document(uuid, text, text, uuid) from public;
revoke all on function public.decide_verification_document(uuid, text, text, uuid) from anon;
revoke all on function public.decide_verification_document(uuid, text, text, uuid) from authenticated;
grant execute on function public.decide_verification_document(uuid, text, text, uuid) to service_role;

-- reject_pending_user: mesmo princípio — o operador encerra o caso sem
-- documento; a pessoa recebe o e-mail de rejeição.

create or replace function public.reject_pending_user(
  p_user_id uuid,
  p_operator_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status private.verification_status;
  v_email text;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can reject admissions' using errcode = '42501';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a rejection requires a reason' using errcode = '22023';
  end if;

  select status into v_status
    from private.verification_outcomes
    where user_id = p_user_id;

  if not found then
    raise exception 'no verification outcome for user' using errcode = '02000';
  end if;

  if v_status = 'verified' then
    raise exception 'user already verified; nothing to reject' using errcode = '22023';
  end if;

  if v_status = 'rejected' then
    raise exception 'user already rejected; nothing to reject' using errcode = '22023';
  end if;

  perform private.upsert_verification_outcome(
    p_user_id,
    'rejected'::private.verification_status
  );

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    p_user_id, p_operator_user_id, 'admission_rejected', 'rejected', 'user', p_user_id
  );

  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is not null and v_email <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email,
      'email',
      'verification_decision',
      jsonb_build_object(
        'user_id', p_user_id,
        'status', 'rejected'
      )
    );
  end if;
end;
$$;

revoke all on function public.reject_pending_user(uuid, uuid, text) from public;
revoke all on function public.reject_pending_user(uuid, uuid, text) from anon;
revoke all on function public.reject_pending_user(uuid, uuid, text) from authenticated;
grant execute on function public.reject_pending_user(uuid, uuid, text) to service_role;
