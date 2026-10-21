-- SEC-001/H3/L4: preserve moderated evidence and hide its social metadata.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);
\ir fixtures/foundation.inc

insert into public.posts (id, locality_id, user_id, post_type, content, is_deleted)
values
  ('40000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'text', 'Live evidence fixture', false),
  ('40000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'text', 'Removed evidence fixture', true),
  ('40000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'text', 'Parent of removed comment', false);
insert into public.comments (id, post_id, user_id, content, is_deleted)
values
  ('50000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000011',
   '10000000-0000-4000-8000-000000000001', 'Live comment fixture', false),
  ('50000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000013',
   '10000000-0000-4000-8000-000000000001', 'Removed comment fixture', true);

insert into public.post_reactions (post_id, user_id) select id, user_id from public.posts;
insert into public.post_saves (post_id, user_id) select id, user_id from public.posts;
insert into public.post_follows (post_id, user_id) select id, user_id from public.posts;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is_empty(format('select 1 from public.%I where post_id = %L', t,
  '40000000-0000-4000-8000-000000000012'), t || ': author cannot read removed metadata')
from unnest(array['post_reactions', 'post_saves', 'post_follows']) t;
select isnt_empty(format('select 1 from public.%I where post_id = %L', t,
  '40000000-0000-4000-8000-000000000011'), t || ': own live metadata remains readable')
from unnest(array['post_reactions', 'post_saves', 'post_follows']) t;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is_empty(format('select 1 from public.%I where post_id = %L', t,
  '40000000-0000-4000-8000-000000000012'), t || ': member cannot read removed metadata')
from unnest(array['post_reactions', 'post_saves', 'post_follows']) t;
select isnt_empty($$select 1 from public.post_reactions
  where post_id = '40000000-0000-4000-8000-000000000011'$$,
  'member still reads live reactions');
select is_empty('select 1 from public.post_saves', 'member cannot read another user saves');
select is_empty('select 1 from public.post_follows', 'member cannot read another user follows');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is_empty(format('select 1 from public.%I', t), t || ': outsider reads no metadata')
from unnest(array['post_reactions', 'post_saves', 'post_follows']) t;

reset role;
-- Test-only SELECT policies isolate write authorization from the SELECT guard.
-- Otherwise SELECT hides the rows first and a zero-row UPDATE/DELETE would pass
-- even with the defective write policies. These policies roll back with fixtures;
-- they are never part of the migration or of the deployed authorization model.
create policy sec001_test_evidence_posts on public.posts for select to authenticated
using (user_id = (select auth.uid()));
create policy sec001_test_evidence_comments on public.comments for select to authenticated
using (user_id = (select auth.uid()));

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is_empty($$update public.posts set content = 'Rewritten evidence'
  where id = '40000000-0000-4000-8000-000000000012' returning id$$,
  'author cannot rewrite a moderated post even if SELECT is available');
select is_empty($$delete from public.posts
  where id = '40000000-0000-4000-8000-000000000012' returning id$$,
  'author cannot physically delete a moderated post');
select is_empty($$update public.comments set content = 'Rewritten comment'
  where id = '50000000-0000-4000-8000-000000000012' returning id$$,
  'author cannot rewrite a moderated comment even if SELECT is available');
select is_empty($$delete from public.comments
  where id = '50000000-0000-4000-8000-000000000012' returning id$$,
  'author cannot physically delete a moderated comment');
select is((select content from public.posts where id = '40000000-0000-4000-8000-000000000012'),
  'Removed evidence fixture', 'post evidence still exists unchanged');
select is((select content from public.comments where id = '50000000-0000-4000-8000-000000000012'),
  'Removed comment fixture', 'comment evidence still exists unchanged');

select isnt_empty($$update public.posts set content = 'Updated live post'
  where id = '40000000-0000-4000-8000-000000000011' returning id$$,
  'author can still update a live post');
select isnt_empty($$update public.comments set content = 'Updated live comment'
  where id = '50000000-0000-4000-8000-000000000011' returning id$$,
  'author can still update a live comment');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is_empty($$update public.posts set content = 'Third party rewrite'
  where id = '40000000-0000-4000-8000-000000000011' returning id$$,
  'peer cannot update another author live post');
select is_empty($$delete from public.posts
  where id = '40000000-0000-4000-8000-000000000011' returning id$$,
  'peer cannot delete another author live post');
select is_empty($$update public.comments set content = 'Third party rewrite'
  where id = '50000000-0000-4000-8000-000000000011' returning id$$,
  'peer cannot update another author live comment');
select is_empty($$delete from public.comments
  where id = '50000000-0000-4000-8000-000000000011' returning id$$,
  'peer cannot delete another author live comment');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select isnt_empty($$delete from public.comments
  where id = '50000000-0000-4000-8000-000000000011' returning id$$,
  'author can still delete own live comment');
select isnt_empty($$delete from public.posts
  where id = '40000000-0000-4000-8000-000000000011' returning id$$,
  'author can still delete own live post');

set local role service_role;
select isnt_empty('select 1 from public.posts where is_deleted', 'operation still reads removed posts');
select isnt_empty('select 1 from public.comments where is_deleted', 'operation still reads removed comments');
select isnt_empty($$update public.posts set is_deleted = true
  where id = '40000000-0000-4000-8000-000000000012' returning id$$,
  'operation retains moderation update on removed posts');
select isnt_empty($$update public.comments set is_deleted = true
  where id = '50000000-0000-4000-8000-000000000012' returning id$$,
  'operation retains moderation update on removed comments');

select * from finish();
rollback;
