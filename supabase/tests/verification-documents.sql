begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc

set local role service_role;

select lives_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000005'::uuid,
      '10000000-0000-4000-8000-000000000005/fixture.pdf',
      'application/pdf'
    )
  $$,
  'a non-verified user can submit a document for human review'
);

select is(
  (select count(*)::integer
   from public.list_verification_documents()
   where user_id = '10000000-0000-4000-8000-000000000005'),
  1,
  'the pending document appears in the operator backlog'
);

select throws_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000005'::uuid,
      '10000000-0000-4000-8000-000000000005/second.pdf',
      'application/pdf'
    )
  $$,
  '23505',
  null,
  'a second pending document for the same user is rejected'
);

select throws_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000005'::uuid,
      '10000000-0000-4000-8000-000000000005/bad.exe',
      'application/x-msdownload'
    )
  $$,
  'P0001',
  null,
  'unsupported document mime type is rejected'
);

set local role authenticated;
select throws_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000005'::uuid,
      '10000000-0000-4000-8000-000000000005/fixture.pdf',
      'application/pdf'
    )
  $$,
  '42501',
  null,
  'authenticated callers cannot submit verification documents'
);

select * from finish();
rollback;
