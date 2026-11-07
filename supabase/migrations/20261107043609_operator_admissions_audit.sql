-- RUN-024: trilha durável, aviso e descarte após a decisão; sem conteúdo documental.
alter type public.notification_type add value if not exists 'verification_decision';

create table public.operator_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  reason text check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);
create index operator_actions_created_idx on public.operator_actions(created_at desc, id);
alter table public.operator_actions enable row level security;
alter table public.operator_actions force row level security;
revoke all on public.operator_actions from public, anon, authenticated;
grant select on public.operator_actions to authenticated;
grant select, insert on public.operator_actions to service_role;
create policy operator_actions_select_operator on public.operator_actions
  for select to authenticated
  using ((select public.is_current_user_operator((select auth.uid()))));

alter table private.verification_documents add column storage_removed_at timestamptz;

create trigger operator_actions_scrub_reason before insert on public.operator_actions
  for each row execute function private.scrub_report_reason();

create function private.record_document_decision()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.review_status <> old.review_status and new.review_status <> 'pending' then
    insert into public.operator_actions(actor_id, action, target_type, target_id, reason)
    values (new.reviewed_by, 'document_' || new.review_status::text,
      'verification_document', new.id, left(new.rejection_reason, 1000));
    insert into public.notifications(recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values (new.user_id, null, 'verification_decision', new.review_status::text, 'user', new.user_id);
    insert into private.verification_document_removals(storage_object_path)
    values (new.storage_object_path) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.record_document_decision() from public, anon, authenticated;
create trigger verification_document_operator_decision
  after update of review_status on private.verification_documents
  for each row execute function private.record_document_decision();

create function public.read_operator_verification_document(p_document_id uuid, p_operator_user_id uuid)
returns table(storage_object_path text)
language plpgsql security definer set search_path = ''
as $$
declare v_path text;
begin
  if not coalesce(public.is_current_user_operator(p_operator_user_id), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select d.storage_object_path into v_path from private.verification_documents d
    where d.id = p_document_id and d.review_status = 'pending' and d.expires_at > now()
    for share;
  if not found then return; end if;
  insert into public.operator_actions(actor_id, action, target_type, target_id)
    values (p_operator_user_id, 'document_opened', 'verification_document', p_document_id);
  return query select v_path;
end;
$$;
revoke all on function public.read_operator_verification_document(uuid, uuid) from public, anon, authenticated;
grant execute on function public.read_operator_verification_document(uuid, uuid) to service_role;

create or replace function private.verification_documents_purge_expired()
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  insert into private.verification_document_removals(storage_object_path)
    select d.storage_object_path from private.verification_documents d
    where (d.expires_at <= now() or d.review_status <> 'pending')
      and d.storage_removed_at is null
    on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function private.verification_documents_purge_expired() from public, anon, authenticated;

create function public.prepare_operator_document_removals(p_operator_user_id uuid)
returns table(storage_object_path text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(public.is_current_user_operator(p_operator_user_id), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.verification_documents_purge_expired();
  insert into public.operator_actions(actor_id, action, target_type, target_id)
    values (p_operator_user_id, 'document_purge_requested', 'verification_queue', p_operator_user_id);
  return query select r.storage_object_path from private.verification_document_removals r
    order by r.enqueued_at, r.id limit 100;
end;
$$;
revoke all on function public.prepare_operator_document_removals(uuid) from public, anon, authenticated;
grant execute on function public.prepare_operator_document_removals(uuid) to service_role;

create or replace function public.complete_verification_document_removal(p_storage_object_path text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_storage_object_path is null or btrim(p_storage_object_path) = '' then
    raise exception 'storage_object_path is required';
  end if;
  update private.verification_documents set purge_state = 'purged', storage_removed_at = now()
    where storage_object_path = p_storage_object_path
      and (review_status <> 'pending' or expires_at <= now());
  delete from private.verification_document_removals where storage_object_path = p_storage_object_path;
end;
$$;

create function public.operator_reprocess_verification(p_user_id uuid, p_operator_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(public.is_current_user_operator(p_operator_user_id), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.verification_reconcile_step(p_user_id);
  insert into public.operator_actions(actor_id, action, target_type, target_id)
    values (p_operator_user_id, 'verification_reprocessed', 'user', p_user_id);
end;
$$;
revoke all on function public.operator_reprocess_verification(uuid, uuid) from public, anon, authenticated;
grant execute on function public.operator_reprocess_verification(uuid, uuid) to service_role;

create function public.operator_reject_pending(p_user_id uuid, p_operator_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.reject_pending_user(p_user_id, p_operator_user_id, p_reason);
  insert into public.operator_actions(actor_id, action, target_type, target_id, reason)
    values (p_operator_user_id, 'admission_rejected', 'user', p_user_id, left(p_reason, 1000));
end;
$$;
revoke all on function public.operator_reject_pending(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.operator_reject_pending(uuid, uuid, text) to service_role;

-- O job só alcança objetos que já estão na fila durável; não aceita caminhos do chamador.
create function public.prepare_verification_document_removals()
returns table(storage_object_path text)
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.verification_documents_purge_expired();
  return query select r.storage_object_path from private.verification_document_removals r
    order by r.enqueued_at, r.id limit 100;
end;
$$;
revoke all on function public.prepare_verification_document_removals() from public, anon, authenticated;
grant execute on function public.prepare_verification_document_removals() to service_role;

create function private.dispatch_verification_document_removals()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_endpoint text; v_secret text;
begin
  select decrypted_secret into v_endpoint from vault.decrypted_secrets
    where name = 'outbox-worker-endpoint';
  select decrypted_secret into v_secret from vault.decrypted_secrets
    where name = 'outbox-worker-secret';
  if coalesce(v_endpoint, '') = '' or coalesce(v_secret, '') = '' then return; end if;
  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/admin/document-removals',
    headers := jsonb_build_object('Content-Type','application/json','x-outbox-secret',v_secret),
    body := '{}'::jsonb, timeout_milliseconds := 30000
  );
end;
$$;
revoke all on function private.dispatch_verification_document_removals() from public, anon, authenticated;
select cron.schedule('bivaque-document-removals','*/5 * * * *',
  'select private.dispatch_verification_document_removals()');
