-- RECON-019: leitura da situação do documento pelo próprio membro (prancha 69)
-- e os caminhos já registrados, para limpar objeto órfão de upload interrompido.
-- Os dois leitores são service_role; a autorização acontece no servidor Next,
-- que resolve o chamador pelos cookies — nunca o user_id vindo do cliente.

create function public.my_verification_document(p_user_id uuid)
returns table (
  document_id uuid,
  review_status text,
  uploaded_at timestamptz,
  needs_replacement boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.review_status::text,
    d.uploaded_at,
    (d.review_status = 'rejected') as needs_replacement
  from private.verification_documents d
  where d.user_id = p_user_id
  order by d.uploaded_at desc, d.id desc
  limit 1;
$$;

revoke all on function public.my_verification_document(uuid) from public;
revoke all on function public.my_verification_document(uuid) from anon;
revoke all on function public.my_verification_document(uuid) from authenticated;
grant execute on function public.my_verification_document(uuid) to service_role;

create function public.my_verification_document_paths(p_user_id uuid)
returns table (storage_object_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.storage_object_path
  from private.verification_documents d
  where d.user_id = p_user_id;
$$;

revoke all on function public.my_verification_document_paths(uuid) from public;
revoke all on function public.my_verification_document_paths(uuid) from anon;
revoke all on function public.my_verification_document_paths(uuid) from authenticated;
grant execute on function public.my_verification_document_paths(uuid) to service_role;
