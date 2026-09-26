begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc

reset role;

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000007', 'document-status-user@example.invalid');

insert into public.operators (auth_user_id)
values ('10000000-0000-4000-8000-000000000001')
on conflict do nothing;

set local role service_role;

select is(
  (select count(*)::integer
   from public.my_verification_document('10000000-0000-4000-8000-000000000007')),
  0,
  'a member with no document has no status row'
);

select lives_ok(
  $$
    select public.submit_verification_document(
      '10000000-0000-4000-8000-000000000007'::uuid,
      '10000000-0000-4000-8000-000000000007/only.pdf',
      'application/pdf'
    )
  $$,
  'the member submits a single complete file'
);

select is(
  (select review_status
   from public.my_verification_document('10000000-0000-4000-8000-000000000007')),
  'pending',
  'the member reads the pending situation from the server'
);

select is(
  (select storage_object_path
   from public.my_verification_document_paths('10000000-0000-4000-8000-000000000007')),
  '10000000-0000-4000-8000-000000000007/only.pdf',
  'the registered paths are readable for the orphan sweep'
);

select lives_ok(
  $$
    select public.decide_verification_document(
      (select document_id
       from public.my_verification_document('10000000-0000-4000-8000-000000000007')),
      'rejected'::text,
      'arquivo ilegivel'::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'the operator rejects the document as illegible'
);

select is(
  (select needs_replacement
   from public.my_verification_document('10000000-0000-4000-8000-000000000007')),
  true,
  'the member is told to replace the whole file'
);

set local role authenticated;

select throws_ok(
  $$
    select public.my_verification_document('10000000-0000-4000-8000-000000000007'::uuid)
  $$,
  '42501',
  null,
  'a direct call without the server authorization is denied'
);

select * from finish();
rollback;
