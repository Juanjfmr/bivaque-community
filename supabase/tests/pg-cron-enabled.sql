begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

reset role;

select has_extension('pg_cron', 'pg_cron is enabled');

select results_eq(
  $$ select count(*)::integer from cron.job where jobname = 'bivaque-heartbeat' $$,
  array[1::integer],
  'the heartbeat job exists'
);

select * from finish();
rollback;
