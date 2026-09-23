-- ADR-20260922-aprovacao-por-identidade-sem-cidade (aceito pelo dono em 22/09/2026).
--
-- decide_verification_document exigia cidade ja escolhida para aprovar, mas o
-- onboarding atual pede a cidade DEPOIS da verificacao. Ninguem novo passava
-- pela identidade. Esta versao aprova quem ainda nao tem cidade: documento
-- aprovado, resultado verified, e membership/perfil criados depois por
-- provision_member_locality. Com cidade, o comportamento anterior continua.
-- Autorizacao, expiracao, recusa e e-mail do outbox nao mudam.

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

    -- ADR-20260922-aprovacao-por-identidade-sem-cidade: sem cidade a aprovacao
    -- NAO falha mais. O documento e aprovado com reviewed_locality_id nulo, o
    -- resultado vira verified, e membership e perfil ficam para
    -- provision_member_locality, quando a pessoa escolher a cidade — o mesmo
    -- caminho do CPF aprovado.

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

    if v_locality_id is not null then
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
    end if;

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
