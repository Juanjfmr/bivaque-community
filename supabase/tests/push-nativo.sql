begin;
create extension if not exists pgtap with schema extensions;
select plan(28);
\ir fixtures/foundation.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok($$select public.register_push_subscription('android', 'token-android', null, null)$$, 'registra android');
select lives_ok($$select public.register_push_subscription('ios', 'token-ios', null, null)$$, 'registra ios');
select throws_ok($$select public.register_push_subscription('android', 'com espaco', null, null)$$, '22023', 'invalid push subscription', 'recusa espaço');
select throws_ok($$select public.register_push_subscription('android', E'abc\n', null, null)$$, '22023', 'invalid push subscription', 'recusa controle');
select throws_ok($$select public.register_push_subscription('android', 'não-ascii', null, null)$$, '22023', 'invalid push subscription', 'recusa fora de ASCII');
select throws_ok($$select public.register_push_subscription('ios', '', null, null)$$, '22023', 'invalid push subscription', 'recusa vazio');
select throws_ok($$select public.register_push_subscription('android', repeat('a', 4097), null, null)$$, '22023', 'invalid push subscription', 'recusa token longo');
select throws_ok($$select public.register_push_subscription('outro', 'token', null, null)$$, '22023', 'invalid push subscription', 'recusa tipo desconhecido');
select throws_ok($$select public.register_push_subscription('ios', 'token', 'chave', null)$$, '22023', 'invalid push subscription', 'recusa chaves nativas');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.push_subscriptions), 0, 'outro membro não lê');
delete from public.push_subscriptions where destination = 'token-ios';
select lives_ok($$select public.register_push_subscription('android', 'token-android', null, null)$$, 'transfere token em uma chamada');
reset role;
select is((select user_id::text from public.push_subscriptions where destination = 'token-android'), '10000000-0000-4000-8000-000000000002', 'novo titular');
select is((select count(*)::int from public.push_subscriptions where destination = 'token-ios'), 1, 'delete alheio não apaga');
delete from public.push_subscriptions;
insert into public.push_subscriptions (user_id, kind, destination, created_at)
select '10000000-0000-4000-8000-000000000001', 'android', 'limite-' || n, now() - (11-n) * interval '1 second'
from generate_series(1,10) n;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.register_push_subscription('ios', 'decima-primeira', null, null)$$, 'registra décima primeira');
select is((select count(*)::int from public.push_subscriptions), 10, 'limite de dez');
select is((select count(*)::int from public.push_subscriptions where destination = 'limite-1'), 0, 'remove mais antiga');
reset role;
delete from public.push_subscriptions;
insert into public.push_subscriptions (user_id, kind, destination, key_p256dh, key_auth) values
('10000000-0000-4000-8000-000000000001', 'web', 'https://push.example.invalid/web', 'chave', 'segredo'),
('10000000-0000-4000-8000-000000000001', 'android', 'android', null, null),
('10000000-0000-4000-8000-000000000001', 'ios', 'ios', null, null),
('10000000-0000-4000-8000-000000000002', 'ios', 'outro', null, null);
insert into public.notification_channel_preferences (user_id, notification_type, channel, enabled)
values ('10000000-0000-4000-8000-000000000001', 'comments', 'push', true),
       ('10000000-0000-4000-8000-000000000001', 'messages', 'push', true);
set local role service_role;
select is((select count(*)::int from public.reserve_push_deliveries('10000000-0000-4000-8000-000000000001', 'comment', null)), 3, 'reserva só inscrições do titular');
reset role;
insert into public.dm_blocks (blocker_user_id, blocked_user_id) values ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');
set local role service_role;
select is((select count(*)::int from public.reserve_push_deliveries('10000000-0000-4000-8000-000000000001', 'comment', '10000000-0000-4000-8000-000000000002')), 0, 'bloqueio pelo destinatário impede reserva');
reset role;
delete from public.dm_blocks;
insert into public.dm_blocks (blocker_user_id, blocked_user_id) values ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001');
set local role service_role;
select is((select count(*)::int from public.reserve_push_deliveries('10000000-0000-4000-8000-000000000001', 'comment', '10000000-0000-4000-8000-000000000002')), 0, 'bloqueio pelo autor impede reserva');
reset role;
delete from public.dm_blocks;
update public.notification_channel_preferences set enabled = false where user_id = '10000000-0000-4000-8000-000000000001' and channel = 'push' and notification_type = 'comments';
select is((select count(*)::int from public.push_subscriptions where user_id = '10000000-0000-4000-8000-000000000001' and kind in ('android','ios')), 2, 'outro tipo ligado mantém nativas');
update public.notification_channel_preferences set enabled = false where user_id = '10000000-0000-4000-8000-000000000001' and channel = 'push' and notification_type = 'messages';
select is((select count(*)::int from public.push_subscriptions where user_id = '10000000-0000-4000-8000-000000000001' and kind in ('android','ios')), 0, 'desligar apaga nativas');
select is((select count(*)::int from public.push_subscriptions where user_id = '10000000-0000-4000-8000-000000000001' and kind = 'web'), 1, 'desligar mantém web');
set local role service_role;
select is((select count(*)::int from public.reserve_push_deliveries('10000000-0000-4000-8000-000000000001', 'comment', null)), 0, 'preferência desligada impede reserva');
reset role;
set local role authenticated;
select throws_ok($$select * from public.reserve_push_deliveries('10000000-0000-4000-8000-000000000001', 'comment', null)$$, '42501', null, 'authenticated não reserva');
reset role;
insert into public.notification_channel_preferences (user_id, notification_type, channel, enabled) values ('10000000-0000-4000-8000-000000000001', 'messages', 'push', true) on conflict (user_id, notification_type, channel) do update set enabled = true;
insert into public.push_subscriptions (user_id, kind, destination) values ('10000000-0000-4000-8000-000000000001', 'ios', 'delete-trigger');
delete from public.notification_channel_preferences where user_id = '10000000-0000-4000-8000-000000000001' and channel = 'push' and notification_type = 'messages';
select is((select count(*)::int from public.push_subscriptions where destination = 'delete-trigger'), 0, 'delete da ultima preferencia apaga nativas');
set local role anon;
select throws_ok($$select * from public.push_subscriptions$$, '42501', null, 'anon nao le inscricoes');
select throws_ok($$select public.register_push_subscription('ios', 'anon', null, null)$$, '42501', null, 'anon não registra');
reset role;
insert into public.push_subscriptions (user_id, kind, destination, created_at) values
('10000000-0000-4000-8000-000000000001', 'android', 'velho-android', now() - interval '91 days'),
('10000000-0000-4000-8000-000000000001', 'ios', 'velho-ios', now() - interval '91 days');
select is(private.purge_stale_push_subscriptions(), 2::bigint, 'purga nativas vencidas');
select * from finish();
rollback;
