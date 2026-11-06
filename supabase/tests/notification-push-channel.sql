begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc

-- ── o canal push existe na matriz (F09, RUN-022) ────────────────────────────

select is(
  (
    select count(*)::int
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'notification_channel'
      and e.enumlabel = 'push'
  ),
  1,
  'notification_channel tem o valor push'
);

-- ── RLS da matriz vale para o canal novo ────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.notification_channel_preferences
      (user_id, notification_type, channel, enabled)
    values ('10000000-0000-4000-8000-000000000001', 'comments', 'push', true)
  $$,
  'o dono grava a propria preferencia de push'
);

select is(
  (
    select enabled
    from public.notification_channel_preferences
    where user_id = '10000000-0000-4000-8000-000000000001'
      and notification_type = 'comments'
      and channel = 'push'
  ),
  true,
  'o dono le de volta o push que ligou'
);

-- Outro membro não enxerga a matriz alheia.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$
    select 1 from public.notification_channel_preferences
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'outro membro nao le a matriz de push do dono'
);

-- Anon continua sem privilégio nenhum na tabela.
reset role;
set local role anon;

select throws_ok(
  $$
    insert into public.notification_channel_preferences
      (user_id, notification_type, channel, enabled)
    values ('10000000-0000-4000-8000-000000000001', 'comments', 'push', true)
  $$,
  '42501',
  null,
  'anon nao escreve preferencia de push'
);

select * from finish();
rollback;
