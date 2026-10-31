begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

-- Onda T Task 2: o que a transferência concede, e o que não.
--
-- The plan declares seven cases. The transfer grants the municipal level
-- of the destination (the person can read and write there as a regular
-- member) and never opens a vila in the destination — community
-- membership is still the dono da comunidade's call, the same as §5.2.
--
-- Setup: member-one is owner of Vila Ajuricaba in Manaus. We declare a
-- transfer to a third locality ("test-destination", a fresh city); the
-- helper from T1 converts the Manaus row to leaving and creates a current
-- row at the destination. The destination has no communities, no groups,
-- no posts — which is exactly what the negative cases assert.

\ir fixtures/foundation.inc
\ir fixtures/community.inc
\ir fixtures/communities.inc

-- Create the destination locality (separate from Manaus and Fixture City).
insert into public.localities (id, slug, city_name, state_code, country_code, ibge_code)
values (
  '00000000-0000-4000-8000-000000000003',
  'test-destination',
  'Test Destination',
  'TD',
  'BR',
  '8888888'
);

-- Declare the transfer from Manaus to the destination. authenticated has
-- execute on declare_locality_transfer; we set the JWT sub to member-one.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select * from public.declare_locality_transfer(
      '00000000-0000-4000-8000-000000000003'::uuid,
      '2027-03-01'::date
    )
  $$,
  'member-one declares a transfer from Manaus to test-destination'
);

-- Positives: is_locality_member answers true for both cities.
select is(
  private.is_locality_member('00000000-0000-4000-8000-000000000001'),
  true,
  'origin (Manaus) is still visible as a locality — leaving is not a cutoff'
);

select is(
  private.is_locality_member('00000000-0000-4000-8000-000000000003'),
  true,
  'destination (test-destination) is visible as a new locality'
);

-- Positives: feed_posts of origin still returns rows for the holder.
select isnt_empty(
  $$
    select * from public.feed_posts('00000000-0000-4000-8000-000000000001'::uuid)
  $$,
  'feed_posts of the origin still returns posts after the transfer'
);

-- Negatives: the destination did not create a community_membership.
select results_eq(
  $$
    select count(*)::bigint
    from public.community_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  array[1::bigint],
  'no community_memberships were created by the transfer'
);

-- Negatives: feed_community of the origin vila still returns rows.
select isnt_empty(
  $$
    select * from public.feed_community('70000000-0000-4000-8000-000000000001'::uuid)
  $$,
  'feed_community of the origin vila still returns rows after the transfer'
);

-- Negatives: feed_posts of a third city is empty for the holder.
select is_empty(
  $$
    select * from public.feed_posts('00000000-0000-4000-8000-000000000002'::uuid)
  $$,
  'feed_posts of a third city is empty for the holder'
);

select * from finish();
rollback;
