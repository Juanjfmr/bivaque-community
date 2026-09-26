-- P0 Task 2: admission_mode stops encoding rollout as eligibility.
--
-- public.localities.admission_mode was born with default 'waitlist_only'
-- (20260802000100) and gained 'verification_gated' in 20260809120000. No
-- runtime line reads this column today — grep for admission_mode in
-- apps/web and packages comes back empty. But when Task 1 inserted the
-- IBGE catalog, every new municipality was born 'waitlist_only': if someone
-- later wires the column to the gate, the geographic restriction the P0
-- removes from code comes back through the data — the 'pilot=true' that
-- ADR-20260816-national-localities decision 8 prohibits, in the schema
-- before the decision existed.
--
-- Eligibility is the CPF against the Portal, not the geography. The column
-- survives: 'invite_only' and 'waitlist_only' remain legitimate exceptions
-- for a specific locality in the future; what changes is that they stop
-- being the default.

alter table public.localities
  alter column admission_mode set default 'verification_gated';

-- Re-align the catalog rows that the Task 1 load inserted under the old
-- default. Manaus was already moved in 20260809120100.
update public.localities
  set admission_mode = 'verification_gated'
  where admission_mode = 'waitlist_only';
