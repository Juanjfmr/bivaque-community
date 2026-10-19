begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
\ir fixtures/foundation.inc
\ir fixtures/community.inc

insert into public.posts (id, locality_id, user_id, post_type, content, is_deleted)
values ('40000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', 'text', 'Removed post', true);
insert into public.comments (id, post_id, user_id, content, is_deleted)
values
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'Removed comment', true),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001', 'Visible comment on removed post', false);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select count(*) from public.posts where is_deleted), 0::bigint,
  'scope member cannot directly read a moderated post');
select is((select count(*) from public.comments where is_deleted), 0::bigint,
  'scope member cannot directly read a moderated comment');
select is((select count(*) from public.comments where post_id = '40000000-0000-4000-8000-000000000002'),
  0::bigint, 'scope member cannot read comments of a moderated post');
select is((select count(*) from public.posts where id = '40000000-0000-4000-8000-000000000001'),
  1::bigint, 'live post remains readable');
select is((select count(*) from public.comments where id = '50000000-0000-4000-8000-000000000001'),
  1::bigint, 'live comment remains readable');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.posts where is_deleted), 0::bigint,
  'author also cannot read a moderated post');
select is((select count(*) from public.comments where user_id = auth.uid()), 0::bigint,
  'author also cannot read removed comments or comments of removed posts');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.posts), 0::bigint, 'cross-locality access remains denied');
select is((select count(*) from public.comments), 0::bigint, 'cross-locality comments remain denied');

set local role service_role;
select is((select count(*) from public.posts where is_deleted), 1::bigint,
  'server moderation client retains access to removed posts');
select is((select count(*) from public.comments where is_deleted), 1::bigint,
  'server moderation client retains access to removed comments');
select * from finish();
rollback;
