begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc

reset role;

-- The outbox is operational: no Data API role can touch it, so the worker
-- helpers run as the database owner. Fixture user 1 is member-one.

-- 1. Default delivery is allowed (no preference row, no opt-out).
select is(
  private.outbox_delivery_allowed(
    'email'::public.outbox_channel,
    'member-one@example.invalid',
    'comment',
    '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb
  ),
  true,
  'default delivery is allowed'
);

-- 2. Preference disabled blocks delivery.
insert into public.notification_preferences (user_id, comments)
values ('10000000-0000-4000-8000-000000000001', false);

select is(
  private.outbox_delivery_allowed(
    'email'::public.outbox_channel,
    'member-one@example.invalid',
    'comment',
    '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb
  ),
  false,
  'a disabled type preference blocks delivery'
);

-- 3. Opt-out blocks delivery even when preferences allow it.
insert into public.notification_opt_outs (channel, recipient)
values ('email', 'member-one@example.invalid');

select is(
  private.outbox_delivery_allowed(
    'email'::public.outbox_channel,
    'member-one@example.invalid',
    'comment',
    '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb
  ),
  false,
  'channel opt-out blocks delivery'
);

-- 4. Prepare marks an opted-out due row skipped and does not hand it to the app.
insert into public.outbox (id, recipient, channel, type, payload, updated_at)
values (
  '50000000-0000-4000-8000-000000000001',
  'member-one@example.invalid',
  'email',
  'comment',
  '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb,
  now() - interval '10 minutes'
);

select is_empty(
  $$ select outbox_prepare_due from private.outbox_prepare_due() $$,
  'opted-out row is not dispatched'
);

select is(
  (select status::text from public.outbox where id = '50000000-0000-4000-8000-000000000001'),
  'skipped',
  'prepare marks the opted-out row skipped'
);

-- 5. A due, allowed row is leased and returned to the application.
insert into public.outbox (id, recipient, channel, type, payload, updated_at)
values (
  '50000000-0000-4000-8000-000000000002',
  'member-two@example.invalid',
  'email',
  'comment',
  '{"user_id":"10000000-0000-4000-8000-000000000002"}'::jsonb,
  now() - interval '10 minutes'
);

select results_eq(
  $$ select outbox_prepare_due from private.outbox_prepare_due() $$,
  $$ values ('50000000-0000-4000-8000-000000000002'::uuid) $$,
  'prepare returns due allowed rows'
);

-- 6. Apply records a successful send without inventing the provider result.
select private.outbox_apply_delivery(
  '50000000-0000-4000-8000-000000000002',
  'sent'::public.outbox_status,
  0,
  null,
  now()
);

select is(
  (select status::text from public.outbox where id = '50000000-0000-4000-8000-000000000002'),
  'sent',
  'apply records sent'
);

-- 7. Apply records the retry ceiling as failed, not erased.
select private.outbox_apply_delivery(
  '50000000-0000-4000-8000-000000000002',
  'failed'::public.outbox_status,
  5,
  'provider down',
  now()
);

select is(
  (select attempts from public.outbox where id = '50000000-0000-4000-8000-000000000002'),
  5,
  'apply records the attempt ceiling'
);

select is(
  (select last_error from public.outbox where id = '50000000-0000-4000-8000-000000000002'),
  'provider down',
  'apply records the last error'
);

-- O teste 8 provava que o fallback por canal era registrado na linha. O fallback
-- saiu junto com o canal WhatsApp em 18/09/2026 (decisao do responsavel): o
-- banco nao tem mais fallback_channel, o dominio nao produz o campo e o teste
-- perdeu objeto. Ele NAO foi substituido por um teste do mesmo comportamento
-- com um canal so, porque com um canal so nao ha fallback a registrar.

select * from finish();
rollback;
