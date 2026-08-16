begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc

set local role service_role;

select lives_ok(
  $$
    select public.record_consent_acceptance(
      '10000000-0000-4000-8000-000000000001'::uuid,
      1,
      1
    )
  $$,
  'consent acceptance is recorded with both versions'
);

select is(
  public.has_accepted_consent(
    '10000000-0000-4000-8000-000000000001'::uuid,
    1,
    1
  ),
  true,
  'current consent and code of conduct versions are accepted'
);

select lives_ok(
  $$
    select public.record_consent_acceptance(
      '10000000-0000-4000-8000-000000000001'::uuid,
      1,
      1
    )
  $$,
  'recording the same acceptance twice is idempotent'
);

select is(
  (select count(*)::integer
   from public.consent_acceptances
   where user_id = '10000000-0000-4000-8000-000000000001'),
  1,
  'duplicate acceptance does not create a second trail row'
);

select throws_ok(
  $$
    select public.record_consent_acceptance(
      '10000000-0000-4000-8000-000000000001'::uuid,
      0,
      1
    )
  $$,
  'P0001',
  null,
  'a non-positive consent version is rejected'
);

set local role anon;
select throws_ok(
  $$
    select public.record_consent_acceptance(
      '10000000-0000-4000-8000-000000000001'::uuid,
      1,
      1
    )
  $$,
  '42501',
  null,
  'anonymous callers cannot forge an acceptance record'
);

select * from finish();
rollback;
