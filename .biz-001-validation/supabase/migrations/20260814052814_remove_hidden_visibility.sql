-- D09 removes the 'hidden' profile state (BIVAQUE.md §4.3): every profile is
-- now visible to locality members. The UI choice is gone, so convert any
-- remaining hidden rows and narrow the enum to a single value.

-- 1. Drop the policy that references the visibility column: Postgres will not
--    alter the type of a column a policy depends on. It is recreated below.
drop policy if exists profiles_select_visible_in_locality on public.profiles;

-- 2. The column default references the old enum type; drop it before the swap.
alter table public.profiles
  alter column visibility drop default;

-- 3. Convert any remaining hidden profiles. In practice this is a no-op (the
--    pilot never had real hidden rows), but it must run before the enum loses
--    the value or the update would fail.
update public.profiles
  set visibility = 'locality_members'
  where visibility = 'hidden';

-- 4. Postgres cannot drop an enum value, so rename the old type, create the
--    narrowed one, migrate the column, and drop the old type.
alter type public.profile_visibility rename to profile_visibility_legacy;

create type public.profile_visibility as enum ('locality_members');

alter table public.profiles
  alter column visibility type public.profile_visibility
  using (visibility::text::public.profile_visibility);

alter table public.profiles
  alter column visibility set default 'locality_members';

drop type public.profile_visibility_legacy;

-- 5. Recreate the select policy without the now-redundant visibility check:
--    every profile is visible to its locality members.
create policy profiles_select_visible_in_locality
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_locality_member(locality_id)
);
