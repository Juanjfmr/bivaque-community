begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
\ir fixtures/foundation.inc
\ir fixtures/groups.inc

insert into public.posts (id, locality_id, user_id, group_id, post_type, content)
values
  ('71000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'text', 'Conversa aberta'),
  ('71000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'text', 'Conversa fechada');

select has_column('public', 'posts', 'photo_paths', 'publicação tem fotos');
select has_column('public', 'comments', 'parent_id', 'comentário tem raiz');
select has_column('public', 'comments', 'reply_to_id', 'comentário tem alvo');
select ok(not has_column_privilege('authenticated', 'public.comments', 'parent_id', 'UPDATE'), 'raiz não é editável pela Data API');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok($$
  insert into public.posts (id, locality_id, user_id, group_id, post_type, content, photo_paths)
  values ('71000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'photo', 'Quatro fotos',
    array['10000000-0000-4000-8000-000000000001/a.png', '10000000-0000-4000-8000-000000000001/b.png', '10000000-0000-4000-8000-000000000001/c.png', '10000000-0000-4000-8000-000000000001/d.png'])
$$, 'membro publica quatro fotos na própria pasta');
select is((select photo_path from public.posts where id = '71000000-0000-4000-8000-000000000003'),
  '10000000-0000-4000-8000-000000000001/a.png', 'primeira foto mantém o leitor legado');
select throws_ok($$
  insert into public.posts (locality_id, user_id, group_id, post_type, content, photo_paths)
  values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'photo', 'Pasta alheia', array['10000000-0000-4000-8000-000000000002/a.png'])
$$, '23514', null, 'pasta alheia recusada');
select throws_ok($$
  insert into public.posts (locality_id, user_id, group_id, post_type, content, photo_paths)
  values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'photo', 'Cinco fotos',
    array_fill('10000000-0000-4000-8000-000000000001/a.png'::text, array[5]))
$$, '23514', null, 'quinta foto recusada');

insert into public.comments (id, post_id, user_id, content)
values ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Raiz');
select lives_ok($$
  insert into public.comments (id, post_id, user_id, content, reply_to_id)
  values ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Resposta', '72000000-0000-4000-8000-000000000001')
$$, 'resposta gravada');
select lives_ok($$
  insert into public.comments (id, post_id, user_id, content, reply_to_id)
  values ('72000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Resposta à resposta', '72000000-0000-4000-8000-000000000002')
$$, 'resposta à resposta gravada');
select results_eq($$
  select parent_id, reply_to_id from public.comments where id = '72000000-0000-4000-8000-000000000003'
$$, $$ values ('72000000-0000-4000-8000-000000000001'::uuid, '72000000-0000-4000-8000-000000000002'::uuid) $$, 'mesma raiz, alvo original preservado');
select throws_ok($$
  insert into public.comments (post_id, user_id, content, reply_to_id)
  values ('71000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Alvo de outro post', '72000000-0000-4000-8000-000000000001')
$$, '23514', null, 'resposta entre publicações recusada');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.posts where id = '71000000-0000-4000-8000-000000000002'), 0, 'pendente não lê post fechado');
select throws_ok($$
  insert into public.comments (post_id, user_id, content)
  values ('71000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Não aprovado')
$$, '42501', null, 'pendente não comenta em grupo fechado');
select throws_ok($$
  insert into public.comments (post_id, user_id, content, reply_to_id)
  values ('71000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Alvo inexistente', '72000000-0000-4000-8000-000000000099')
$$, '23514', null, 'alvo invisível não pode originar resposta');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$ delete from public.comments where id = '72000000-0000-4000-8000-000000000001' $$, 'excluir raiz preserva as respostas com referências nulas');
select * from finish();
rollback;

