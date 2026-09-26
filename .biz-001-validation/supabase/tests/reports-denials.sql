begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

\ir fixtures/foundation.inc
\ir fixtures/reports.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: nonmember cannot create or see reports
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.reports',
  'nonmember sees no reports'
);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000005',
      'post',
      '60000000-0000-4000-8000-000000000001',
      'Report by nonmember'
    )
  $$,
  42501,
  null,
  'nonmember cannot insert a report (not in locality)'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: self-report is blocked by trigger
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000001',
      'post',
      '60000000-0000-4000-8000-000000000001',
      'Reporting my own post'
    )
  $$,
  null,
  'cannot report your own content',
  'member-one cannot report their own post'
);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000001',
      'group',
      '80000000-0000-4000-8000-000000000001',
      'Reporting my own group'
    )
  $$,
  null,
  'cannot report your own content',
  'member-one cannot report their own group'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: user cannot see reports filed by other members
-- ═══════════════════════════════════════════════════════════════════════════

-- First, member-two creates a report
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.reports (reporter_user_id, target_type, target_id, reason)
values (
  '10000000-0000-4000-8000-000000000002',
  'post',
  '60000000-0000-4000-8000-000000000001',
  'Conteudo suspeito'
);

-- Now member-one tries to see member-two's reports
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.reports',
  'member-one cannot see reports filed by other members'
);

-- Even a verified member cannot see other member reports
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.reports
    where reporter_user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  'member-one cannot query reports by reporter_user_id'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: duplicate open report from same reporter on same target
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'post',
      '60000000-0000-4000-8000-000000000001',
      'Segunda denuncia do mesmo conteudo'
    )
  $$,
  '23505',
  null,
  'duplicate open report from same reporter on same target is rejected'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: authenticated user cannot update or resolve reports
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Authenticated user cannot update report status
select results_eq(
  $$
    update public.reports
    set status = 'resolved', operator_note = 'attempt'
    where reporter_user_id = '10000000-0000-4000-8000-000000000002'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'authenticated user cannot update report status'
);

-- Authenticated user cannot soft-delete content (trigger blocks is_deleted toggle)

-- member-one owns the post, so the UPDATE reaches the trigger.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    update public.posts
    set is_deleted = true
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  'P0001',
  null,
  'authenticated user cannot soft-delete a post'
);

-- member-two owns the comment, stays as current auth.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    update public.comments
    set is_deleted = true
    where id = '70000000-0000-4000-8000-000000000001'
  $$,
  'P0001',
  null,
  'authenticated user cannot soft-delete a comment'
);

-- member-one owns the group, switch back.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    update public.groups
    set is_deleted = true
    where id = '80000000-0000-4000-8000-000000000001'
  $$,
  'P0001',
  null,
  'authenticated user cannot soft-delete a group'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: invalid target_type in report
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'invalid_type'::text::public.report_target_type,
      '00000000-0000-4000-8000-000000000099',
      'Invalid target type'
    )
  $$,
  null,
  null,
  'invalid target_type is rejected by enum'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: empty reason is rejected by CHECK constraint
-- ═══════════════════════════════════════════════════════════════════════════

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'post',
      '60000000-0000-4000-8000-000000000001',
      ''
    )
  $$,
  '23514',
  null,
  'empty reason is rejected by CHECK constraint'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ALLOWED: member-one can still report member-two's comment (positive identity)
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000001',
      'comment',
      '70000000-0000-4000-8000-000000000001',
      'Comentario ofensivo'
    )
  $$,
  'member-one can report member-two''s comment (positive identity)'
);

-- member-one can see their own report
select results_eq(
  $$
    select target_type::text, reason
    from public.reports
    where reporter_user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$
    values
      ('comment', 'Comentario ofensivo')
  $$,
  'member-one can see their own report (positive identity)'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ALLOWED: service_role can bulk-read and resolve reports
-- ═══════════════════════════════════════════════════════════════════════════

reset role;

-- service_role can read both open reports
select results_eq(
  $$
    select count(*)::integer
    from public.reports
    where status = 'open'
  $$,
  $$ values (2::integer) $$,
  'service_role can see all open reports (positive identity)'
);

select * from finish();
rollback;
