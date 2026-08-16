begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select has_table('public', 'outbox', 'outbox table exists');

select columns_are(
  'public',
  'outbox',
  array[
    'id',
    'recipient',
    'channel',
    'type',
    'payload',
    'status',
    'attempts',
    'last_error',
    'fallback_channel',
    'fallback_reason',
    'created_at',
    'updated_at'
  ],
  'outbox has the delivery columns'
);

select results_eq(
  $$
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'outbox'
      and c.relrowsecurity
      and c.relforcerowsecurity
  $$,
  array[1::bigint],
  'outbox RLS is enabled and forced'
);

select is_empty(
  $$
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'outbox'
      and grantee in ('anon', 'authenticated')
  $$,
  'Data API roles have no outbox privilege'
);

select has_index('public', 'outbox', 'outbox_pending_created_idx', 'created_at', 'the pending index exists');

select * from finish();
rollback;
