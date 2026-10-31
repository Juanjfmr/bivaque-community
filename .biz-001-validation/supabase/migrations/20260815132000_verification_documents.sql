-- D2: audited document upload is the exception path when the Portal says
-- "no" or is unstable. Documents are private, expire after 7 days, and are
-- never readable by the browser directly. The application uploads them as
-- service_role and records only public-safe metadata in the admissions
-- queue; the operator decides later.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create type private.verification_document_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table private.verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_object_path text not null check (char_length(storage_object_path) > 0),
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  review_status private.verification_document_status not null default 'pending',
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  check (expires_at > uploaded_at),
  check (
    (review_status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (review_status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);

create index verification_documents_user_uploaded_idx
  on private.verification_documents (user_id, uploaded_at desc);

create unique index verification_documents_one_pending_per_user
  on private.verification_documents (user_id)
  where review_status = 'pending';

alter table private.verification_documents enable row level security;
alter table private.verification_documents force row level security;

revoke all on table private.verification_documents from anon, authenticated;
grant all on table private.verification_documents to service_role;

create function public.submit_verification_document(
  p_user_id uuid,
  p_storage_object_path text,
  p_mime_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
begin
  if p_storage_object_path is null or btrim(p_storage_object_path) = '' then
    raise exception 'storage_object_path is required';
  end if;

  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'unsupported document mime type';
  end if;

  if exists (
    select 1
    from private.verification_outcomes
    where user_id = p_user_id
      and status = 'verified'
  ) then
    raise exception 'user is already verified';
  end if;

  insert into private.verification_documents (
    user_id,
    storage_object_path,
    mime_type,
    expires_at
  )
  values (
    p_user_id,
    p_storage_object_path,
    p_mime_type,
    now() + interval '7 days'
  )
  returning id into v_document_id;

  perform private.upsert_verification_outcome(p_user_id, 'pending');

  return v_document_id;
end;
$$;

revoke all on function public.submit_verification_document(uuid, text, text) from public;
revoke all on function public.submit_verification_document(uuid, text, text) from anon;
revoke all on function public.submit_verification_document(uuid, text, text) from authenticated;
grant execute on function public.submit_verification_document(uuid, text, text) to service_role;

-- Public-safe view into the document backlog for the operator panel. It
-- deliberately excludes storage_object_path: a path is not a decision, and
-- the signed URL that lets an operator read the document is issued by the
-- server only after an operator check.
create function public.list_verification_documents()
returns table (
  document_id uuid,
  user_id uuid,
  mime_type text,
  review_status text,
  uploaded_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    id,
    user_id,
    mime_type,
    review_status::text,
    uploaded_at,
    expires_at
  from private.verification_documents
  where review_status = 'pending'
    and expires_at > now()
  order by uploaded_at asc;
$$;

revoke all on function public.list_verification_documents() from public;
revoke all on function public.list_verification_documents() from anon;
revoke all on function public.list_verification_documents() from authenticated;
grant execute on function public.list_verification_documents() to service_role;
