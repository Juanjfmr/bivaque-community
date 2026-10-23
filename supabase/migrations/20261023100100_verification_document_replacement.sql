-- PORT-004 (lote 4, frente B): troca do documento durante a análise.
--
-- O protótipo oferece "Enviar outro documento" com o arquivo ainda na fila
-- (`renderEntryPending` em prototypes/bivaque-html/src/features/entry/account.js).
-- O servidor de hoje não permitia: a tabela admite uma única análise pendente
-- por pessoa (`verification_documents_one_pending_per_user`), e
-- `submit_verification_document` recusa o segundo arquivo com 23505. Esta
-- função substitui a linha pendente na mesma transação, em vez de abrir uma
-- segunda análise paralela — o operador continua decidindo um arquivo por
-- pessoa, e a decisão vale para o mais recente.
--
-- A autorização não muda: security definer, execute só para service_role,
-- chamado pelo servidor Next, que resolve o chamador pelos cookies. A tabela
-- privada continua fora da Data API, e a preferência do membro não passa por
-- aqui.

create function public.replace_verification_document(
  p_user_id uuid,
  p_storage_object_path text,
  p_mime_type text
)
returns table (
  document_id uuid,
  replaced_storage_object_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_replaced_path text;
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

  -- O arquivo anterior ainda não recebeu decisão: a linha sai e o caminho
  -- volta para quem chamou remover o objeto do bucket. Sem pendente (a análise
  -- já terminou ou nunca começou), a função só registra o arquivo novo.
  delete from private.verification_documents d
   where d.user_id = p_user_id
     and d.review_status = 'pending'
  returning d.storage_object_path into v_replaced_path;

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

  return query select v_document_id, v_replaced_path;
end;
$$;

revoke all on function public.replace_verification_document(uuid, text, text) from public;
revoke all on function public.replace_verification_document(uuid, text, text) from anon;
revoke all on function public.replace_verification_document(uuid, text, text) from authenticated;
grant execute on function public.replace_verification_document(uuid, text, text) to service_role;
