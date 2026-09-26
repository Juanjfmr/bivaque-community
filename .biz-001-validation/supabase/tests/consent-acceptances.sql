begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

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

-- Negative: accepting only ONE of the two versions does not count as consent.
-- The user recorded (1,1); the pair (1,2) has no row yet, so consent for it is
-- not given. This is the path a version bump creates: a person who accepted v1
-- of the code of conduct must accept v2 before the app treats them as consented.
select is(
  public.has_accepted_consent(
    '10000000-0000-4000-8000-000000000001'::uuid,
    1,
    2
  ),
  false,
  'consent is NOT given when only one of the two versions was accepted'
);

select lives_ok(
  $$
    select public.record_consent_acceptance(
      '10000000-0000-4000-8000-000000000001'::uuid,
      1,
      2
    )
  $$,
  'recording the newer code of conduct version is allowed'
);

select is(
  public.has_accepted_consent(
    '10000000-0000-4000-8000-000000000001'::uuid,
    1,
    2
  ),
  true,
  'consent is given once both versions of the pair are recorded'
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
