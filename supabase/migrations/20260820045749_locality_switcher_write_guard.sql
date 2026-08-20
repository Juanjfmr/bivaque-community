-- Onda T Task 4: the locality switcher surfaces the origin's read-only state
-- to the member — but the T3 migration (20260820000000) only added the
-- active-membership check to posts/comments/post_reactions, never to
-- events. A degraded (read_only) origin holder could still organize a new
-- event there through direct API access, even though the UI now tells them
-- they can only read. Rule 6 of §12 applies here too: the write policy and
-- the UI that explains it land together.
--
-- events_update_organizer is untouched on purpose: editing or cancelling an
-- event you already organized is managing something you own, not publishing
-- new content into a scope you're leaving — the same distinction T3 drew for
-- "sair de vez é ato da pessoa".

drop policy if exists events_insert_verified_member on public.events;

create policy events_insert_verified_member
on public.events
for insert
to authenticated
with check (
  organizer_id = (select auth.uid())
  and private.is_verified_locality_member(locality_id)
  and private.is_active_locality_member(locality_id)
);
