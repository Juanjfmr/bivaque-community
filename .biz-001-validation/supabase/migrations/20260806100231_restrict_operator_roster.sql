-- Close the operator roster to ordinary members.
--
-- The table shipped with "grant select ... to authenticated" and a policy of
-- using (true), described as transparency. In a private community for verified
-- military, veterans and pensioners, that publishes a target list: it names
-- everyone holding elevated privilege, and exposes granted_by, revoked_by and a
-- free-text notes column an operator writes. It also sits badly next to a
-- product that deliberately refuses to persist rank, military organisation and
-- residential address to limit exactly this kind of exposure.
--
-- Nothing functional depends on the grant. Authorization runs through
-- private.is_operator(), which is security definer and bypasses RLS, and the
-- Onda 1 admin surface will read the table with service_role, which bypasses it
-- too. No client code queries public.operators today.
--
-- If members should ever be told who moderates them, that is a purpose-built
-- view or RPC exposing display names only — not raw SELECT on this table.

drop policy operators_select_authenticated on public.operators;

-- The SELECT grant stays. Removing it makes the table raise 42501, which both
-- aborts any transaction that touches it and confirms to the caller that the
-- table exists. Leaving the grant with no matching policy is the pattern this
-- schema already uses — see the note on public.reports in migration 016 — and
-- it denies silently: zero rows, no signal.
--
-- service_role keeps full access: it is what the admin surface uses, and it
-- bypasses RLS regardless of policy.
