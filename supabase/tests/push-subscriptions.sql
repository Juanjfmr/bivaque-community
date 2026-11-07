begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

\ir fixtures/foundation.inc

-- ── a tabela ────────────────────────────────────────────────────────────────

select has_table('public', 'push_subscriptions', 'push_subscriptions existe');

select results_eq(
  $$
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'push_subscriptions'
      and c.relrowsecurity
      and c.relforcerowsecurity
  $$,
  array[1::bigint],
  'push_subscriptions tem RLS habilitada e forçada'
);

-- ── o dono lê, cria e apaga só as próprias linhas ───────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.push_subscriptions
      (user_id, kind, destination, key_p256dh, key_auth, label)
    values (
      '10000000-0000-4000-8000-000000000001',
      'web',
      'https://push.example.invalid/sub/one',
      'chave-publica',
      'segredo',
      'Navegador'
    )
  $$,
  'o dono cria a própria inscrição'
);

select is(
  (select count(*)::int from public.push_subscriptions),
  1,
  'o dono lê a própria inscrição'
);

-- Não existe UPDATE de cliente: a tabela não concede o privilégio.
select throws_ok(
  $$
    update public.push_subscriptions
       set label = 'outro'
     where destination = 'https://push.example.invalid/sub/one'
  $$,
  '42501',
  null,
  'authenticated não atualiza inscrição'
);

-- ── outro membro não alcança a linha ────────────────────────────────────────

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'outro membro não lê a inscrição alheia'
);

select is(
  (
    with apagadas as (
      delete from public.push_subscriptions
       where destination = 'https://push.example.invalid/sub/one'
      returning 1
    )
    select count(*)::int from apagadas
  ),
  0,
  'outro membro não apaga a inscrição alheia'
);

-- Reinscrever o mesmo destino troca o dono, sem duplicar.
select lives_ok(
  $$
    insert into public.push_subscriptions
      (user_id, kind, destination, key_p256dh, key_auth, label)
    values (
      '10000000-0000-4000-8000-000000000002',
      'web',
      'https://push.example.invalid/sub/one',
      'chave-publica',
      'segredo',
      'Navegador'
    )
  $$,
  'o novo dono reinscreve o mesmo destino'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'a reinscrição removeu a linha do dono anterior'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::int from public.push_subscriptions),
  1,
  'o destino continua único, com uma linha só'
);

select is(
  (
    select user_id::text
    from public.push_subscriptions
    where destination = 'https://push.example.invalid/sub/one'
  ),
  '10000000-0000-4000-8000-000000000002',
  'a linha pertence a quem reinscreveu'
);

select lives_ok(
  $$
    delete from public.push_subscriptions
     where destination = 'https://push.example.invalid/sub/one'
  $$,
  'o dono apaga a própria inscrição'
);

select is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'a linha saiu'
);

-- ── anon não alcança a tabela ───────────────────────────────────────────────

reset role;
set local role anon;

select throws_ok(
  $$
    insert into public.push_subscriptions
      (user_id, kind, destination, key_p256dh, key_auth)
    values (
      '10000000-0000-4000-8000-000000000001',
      'web',
      'https://push.example.invalid/sub/anon',
      'chave-publica',
      'segredo'
    )
  $$,
  '42501',
  null,
  'anon não cria inscrição'
);

-- ── o papel de serviço lê, marca sucesso e apaga para enviar ────────────────

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.push_subscriptions
      (user_id, kind, destination, key_p256dh, key_auth)
    values (
      '10000000-0000-4000-8000-000000000001',
      'web',
      'https://push.example.invalid/sub/service',
      'chave-publica',
      'segredo'
    )
  $$,
  'o dono cria a inscrição que o serviço vai ler'
);

reset role;
set local role service_role;

select is(
  (select count(*)::int from public.push_subscriptions),
  1,
  'o papel de serviço lê a inscrição para enviar'
);

select lives_ok(
  $$
    update public.push_subscriptions
       set last_success_at = now()
     where destination = 'https://push.example.invalid/sub/service'
  $$,
  'o papel de serviço marca o último envio aceito'
);

select lives_ok(
  $$
    delete from public.push_subscriptions
     where destination = 'https://push.example.invalid/sub/service'
  $$,
  'o papel de serviço apaga o destino recusado'
);

select is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'a inscrição recusada saiu'
);

-- ── apagar a conta apaga a inscrição (cascade) ──────────────────────────────

reset role;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000006', 'push-cascade@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select lives_ok(
  $$
    insert into public.push_subscriptions
      (user_id, kind, destination, key_p256dh, key_auth)
    values (
      '10000000-0000-4000-8000-000000000006',
      'web',
      'https://push.example.invalid/sub/cascade',
      'chave-publica',
      'segredo'
    )
  $$,
  'a conta nova tem inscrição'
);

reset role;
delete from auth.users where id = '10000000-0000-4000-8000-000000000006';

select is(
  (
    select count(*)::int
    from public.push_subscriptions
    where destination = 'https://push.example.invalid/sub/cascade'
  ),
  0,
  'apagar a conta apagou a inscrição'
);

-- ── a purga da conta apaga a inscrição (o GoTrue faz soft delete) ───────────
-- O CASCADE da FK nunca dispara no fluxo real: auth.users não sai de verdade.
-- Quem apaga é public.finalize_account_deletion, chamada depois da carência.

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000007', 'push-purge@example.invalid');

insert into public.push_subscriptions
  (user_id, kind, destination, key_p256dh, key_auth)
values (
  '10000000-0000-4000-8000-000000000007',
  'web',
  'https://push.example.invalid/sub/purge',
  'chave-publica',
  'segredo'
);

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000007',
  now() - interval '16 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000007'),
  'purged',
  'a purga da conta vencida roda'
);

select is(
  (
    select count(*)::int
    from public.push_subscriptions
    where user_id = '10000000-0000-4000-8000-000000000007'
  ),
  0,
  'a purga da conta apagou a inscrição de push'
);

-- ── retenção: sem envio aceito há 90 dias, a inscrição sai ──────────────────

insert into public.push_subscriptions
  (user_id, kind, destination, key_p256dh, key_auth, created_at, last_success_at)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'web',
    'https://push.example.invalid/sub/velha',
    'chave-publica',
    'segredo',
    now() - interval '100 days',
    null
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    'web',
    'https://push.example.invalid/sub/nova',
    'chave-publica',
    'segredo',
    now() - interval '10 days',
    null
  );

select is(
  private.purge_stale_push_subscriptions(),
  1::bigint,
  'o job apaga só a inscrição vencida'
);

select is(
  (
    select destination
    from public.push_subscriptions
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  'https://push.example.invalid/sub/nova',
  'a inscrição recente continua'
);

-- ── a notificação vira linha de push só com a preferência e sem bloqueio ────

insert into public.notification_channel_preferences
  (user_id, notification_type, channel, enabled)
values ('10000000-0000-4000-8000-000000000001', 'comments', 'push', true);

insert into public.notifications
  (recipient_user_id, actor_user_id, type, action, target_type, target_id)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'comment', 'created', 'post', '90000000-0000-4000-8000-000000000001'
);

select is(
  (
    select count(*)::int
    from public.outbox
    where channel = 'push'
      and recipient = '10000000-0000-4000-8000-000000000001'
  ),
  1,
  'preferência de push ligada gera a linha no outbox'
);

select is(
  (
    select array_agg(chave order by chave)
    from public.outbox o,
         lateral jsonb_object_keys(o.payload) as chave
    where o.channel = 'push'
      and o.recipient = '10000000-0000-4000-8000-000000000001'
  ),
  array['action', 'target_id', 'target_type', 'user_id'],
  'o corpo do push só leva referências, nenhum dado de terceiro'
);

update public.notification_channel_preferences
   set enabled = false
 where user_id = '10000000-0000-4000-8000-000000000001'
   and notification_type = 'comments'
   and channel = 'push';

insert into public.notifications
  (recipient_user_id, actor_user_id, type, action, target_type, target_id)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'comment', 'created', 'post', '90000000-0000-4000-8000-000000000002'
);

select is(
  (
    select count(*)::int
    from public.outbox
    where channel = 'push'
      and recipient = '10000000-0000-4000-8000-000000000001'
  ),
  1,
  'preferência desligada não gera linha de push'
);

update public.notification_channel_preferences
   set enabled = true
 where user_id = '10000000-0000-4000-8000-000000000001'
   and notification_type = 'comments'
   and channel = 'push';

insert into public.dm_blocks (blocker_user_id, blocked_user_id)
values ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

insert into public.notifications
  (recipient_user_id, actor_user_id, type, action, target_type, target_id)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'comment', 'created', 'post', '90000000-0000-4000-8000-000000000003'
);

select is(
  (
    select count(*)::int
    from public.outbox
    where channel = 'push'
      and recipient = '10000000-0000-4000-8000-000000000001'
  ),
  1,
  'bloqueio entre membros impede o push'
);

delete from public.dm_blocks
 where blocker_user_id = '10000000-0000-4000-8000-000000000001'
   and blocked_user_id = '10000000-0000-4000-8000-000000000002';

insert into public.notifications
  (recipient_user_id, actor_user_id, type, action, target_type, target_id)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'comment', 'created', 'post', '90000000-0000-4000-8000-000000000004'
);

select is(
  (
    select count(*)::int
    from public.outbox
    where channel = 'push'
      and recipient = '10000000-0000-4000-8000-000000000001'
  ),
  2,
  'sem bloqueio e com preferência, o push volta a ser enfileirado'
);

select * from finish();
rollback;
