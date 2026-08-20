-- 036: group admin cycle — is_deleted for soft delete (Wave F Task 8 Step 2).
--
-- The schema uses logical deletion in posts; groups follow the same pattern.
-- Adding is_deleted preserves the moderation trail that wave H will need.
-- The existing groups_select_locality_member policy already filters by
-- visibility; this migration adds the is_deleted filter so deleted groups
-- disappear from feeds and explore without losing the row.

alter table public.groups add column is_deleted boolean not null default false;

-- Update the select policy to exclude deleted groups.
drop policy if exists groups_select_locality_member on public.groups;
create policy groups_select_locality_member
on public.groups
for select
to authenticated
using (
  private.is_locality_member(locality_id)
  and is_deleted = false
);