begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc

select lives_ok(
  $$
    update private.family_invitations
    set
      status = 'accepted',
      accepted_by_user_id = '10000000-0000-4000-8000-000000000002',
      accepted_at = '2026-08-03 12:00:00+00'
    where id = '20000000-0000-4000-8000-000000000001';

    insert into private.family_account_links (
      invitation_id,
      holder_user_id,
      family_user_id
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    );
  $$,
  'an accepted invitation can create a private account link'
);

select results_eq(
  $$
    select holder_user_id, family_user_id
    from private.family_account_links
    where invitation_id = '20000000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'the link preserves only account identifiers and invitation provenance'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) from public.locality_memberships',
  array[1::bigint],
  'an invited family account keeps its own membership boundary'
);

select results_eq(
  $$
    update public.profiles
    set display_name = 'Family Owned Holder'
    where user_id = '10000000-0000-4000-8000-000000000001'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'a family link does not grant ownership of the holder profile'
);

select * from finish();
rollback;
