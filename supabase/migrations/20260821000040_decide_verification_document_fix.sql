-- 040: conserta o gate de decide_verification_document (H-Task 6)
--
-- Achado conferido em 2026-08-21: a funcao decide_verification_document
-- (20260820000007:82) checa public.is_current_user_operator((select auth.uid())),
-- mas o EXECUTE dela e concedido SO a service_role — e sob service_role nao ha
-- JWT, entao auth.uid() e NULL. Medido no banco local:
--
--   select auth.uid() as u_sob_service_role; -- NULL
--   select is_current_user_operator(NULL);    -- false (o user NULL nao e operador)
--
-- A funcao nao pode ser chamada com sucesso por ninguem hoje. Pelo cliente
-- autenticado falta o grant; pelo service_role o gate sempre nega. A Task 6
-- nao e "ligar o que existe" — e consertar isso primeiro.
--
-- O fix segue o contrato da casa (is_current_user_operator(uuid),
-- resolve_report, suspend_member, read_verification_status): o operador vem
-- EXPLICITO no parametro, o grant fica em service_role, e a funcao confia no
-- chamador — a autenticacao do operador acontece no Next, antes do RPC.
--
-- Mesma assinatura extendida com p_operator_user_id, mesmo grant, mesmo
-- search_path. O corpo da funcao muda so onde lia auth.uid().

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
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  if p_decision = 'rejected' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'a rejection requires a reason';
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

  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can decide verification documents';
  end if;

  if p_decision = 'approved' then
    -- The locality the membership lands on: the user's existing membership,
    -- if any. The document upload pre-dates the two-phase admission, so the
    -- document itself does not carry a locality; the operator's context is
    -- the right anchor and lives on reviewed_locality_id (preserved below).
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

    -- profiles has no locality_id (P0 Task 3 — one profile per person, the
    -- locality lives on locality_memberships, already inserted above).
    insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
    values (
      v_row.user_id,
      'Membro',
      'locality_members'::public.profile_visibility,
      1,
      now()
    )
    on conflict (user_id) do update set
      consent_version = greatest(profiles.consent_version, excluded.consent_version),
      consented_at = coalesce(profiles.consented_at, excluded.consented_at);
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
  end if;
end;
$$;

-- Grant vai para service_role (mesmo padrao de resolve_report e
-- is_current_user_operator). O gate confia no chamador — a autenticacao do
-- operador acontece no Next, antes do RPC.
revoke all on function public.decide_verification_document(uuid, text, text, uuid) from public;
revoke all on function public.decide_verification_document(uuid, text, text, uuid) from anon;
revoke all on function public.decide_verification_document(uuid, text, text, uuid) from authenticated;
grant execute on function public.decide_verification_document(uuid, text, text, uuid) to service_role;

-- A funcao antiga com 3 parametros NAO pode coexistir — vai estourar
-- "function is not unique" no PostgREST e em qualquer chamada existente.
-- Como a funcao nunca funcionou (o grant era service_role + gate usava
-- auth.uid() NULL), nenhum caminho em producao a chama com sucesso hoje;
-- a migracao nao tem consumer a atualizar.
drop function if exists public.decide_verification_document(uuid, text, text);
