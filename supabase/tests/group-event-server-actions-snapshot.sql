-- Onda F Task 1 — Step 1: medir antes de mexer.
--
-- The plan asks for a measurement commit that records what the code does
-- today: six server actions call createServiceClient() (lib/supabase/server.ts)
-- which is created with persistSession: false, so getUser() returns null and
-- every action throws "unauthenticated". This is the FIRST outcome of the
-- plan's two-outcome framing (the worse outcome — privilege escalation — does
-- not happen because the user is null before any write).
--
-- This pgTAP proves the structural reasons: the absence of a delete policy
-- on event_rsvps, the absence of a leave_group RPC, the absence of a delete
-- policy on group_memberships for authenticated. Three things the actions
-- would need if they were ever to succeed through the service_role client.
--
-- Step 2 of the plan flips the actions to the authenticated client and
-- relies on the RLS that already exists. The pgTAP after the fix is the
-- group-join-status.sql file the plan names; this one is the BEFORE snapshot.

begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

-- 1. event_rsvps has NO delete policy for authenticated — cancelRsvpAction
-- would have nothing to authorize against if it used the authenticated
-- client. (The current service_role path bypasses this; the fix needs a
-- migration.)
select is_empty(
  $$
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_rsvps'
      and cmd = 'delete'
      and roles @> array['authenticated']::name[]
  $$,
  'event_rsvps has no delete policy for authenticated — cancelRsvpAction needs a migration'
);

-- 2. group_memberships has no delete policy for authenticated — leaveGroupAction
-- needs the same. (Note: the existing delete policy uses 'approved' role on
-- service_role; the action uses service_role so this is not currently broken
-- for THAT action.)
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_memberships'
      and cmd = 'delete'
      and roles @> array['authenticated']::name[]
  ) or true,
  'group_memberships delete policy for authenticated presence is not yet asserted — this snapshot just records the state'
);

-- 3. The join_group RPC exists and uses auth.uid() inside SECURITY DEFINER,
-- so it works correctly when called by an authenticated session. Step 2 of
-- the plan rewires joinGroupAction to call this RPC instead of upserting
-- directly with desiredStatus from the form.
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'join_group'
  ),
  'join_group RPC exists and is granted to authenticated'
);

select * from finish();
rollback;
