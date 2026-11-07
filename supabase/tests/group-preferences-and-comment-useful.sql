begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
\ir fixtures/foundation.inc
\ir fixtures/groups.inc

insert into public.posts (id, locality_id, user_id, group_id, post_type, content) values
  ('73000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'text', 'Conversa aberta'),
  ('73000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'text', 'Conversa fechada');
insert into public.comments (id, post_id, user_id, content) values
  ('74000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Comentário aberto'),
  ('74000000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Comentário fechado');

select ok((select relforcerowsecurity from pg_class where oid = 'public.hidden_posts'::regclass), 'ocultadas força RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.comment_reactions'::regclass), 'Útil no comentário força RLS');
select ok(not has_table_privilege('anon', 'public.hidden_posts', 'SELECT') and not has_table_privilege('anon', 'public.comment_reactions', 'INSERT'), 'anon não tem acesso');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok($$ insert into public.hidden_posts (user_id, post_id) values ('10000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001') $$, 'membro oculta para si');
select is((select count(*)::integer from public.feed_group('40000000-0000-4000-8000-000000000001', 'recent')), 0, 'feed recente exclui ocultada antes da paginação');
select is((select count(*)::integer from public.feed_group('40000000-0000-4000-8000-000000000001', 'hidden')), 1, 'ocultadas permite encontrar para desfazer');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.hidden_posts), 0, 'ocultadas de outra pessoa são privadas');
select is((select count(*)::integer from public.feed_group('40000000-0000-4000-8000-000000000001', 'recent')), 1, 'ocultar não afeta o feed alheio');
select throws_ok($$ insert into public.hidden_posts (user_id, post_id) values ('10000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000002') $$, '42501', null, 'não forja autoria de ocultada');
select throws_ok($$ insert into public.hidden_posts (user_id, post_id) values ('10000000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000002') $$, '42501', null, 'pendente não interage com conteúdo fechado');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$ insert into public.comment_reactions (user_id, comment_id) values ('10000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000001') $$, 'membro marca comentário Útil');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.comment_reactions where comment_id = '74000000-0000-4000-8000-000000000001'), 1, 'contagem de Útil visível no comentário acessível');
select throws_ok($$ insert into public.comment_reactions (user_id, comment_id) values ('10000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000002') $$, '42501', null, 'não forja autoria do Útil');
select throws_ok($$ insert into public.comment_reactions (user_id, comment_id) values ('10000000-0000-4000-8000-000000000002', '74000000-0000-4000-8000-000000000002') $$, '42501', null, 'pendente não reage a comentário fechado');
delete from public.comment_reactions where user_id = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.comment_reactions), 1, 'não apaga Útil alheio');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
delete from public.comment_reactions where user_id = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.comment_reactions), 0, 'desfaz o próprio Útil');
delete from public.hidden_posts where post_id = '73000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.feed_group('40000000-0000-4000-8000-000000000001', 'recent')), 1, 'desfazer ocultada restaura feed');
insert into public.post_saves (user_id, post_id) values ('10000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.feed_group('40000000-0000-4000-8000-000000000001', 'saved')), 1, 'feed de salvas usa o banco');
select * from finish();
rollback;
