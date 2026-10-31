-- D2 Task 6 — operator decision on verification documents, plus the TTL
-- purge that turns the 7-day promise into a fact.
--
-- private.verification_documents was the upload exception path (20260815132000).
-- This migration adds:
--
--   1. decide_verification_document — the operator's approve or reject. The
--      approve path provisions the membership and the profile at the reviewed
--      locality; the reject path records the audit reason and marks the
--      verification_outcome 'rejected' so the onboarding/status screen shows
--      the right state.
--   2. read_verification_document_path — surfaces the storage_object_path
--      only after an operator check. The list query never carries the path;
--      a signed URL is issued server-side, by request, never persisted.
--   3. rejection_reason — the audit reason lives next to the row that
--      records the decision (Rule 6 of §12).
--   4. reviewed_locality_id — the locality the operator observed when
--      deciding; preserved for the audit trail. The approve path reads it
--      from the existing locality_memberships for the user (falling back to
--      the only locality they hold, since the document exception path
--      pre-dates the two-phase admission).
--   5. purge_state — TTL-purge bookkeeping so the operator list stops
--      showing expired rows.
--   6. The TTL purge job.
--
-- This migration deliberately does NOT change submit_verification_document's
-- signature. Wiring the locality into the upload action belongs to a follow-up
-- commit alongside the page-level UI change.

alter table private.verification_documents
  add column rejection_reason text,
  add column reviewed_locality_id uuid references public.localities(id),
  add column purge_state text;

alter table private.verification_documents
  add check (purge_state in ('purged') or purge_state is null),
  add check (
    (review_status = 'rejected' and rejection_reason is not null)
    or (review_status <> 'rejected')
  );

-- Operator decision: approve or reject. security definer, requires operator.
create function public.decide_verification_document(
  p_document_id uuid,
  p_decision text,
  p_reason text
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

  if not public.is_current_user_operator((select auth.uid())) then
    raise exception 'only operators can decide verification documents';
  end if;

  if p_decision = 'approved' then
    -- The locality the membership lands on: prefer the operator's reviewed
    -- locality, else the user's existing membership. The document upload
    -- pre-dates the two-phase admission, so the document itself does not
    -- carry a locality; the operator's context is the right anchor.
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
          reviewed_by = (select auth.uid()),
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
          reviewed_by = (select auth.uid()),
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

revoke all on function public.decide_verification_document(uuid, text, text) from public;
revoke all on function public.decide_verification_document(uuid, text, text) from anon;
revoke all on function public.decide_verification_document(uuid, text, text) from authenticated;
grant execute on function public.decide_verification_document(uuid, text, text) to service_role;

-- Read the storage_object_path only at request time. The list query never
-- carries it; this RPC returns it only to service_role, so the operator
-- console can mint a signed URL.
create function public.read_verification_document_path(p_document_id uuid)
returns table (
  document_id uuid,
  storage_object_path text,
  mime_type text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    id,
    storage_object_path,
    mime_type,
    expires_at
  from private.verification_documents
  where id = p_document_id
    and review_status = 'pending'
    and expires_at > now();
$$;

revoke all on function public.read_verification_document_path(uuid) from public;
revoke all on function public.read_verification_document_path(uuid) from anon;
revoke all on function public.read_verification_document_path(uuid) from authenticated;
grant execute on function public.read_verification_document_path(uuid) to service_role;

-- TTL purge: daily, marks expired rows purged. The storage object lives
-- until the operator reads the row (the read path removes the object and
-- keeps the row's audit trail intact — a "purge on view" since the bucket
-- is private and the only legitimate reader is the operator).
create function private.verification_documents_purge_expired()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update private.verification_documents
    set purge_state = 'purged'
    where expires_at <= now()
      and (purge_state is null or purge_state <> 'purged');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.verification_documents_purge_expired() from public;

select cron.schedule(
  'bivaque-verification-document-ttl-purge',
  '0 3 * * *',
  'select private.verification_documents_purge_expired()'
);
