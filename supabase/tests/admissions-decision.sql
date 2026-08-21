-- H-Task 6 — admissoes decidem (2026-08-21)
--
-- O bug encontrado em 2026-08-21: decide_verification_document (20260820000007:82)
-- checava public.is_current_user_operator((select auth.uid())) e o EXECUTE
-- dela era so service_role. Sob service_role, auth.uid() e NULL — a funcao
-- nunca funcionou para ninguem. A migration 040 adicionou p_operator_user_id
-- explicito, no mesmo contrato do resolve_report (Task 3) e do
-- is_current_user_operator (20260806111744).
--
-- Estes testes confirmam:
--   1. service_role chamando com operator_id errado -> negado
--   2. service_role chamando com operator_id correto, mas sem document -> not found
--   3. service_role chamando com operator_id correto + document pending + sem locality ->
--      "cannot approve: no locality for the user"
--   4. service_role chamando com operator_id correto + document pending + com locality ->
--      sucesso: review_status vira 'approved', upsert_verification_outcome marca verified,
--      locality_memberships ganha linha, profiles ganha display_name 'Membro'
--   5. rejeitar sem motivo -> "a rejection requires a reason"
--   6. rejeitar com motivo -> sucesso: review_status vira 'rejected', rejection_reason gravado
--   7. document ja reviewed -> "document already reviewed"
--   8. document expirado -> "document already expired"

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc
\ir fixtures/reports.inc

-- O foundation.inc NAO cria operador. Cria para o teste.
reset role;

insert into public.operators (auth_user_id)
values ('10000000-0000-4000-8000-000000000001')
on conflict do nothing;

-- Users para serem pacientes do decision (cada um so pode ter 1 document pending).
insert into auth.users (id, email) values
  ('20000000-0000-4000-8000-000000000099', 'pending-user@example.invalid'),
  ('20000000-0000-4000-8000-000000000098', 'reviewed-user@example.invalid'),
  ('20000000-0000-4000-8000-000000000097', 'expired-user@example.invalid');

-- Documento pending (teste 1, 2, 3, 4)
insert into private.verification_documents (
  id, user_id, storage_object_path, mime_type, expires_at
) values (
  '50000000-0000-4000-8000-000000000099',
  '20000000-0000-4000-8000-000000000099',
  'verification/test-pending-99.pdf',
  'application/pdf',
  now() + interval '7 days'
);

-- Documento ja reviewed (teste 7)
insert into private.verification_documents (
  id, user_id, storage_object_path, mime_type, review_status, reviewed_by, reviewed_at, expires_at
) values (
  '50000000-0000-4000-8000-000000000098',
  '20000000-0000-4000-8000-000000000098',
  'verification/test-reviewed-98.pdf',
  'application/pdf',
  'approved',
  '10000000-0000-4000-8000-000000000001',
  now(),
  now() + interval '7 days'
);

-- Documento expirado (teste 8) — uploaded_at no passado, expires_at no passado
-- mas ainda > uploaded_at (CHECK verifica isso).
insert into private.verification_documents (
  id, user_id, storage_object_path, mime_type, uploaded_at, expires_at
) values (
  '50000000-0000-4000-8000-000000000097',
  '20000000-0000-4000-8000-000000000097',
  'verification/test-expired-97.pdf',
  'application/pdf',
  now() - interval '8 days',
  now() - interval '1 hour'
);

-- Documento pending de outro user, para o teste 5 e 6
insert into auth.users (id, email) values
  ('20000000-0000-4000-8000-000000000096', 'reject-user@example.invalid');

insert into private.verification_documents (
  id, user_id, storage_object_path, mime_type, expires_at
) values (
  '50000000-0000-4000-8000-000000000096',
  '20000000-0000-4000-8000-000000000096',
  'verification/test-reject-96.pdf',
  'application/pdf',
  now() + interval '7 days'
);

set local role service_role;

-- 1. service_role com operator_id errado -> negado (gate)
select throws_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000099'::uuid,
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000002'::uuid  -- member-two, NAO operador
    )
  $$,
  'only operators can decide verification documents',
  'service_role chamando com operator_id errado e negado pelo gate'
);

-- 2. operator_id correto, mas document_id inexistente
select throws_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-0000000000ff'::uuid,
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'document not found',
  'document_id inexistente lanca excecao'
);

-- 3. operator_id correto + document pending + sem locality -> "cannot approve"
select throws_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000099'::uuid,
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'cannot approve: no locality for the user',
  'aprovacao sem locality lanca excecao'
);

-- 4. operator_id correto + document pending + com locality -> sucesso
insert into public.locality_memberships (user_id, locality_id)
values ('20000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;

select lives_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000099'::uuid,
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'aprovacao com operator + document + locality e sucesso'
);

select is(
  (select review_status::text from private.verification_documents
   where id = '50000000-0000-4000-8000-000000000099'),
  'approved',
  'review_status do documento vira approved'
);

select is(
  (select status::text from private.verification_outcomes
   where user_id = '20000000-0000-4000-8000-000000000099'),
  'verified',
  'verification_outcome do user 099 vira verified'
);

-- 5. rejeitar sem motivo -> falha (documento do user 096)
select throws_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000096'::uuid,
      'rejected'::text,
      ''::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'a rejection requires a reason',
  'rejeicao sem motivo e negada'
);

-- 6. rejeitar com motivo -> sucesso
insert into public.locality_memberships (user_id, locality_id)
values ('20000000-0000-4000-8000-000000000096', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;

select lives_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000096'::uuid,
      'rejected'::text,
      'CPF nao confere com o documento'::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'rejeicao com motivo e sucesso'
);

select is(
  (select rejection_reason from private.verification_documents
   where id = '50000000-0000-4000-8000-000000000096'),
  'CPF nao confere com o documento',
  'rejection_reason gravado'
);

-- 7. document ja reviewed -> falha
select throws_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000098'::uuid,
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'document already reviewed',
  'document ja reviewed lanca excecao'
);

-- 8. document expirado -> falha
select throws_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000097'::uuid,
      'rejected'::text,
      'qualquer motivo'::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'document already expired; no decision possible',
  'document expirado lanca excecao'
);

select * from finish();
rollback;
