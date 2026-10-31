begin;
select plan(2);

select is(
  (select count(*) from auth.users where id in (
    '20000000-0000-4000-8000-000000000099'::uuid,
    '20000000-0000-4000-8000-00000000009a'::uuid
  )),
  0::bigint,
  'migrations do not provision demo auth accounts before the local seed'
);

select is(
  (select count(*) from public.profiles where user_id in (
    '20000000-0000-4000-8000-000000000099'::uuid,
    '20000000-0000-4000-8000-00000000009a'::uuid
  )),
  0::bigint,
  'migrations do not provision demo profiles before the local seed'
);

select * from finish();
rollback;
