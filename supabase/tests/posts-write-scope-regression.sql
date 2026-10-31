begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc
\ir fixtures/community.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok($$
  insert into public.posts (id, locality_id, user_id, post_type, content)
  values ('40000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 'text', 'Own active post')
$$, 'active members can publish their own posts');

select throws_ok($$
  insert into public.posts (locality_id, user_id, post_type, content)
  values ('00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002', 'text', 'Spoofed author')
$$, '42501', null, 'members cannot publish as another author');

select lives_ok($$
  insert into public.post_reactions (post_id, user_id)
  values ('40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001')
$$, 'active members can react as themselves');

select throws_ok($$
  insert into public.post_reactions (post_id, user_id)
  values ('40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002')
$$, '42501', null, 'members cannot react as another author');

reset role;
update public.locality_memberships set access = 'read_only'
where user_id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;

select ok(exists(
  select 1 from public.posts where id = '40000000-0000-4000-8000-000000000001'
), 'read-only members keep reading their locality');

select throws_ok($$
  insert into public.posts (locality_id, user_id, post_type, content)
  values ('00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 'text', 'Read-only write')
$$, '42501', null, 'read-only membership cannot insert posts');

select throws_ok($$
  insert into public.post_reactions (post_id, user_id)
  values ('40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001')
$$, '42501', null, 'permissive policies cannot bypass the read-only reaction guard');

reset role;
update public.locality_memberships set access = 'active'
where user_id = '10000000-0000-4000-8000-000000000001';
update public.profiles set is_suspended = true
where user_id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;

select throws_ok($$
  insert into public.posts (locality_id, user_id, post_type, content)
  values ('00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 'text', 'Suspended write')
$$, '42501', null, 'suspension still prevents post insertion');

select throws_ok($$
  insert into public.post_reactions (post_id, user_id)
  values ('40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001')
$$, '42501', null, 'suspension still prevents reactions');

select * from finish();
rollback;
