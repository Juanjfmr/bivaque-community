begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc
\ir fixtures/reports.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: member-two reports member-one's post
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- member-two can create a report against member-one's post
select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'post',
      '60000000-0000-4000-8000-000000000001',
      'Conteudo inadequado'
    )
  $$,
  'member-two can report a post by another member'
);

-- member-two can see their own report
select results_eq(
  $$
    select target_type::text, reason, status::text
    from public.reports
    where reporter_user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$
    values
      ('post', 'Conteudo inadequado', 'open')
  $$,
  'reporter can see their own report with all fields'
);

-- member-two can create a report against member-one's group
select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'group',
      '80000000-0000-4000-8000-000000000001',
      'Grupo com nome suspeito'
    )
  $$,
  'member-two can report a group'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: operator (service_role) resolves a report
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

-- Resolve the post report as service_role
select lives_ok(
  $$
    update public.reports
    set
      status = 'resolved',
      operator_note = 'Post removido por violacao das regras',
      resolved_by = '10000000-0000-4000-8000-000000000001',
      resolved_at = now()
    where target_type = 'post'
      and target_id = '60000000-0000-4000-8000-000000000001'
      and reporter_user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  'service_role can resolve a report'
);

-- Verify resolution fields are persisted
select results_eq(
  $$
    select status::text, operator_note, resolved_by
    from public.reports
    where target_type = 'post'
      and target_id = '60000000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      'resolved'::text,
      'Post removido por violacao das regras'::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'report resolution fields are auditable after service_role update'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: operator soft-deletes reported content
-- ═══════════════════════════════════════════════════════════════════════════

-- Soft-delete the reported post
select lives_ok(
  $$
    update public.posts
    set is_deleted = true
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  'service_role can soft-delete a post'
);

-- Verify the post is soft-deleted
select results_eq(
  $$
    select is_deleted
    from public.posts
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  $$ values (true) $$,
  'post is_deleted flag is set after operator soft-delete'
);

-- Soft-delete a comment
select lives_ok(
  $$
    update public.comments
    set is_deleted = true
    where id = '70000000-0000-4000-8000-000000000001'
  $$,
  'service_role can soft-delete a comment'
);

-- Soft-delete a group
select lives_ok(
  $$
    update public.groups
    set is_deleted = true
    where id = '80000000-0000-4000-8000-000000000001'
  $$,
  'service_role can soft-delete a group'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: feed_posts filters out soft-deleted posts
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- The deleted post should NOT appear in feed_posts
select is_empty(
  $$
    select 1
    from public.feed_posts(
      '00000000-0000-4000-8000-000000000001',
      'recent'
    )
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  'soft-deleted post does not appear in feed_posts'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: operator can read all reports
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

select results_eq(
  $$
    select count(*)::integer
    from public.reports
  $$,
  $$ values (2::integer) $$,
  'service_role can see all reports (both open and resolved)'
);

select * from finish();
rollback;
