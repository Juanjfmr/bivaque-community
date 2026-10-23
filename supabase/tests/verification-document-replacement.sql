begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

\ir fixtures/foundation.inc

reset role;

-- PORT-004 (frente B): a troca do documento em análise. O positivo é a pessoa
-- que já tem um arquivo na fila enviar outro: o anterior sai da fila (e o
-- caminho volta para o servidor apagar o objeto), sobra uma única análise
-- pendente e a decisão da equipe vale para o arquivo mais recente. O negativo
-- é o tipo inválido, a pessoa já confirmada e os papéis sem execute.

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000007', 'replacement-user@example.invalid'),
  ('10000000-0000-4000-8000-000000000008', 'first-document-user@example.invalid');

set local role service_role;

select lives_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000007'::uuid,
      '10000000-0000-4000-8000-000000000007/version-1.pdf',
      'application/pdf'
    )
  $$,
  'a first document enters the review queue'
);

select is(
  (
    select replaced_storage_object_path
    from public.replace_verification_document(
      '10000000-0000-4000-8000-000000000007'::uuid,
      '10000000-0000-4000-8000-000000000007/version-2.png',
      'image/png'
    )
  ),
  '10000000-0000-4000-8000-000000000007/version-1.pdf',
  'replacing hands back the superseded object path so the server can delete the file'
);

select is(
  (select count(*)::integer
   from private.verification_documents
   where user_id = '10000000-0000-4000-8000-000000000007'
     and review_status = 'pending'),
  1,
  'the replacement leaves a single pending analysis, not a parallel second one'
);

select is(
  (select storage_object_path
   from private.verification_documents
   where user_id = '10000000-0000-4000-8000-000000000007'
     and review_status = 'pending'),
  '10000000-0000-4000-8000-000000000007/version-2.png',
  'the pending row is the newest file'
);

select is_empty(
  $$
    select storage_object_path
    from public.my_verification_document_paths('10000000-0000-4000-8000-000000000007'::uuid)
    where storage_object_path = '10000000-0000-4000-8000-000000000007/version-1.pdf'
  $$,
  'the superseded path is no longer referenced by any document row'
);

select is(
  (select status::text
   from private.verification_outcomes
   where user_id = '10000000-0000-4000-8000-000000000007'),
  'pending',
  'the replacement keeps the outcome in analysis'
);

select is(
  (select count(*)::integer
   from public.list_verification_documents()
   where user_id = '10000000-0000-4000-8000-000000000007'),
  1,
  'the operator backlog shows one document for the person after the swap'
);

select throws_ok(
  $$
    select public.replace_verification_document(
      '10000000-0000-4000-8000-000000000007'::uuid,
      '10000000-0000-4000-8000-000000000007/bad.exe',
      'application/x-msdownload'
    )
  $$,
  'P0001',
  'unsupported document mime type',
  'an unsupported mime type is refused before anything is replaced'
);

select throws_ok(
  $$
    select public.replace_verification_document(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000001/version-2.pdf',
      'application/pdf'
    )
  $$,
  'P0001',
  'user is already verified',
  'a verified person cannot replace a document'
);

select is(
  (select count(*)::integer
   from public.replace_verification_document(
     '10000000-0000-4000-8000-000000000008'::uuid,
     '10000000-0000-4000-8000-000000000008/only-version.pdf',
     'application/pdf'
   )),
  1,
  'without a pending document the replacement still registers the file'
);

-- ── P1 da revisão: a aprovação concorrente não volta para pending ───────────
--
-- O pgTAP roda numa única conexão, então não há como abrir a segunda transação
-- e provar o entrelaçamento real. O que se prova aqui é a sequência de estados
-- que a trava garante, nas duas ordens possíveis:
--   aprovar e depois trocar -> a troca é recusada e o resultado segue verified;
--   trocar e depois decidir pelo id antigo -> a decisão falha e o resultado
--   segue pending, com o documento novo.
-- A serialização vem da trava, não da ordem do teste:
-- replace_verification_document trava a linha do documento pendente e depois a
-- linha do resultado (FOR UPDATE) antes de decidir qualquer coisa, na mesma
-- ordem em que decide_verification_document toma as duas. Sem essa trava, a
-- aprovação commitada no intervalo deixava o delete sem linha pendente, a
-- função inseria o documento novo e o upsert gravava 'pending' por cima do
-- 'verified'.
reset role;

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000009', 'approved-then-replaced@example.invalid'),
  ('10000000-0000-4000-8000-00000000000a', 'replaced-then-decided@example.invalid');

insert into public.operators (auth_user_id)
values ('10000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into private.verification_documents (
  id, user_id, storage_object_path, mime_type, expires_at
) values (
  '50000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000009/version-1.pdf',
  'application/pdf',
  now() + interval '7 days'
);

insert into private.verification_outcomes (user_id, status)
values ('10000000-0000-4000-8000-000000000009', 'pending');

insert into private.verification_documents (
  id, user_id, storage_object_path, mime_type, expires_at
) values (
  '50000000-0000-4000-8000-00000000000a',
  '10000000-0000-4000-8000-00000000000a',
  '10000000-0000-4000-8000-00000000000a/version-1.pdf',
  'application/pdf',
  now() + interval '7 days'
);

insert into private.verification_outcomes (user_id, status)
values ('10000000-0000-4000-8000-00000000000a', 'pending');

set local role service_role;

select lives_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-000000000009'::uuid,
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'aprovar e depois trocar: o operador aprova o documento em análise'
);

select is(
  (select status::text from private.verification_outcomes
   where user_id = '10000000-0000-4000-8000-000000000009'),
  'verified',
  'aprovar e depois trocar: o resultado da aprovação fica verified'
);

select throws_ok(
  $$
    select public.replace_verification_document(
      '10000000-0000-4000-8000-000000000009'::uuid,
      '10000000-0000-4000-8000-000000000009/version-2.png',
      'image/png'
    )
  $$,
  'P0001',
  'user is already verified',
  'aprovar e depois trocar: a troca é recusada depois da aprovação'
);

select is(
  (select status::text from private.verification_outcomes
   where user_id = '10000000-0000-4000-8000-000000000009'),
  'verified',
  'aprovar e depois trocar: a recusa não devolve o resultado para pending'
);

select is(
  (select count(*)::integer from private.verification_documents
   where user_id = '10000000-0000-4000-8000-000000000009'
     and review_status = 'pending'),
  0,
  'aprovar e depois trocar: nenhum documento novo entra na fila'
);

select is(
  (
    select replaced_storage_object_path
    from public.replace_verification_document(
      '10000000-0000-4000-8000-00000000000a'::uuid,
      '10000000-0000-4000-8000-00000000000a/version-2.png',
      'image/png'
    )
  ),
  '10000000-0000-4000-8000-00000000000a/version-1.pdf',
  'trocar e depois decidir: a troca substitui o documento em análise'
);

select throws_ok(
  $$
    select public.decide_verification_document(
      '50000000-0000-4000-8000-00000000000a'::uuid,
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'P0001',
  'document not found',
  'trocar e depois decidir: decidir pelo id antigo falha'
);

select is(
  (select status::text from private.verification_outcomes
   where user_id = '10000000-0000-4000-8000-00000000000a'),
  'pending',
  'trocar e depois decidir: o resultado continua em análise'
);

select is(
  (select storage_object_path from private.verification_documents
   where user_id = '10000000-0000-4000-8000-00000000000a'
     and review_status = 'pending'),
  '10000000-0000-4000-8000-00000000000a/version-2.png',
  'trocar e depois decidir: a análise pendente é a do documento novo'
);

set local role authenticated;
select throws_ok(
  $$
    select public.replace_verification_document(
      '10000000-0000-4000-8000-000000000007'::uuid,
      '10000000-0000-4000-8000-000000000007/version-3.pdf',
      'application/pdf'
    )
  $$,
  '42501',
  null,
  'authenticated callers cannot replace verification documents'
);

reset role;
set local role anon;
select throws_ok(
  $$
    select public.replace_verification_document(
      '10000000-0000-4000-8000-000000000007'::uuid,
      '10000000-0000-4000-8000-000000000007/version-3.pdf',
      'application/pdf'
    )
  $$,
  '42501',
  null,
  'anon cannot replace verification documents'
);

select * from finish();
rollback;
