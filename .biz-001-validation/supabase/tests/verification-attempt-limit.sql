begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-0000000000aa', 'attempt-limit@example.invalid');

set local role service_role;

select is(
  public.consume_verification_attempt('10000000-0000-4000-8000-0000000000aa'::uuid),
  true,
  'the first verification attempt is allowed'
);

select is(
  public.consume_verification_attempt('10000000-0000-4000-8000-0000000000aa'::uuid),
  true,
  'the second verification attempt is allowed'
);

select is(
  public.consume_verification_attempt('10000000-0000-4000-8000-0000000000aa'::uuid),
  true,
  'the third verification attempt is allowed'
);

select is(
  public.consume_verification_attempt('10000000-0000-4000-8000-0000000000aa'::uuid),
  false,
  'the fourth attempt within the rolling hour is blocked'
);

select is(
  (select attempt_count from private.verification_outcomes
   where user_id = '10000000-0000-4000-8000-0000000000aa'),
  3,
  'attempt count stops at the configured limit'
);

update private.verification_outcomes
set last_attempt_at = now() - interval '2 hours'
where user_id = '10000000-0000-4000-8000-0000000000aa';

select is(
  public.consume_verification_attempt('10000000-0000-4000-8000-0000000000aa'::uuid),
  true,
  'an attempt after the rolling hour opens a fresh window'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-0000000000aa', true);

select throws_ok(
  $$
    select public.consume_verification_attempt('10000000-0000-4000-8000-0000000000aa'::uuid)
  $$,
  '42501',
  null,
  'authenticated callers cannot consume verification attempts'
);

select * from finish();
rollback;
