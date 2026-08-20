begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

-- Onda F Task 3 — closing the actual gap that made the feature never work,
-- found doing manual browser QA of the Checkbox fix (unrelated task):
-- private.can_receive_invite_to_event (20260821000009) was never exposed
-- as a public RPC, so event-invites-actions.ts's
-- `supabase.rpc("can_receive_invite_to_event", ...)` always failed with
-- "function not found in schema cache" — the private schema is never
-- exposed via the Data API (AGENTS.md), by design, and there was no public
-- wrapper. The client discarded the error and the invite list was always
-- empty. 20260821000019 adds the wrapper this file tests directly, the
-- same way the app calls it: via .rpc(), not by reaching into `private`.
--
-- The candidate-listing side had its own bug on top: reading the app's
-- client-side loop against seed.sql's ~300-member Manaus locality
-- (`.in("user_id", allowed)` with 300 ids) failed with "URI too long" —
-- 20260821000021 replaces the whole client loop with a single RPC,
-- list_invitable_members_for_event, which this file also tests.

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

reset role;

insert into public.events (
  id, organizer_id, locality_id, title, starts_at, status
) values (
  '60000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Evento de teste da RPC pública',
  now() + interval '7 days',
  'upcoming'
);

-- 1-2. The public wrapper, called the way the app actually calls it
-- (service_role, via .rpc(), never reaching into `private` directly).
set local role service_role;

select is(
  public.can_receive_invite_to_event(
    '60000000-0000-4000-8000-000000000011'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid
  ),
  true,
  'the public wrapper reaches the same locality member the private function allows'
);

select is(
  public.can_receive_invite_to_event(
    '60000000-0000-4000-8000-000000000011'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid
  ),
  false,
  'the public wrapper denies the same other-locality member the private function denies (negative)'
);

-- 3. The organizer's invitable list surfaces the eligible locality member.
select ok(
  exists (
    select 1
    from public.list_invitable_members_for_event(
      '60000000-0000-4000-8000-000000000011'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
    where user_id = '10000000-0000-4000-8000-000000000002'::uuid
  ),
  'the invitable list includes the eligible locality member'
);

-- 4. The other-locality member never appears (negative — same scope guard
-- as the RLS insert policy, now also enforced in the listing).
select ok(
  not exists (
    select 1
    from public.list_invitable_members_for_event(
      '60000000-0000-4000-8000-000000000011'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
    where user_id = '10000000-0000-4000-8000-000000000003'::uuid
  ),
  'the invitable list excludes the other-locality member (negative)'
);

-- 5. A non-organizer calling the listing gets nothing back — the function
-- checks p_user_id against the event's organizer_id itself, it does not
-- trust the caller.
select is(
  (
    select count(*)::bigint
    from public.list_invitable_members_for_event(
      '60000000-0000-4000-8000-000000000011'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  ),
  0::bigint,
  'a non-organizer gets an empty invitable list, not someone else''s (negative)'
);

-- 6. Once invited, the same member is flagged is_already_invited instead
-- of disappearing from the list — the UI needs both the eligible set and
-- who among them already has a pending invite.
insert into public.event_invites (event_id, invitee_user_id, invited_by)
values (
  '60000000-0000-4000-8000-000000000011'::uuid,
  '10000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid
);

select is(
  (
    select is_already_invited
    from public.list_invitable_members_for_event(
      '60000000-0000-4000-8000-000000000011'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
    where user_id = '10000000-0000-4000-8000-000000000002'::uuid
  ),
  true,
  'an already-invited member is flagged, not removed from the list'
);

select * from finish();
rollback;
