begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

\ir fixtures/foundation.inc

-- ── base preference row: respostas on, eventos off, novidades off ────────────

reset role;
insert into public.notification_preferences (user_id, comments, events, product_news)
values ('10000000-0000-4000-8000-000000000001', true, false, false);

-- ── own-row RLS on the matrix ───────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.notification_channel_preferences
      (user_id, notification_type, channel, enabled)
    values ('10000000-0000-4000-8000-000000000001', 'comments', 'in_app', true)
  $$,
  'authenticated inserts their own in_app matrix row'
);

select lives_ok(
  $$
    insert into public.notification_channel_preferences
      (user_id, notification_type, channel)
    values ('10000000-0000-4000-8000-000000000001', 'comments', 'email')
  $$,
  'authenticated inserts their own email matrix row (disabled by default)'
);

select is(
  (select enabled from public.notification_channel_preferences
   where user_id = '10000000-0000-4000-8000-000000000001'
     and notification_type = 'comments' and channel = 'in_app'),
  true,
  'owner reads back the in_app row they enabled'
);

select is(
  (select enabled from public.notification_channel_preferences
   where user_id = '10000000-0000-4000-8000-000000000001'
     and notification_type = 'comments' and channel = 'email'),
  false,
  'owner reads back the email row they left disabled'
);

-- Another authenticated member must not see the first member's matrix.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$
    select 1 from public.notification_channel_preferences
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'another authenticated user cannot read someone else matrix'
);

-- ── the single reader: type and channel rules ───────────────────────────────

reset role;

select is(
  private.notification_type_key('comment'),
  'comments',
  'comment maps to the comments preference key'
);

select is(
  private.notification_type_key('event_change'),
  'events',
  'event_change maps to the events preference key'
);

select is(
  private.notification_type_enabled('product_news', '10000000-0000-4000-8000-000000000001'),
  false,
  'product_news is off by default — existing account'
);

select is(
  private.notification_type_enabled('comment', '10000000-0000-4000-8000-000000000001'),
  true,
  'a type the member left on stays on'
);

select is(
  private.notification_type_enabled('event_rsvp', '10000000-0000-4000-8000-000000000001'),
  false,
  'a type the member turned off is off'
);

select is(
  private.notification_channel_allows(
    'comment',
    'in_app',
    '10000000-0000-4000-8000-000000000001'
  ),
  true,
  'enabled channel delivers an enabled type'
);

select is(
  private.notification_channel_allows(
    'comment',
    'email',
    '10000000-0000-4000-8000-000000000001'
  ),
  false,
  'disabled channel does not deliver the same type'
);

select is(
  private.notification_channel_allows(
    'event_rsvp',
    'in_app',
    '10000000-0000-4000-8000-000000000001'
  ),
  false,
  'type off delivers by no channel'
);

select is(
  private.notification_channel_allows(
    'direct_message',
    'in_app',
    '10000000-0000-4000-8000-000000000001'
  ),
  true,
  'a type with no matrix row keeps the type default (deliver)'
);

-- ── the outbox dispatcher reads the same rule ───────────────────────────────

select is(
  private.outbox_delivery_allowed(
    'email',
    'member-one@example.invalid',
    'comment',
    jsonb_build_object('user_id', '10000000-0000-4000-8000-000000000001')
  ),
  false,
  'e-mail delivery of a type with the email channel off is not allowed'
);

select is(
  private.outbox_delivery_allowed(
    'whatsapp',
    'member-one@example.invalid',
    'comment',
    jsonb_build_object('user_id', '10000000-0000-4000-8000-000000000001')
  ),
  true,
  'whatsapp is not a matrix channel — the type rule still allows it'
);

select * from finish();
rollback;
