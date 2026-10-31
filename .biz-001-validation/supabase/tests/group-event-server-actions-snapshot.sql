-- Onda F Task 1 — Step 1: medir antes de mexer.
--
-- The plan asks for a measurement commit that records what the code does
-- today: six server actions call createServiceClient() (lib/supabase/server.ts)
-- which is created with persistSession: false, so getUser() returns null and
-- every action throws "unauthenticated". This is the FIRST outcome of the
-- plan's two-outcome framing (the worse outcome — privilege escalation — does
-- not happen because the user is null before any write).
--
-- This pgTAP proves the structural reasons and the fix: event_rsvps had no
-- delete policy for authenticated (cancelRsvpAction was broken — see
-- commit 20260819010000_self_delete_policies.sql for the fix). The
-- join_group RPC exists and is granted to authenticated (Step 2 of the
-- plan rewires joinGroupAction to call this RPC instead of upserting with
-- desiredStatus from the form).
--
-- group_memberships already had group_memberships_delete_self from
-- 20260802001000, which is why leaveGroupAction works without a new policy.

begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

-- 1. event_rsvps has a delete policy for authenticated. The fix lands in
-- 20260819010000_self_delete_policies.sql; this test is the proof. pgTAP's
-- pg_policies.cmd is the verb in upper case (DELETE, INSERT, SELECT, UPDATE).
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_rsvps'
      and cmd = 'DELETE'
      and roles @> array['authenticated']::name[]
  ),
  'event_rsvps has a delete policy for authenticated (cancelRsvpAction works)'
);

-- 2. The join_group RPC exists and is granted to authenticated.
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
