begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

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

reset role;

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000006', 'resubmit-user@example.invalid');

insert into public.operators (auth_user_id)
values ('10000000-0000-4000-8000-000000000001')
on conflict do nothing;

set local role service_role;

select lives_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000006'::uuid,
      '10000000-0000-4000-8000-000000000006/version-1.pdf',
      'application/pdf'
    )
  $$,
  'a first submission enters for a user without a previous outcome'
);

select lives_ok(
  $$
    select public.decide_verification_document(
      (select id
       from private.verification_documents
       where user_id = '10000000-0000-4000-8000-000000000006'
         and review_status = 'pending'),
      'rejected'::text,
      'arquivo ilegivel'::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'the operator rejects the document as illegible'
);

select is(
  (select status::text
   from private.verification_outcomes
   where user_id = '10000000-0000-4000-8000-000000000006'),
  'rejected',
  'the rejected document leaves the previous outcome as rejected'
);

select lives_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000006'::uuid,
      '10000000-0000-4000-8000-000000000006/version-2.pdf',
      'application/pdf'
    )
  $$,
  'a resubmission after a rejection enters as a new version'
);

select is(
  (select status::text
   from private.verification_outcomes
   where user_id = '10000000-0000-4000-8000-000000000006'),
  'pending',
  'the resubmission invalidates the previous result and returns to pending'
);

select throws_ok(
  $$
    select public.decide_verification_document(
      (select id
       from private.verification_documents
       where user_id = '10000000-0000-4000-8000-000000000006'
         and review_status = 'rejected'
       limit 1),
      'approved'::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'document already reviewed',
  'a late decision on the superseded document is refused'
);

select is(
  (select count(*)::integer
   from public.list_verification_documents()
   where user_id = '10000000-0000-4000-8000-000000000006'),
  1,
  'only the current submission appears in the operator backlog'
);

select * from finish();
rollback;
