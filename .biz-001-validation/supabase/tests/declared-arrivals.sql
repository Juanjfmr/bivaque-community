begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

-- Onda T Task 5: o sinal de quem está chegando.
--
-- member-two is already a pending request on Vila Ajuricaba (communities.inc)
-- and already a Manaus member (foundation.inc, kind='current' by default).
-- We add a kind='leaving' row pointing at Fixture City to simulate a
-- declared transfer INTO Manaus — the RPC only reads the kind/leaving_at
-- shape, it does not care which direction the transfer actually ran in a
-- fixture. hidden-member is added as a second pending request with no
-- leaving row, to prove the organic (non-transferred) case stays null.

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

reset role;

insert into public.locality_memberships (user_id, locality_id, kind, leaving_at, access)
values (
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'leaving',
  (current_date + interval '30 days')::date,
  'active'
);

insert into public.community_memberships (community_id, user_id, role, status)
values ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'member', 'pending');

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-00000000000c', 'operator-arrivals@example.invalid');

insert into public.operators (auth_user_id, notes)
values ('10000000-0000-4000-8000-00000000000c', 'fixture: operator for arrivals volume');

-- 1. The transferring pending requester surfaces the origin city and date.
select is(
  (
    select arriving_from_locality_name
    from public.list_community_pending_arrivals(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
    where user_id = '10000000-0000-4000-8000-000000000002'
  ),
  'Fixture City',
  'a pending requester with a declared transfer shows the origin city'
);

select is(
  (
    select arriving_at
    from public.list_community_pending_arrivals(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
    where user_id = '10000000-0000-4000-8000-000000000002'
  ),
  (current_date + interval '30 days')::date,
  'the declared arrival date matches the leaving row'
);

-- 2. An organic (non-transferred) pending requester shows no arrival signal.
select is(
  (
    select arriving_from_locality_name
    from public.list_community_pending_arrivals(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
    where user_id = '10000000-0000-4000-8000-000000000005'
  ),
  null,
  'a pending requester with no declared transfer shows no origin city (negative)'
);

-- 3. No affiliation field of any kind exists on the return shape — the
-- function signature is the contract, and this is what stops "força/OM/
-- posto/turma" from ever being added to this RPC without the diff showing
-- up here first.
select is(
  pg_get_function_result('public.list_community_pending_arrivals(uuid, uuid, int)'::regprocedure),
  'TABLE(user_id uuid, display_name text, requested_at timestamp with time zone, arriving_from_locality_name text, arriving_at date)',
  'the return shape carries only name, dates and the origin city name (negative)'
);

-- 4. A non-moderator cannot list the queue.
select throws_ok(
  $$
    select * from public.list_community_pending_arrivals(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  null,
  'a non-moderator is denied the community arrivals queue (negative)'
);

-- 5. The founder console: volume of declared arrivals per destination
-- locality. Only member-two counts (the only kind='leaving' holder here),
-- landing on Manaus (the destination their kind='current' row points at).
select is(
  (
    select arrivals_count
    from public.list_locality_arrivals_volume('10000000-0000-4000-8000-00000000000c')
    where locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the founder console counts one declared arrival into Manaus'
);

select ok(
  not exists (
    select 1
    from public.list_locality_arrivals_volume('10000000-0000-4000-8000-00000000000c')
    where locality_id = '00000000-0000-4000-8000-000000000002'
  ),
  'Fixture City is the origin, not a destination, so it carries no arrivals (negative)'
);

-- 6. A non-operator cannot read the founder console's volume.
select throws_ok(
  $$
    select * from public.list_locality_arrivals_volume('10000000-0000-4000-8000-000000000001')
  $$,
  '42501',
  null,
  'a non-operator is denied the founder console arrivals volume (negative)'
);

select * from finish();
rollback;
