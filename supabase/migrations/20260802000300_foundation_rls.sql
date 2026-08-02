alter table public.localities enable row level security;
alter table public.localities force row level security;
alter table public.locality_memberships enable row level security;
alter table public.locality_memberships force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table private.verification_outcomes enable row level security;
alter table private.verification_outcomes force row level security;
alter table private.family_invitations enable row level security;
alter table private.family_invitations force row level security;
alter table private.family_account_links enable row level security;
alter table private.family_account_links force row level security;

create function private.is_locality_member(target_locality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locality_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.locality_id = target_locality_id
  );
$$;

revoke all on function private.is_locality_member(uuid) from public;
revoke all on function private.is_locality_member(uuid) from anon;
revoke all on function private.is_locality_member(uuid) from authenticated;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_locality_member(uuid) to authenticated;

revoke all on table public.localities from anon, authenticated;
revoke all on table public.locality_memberships from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;

grant select on table public.localities to authenticated;
grant select on table public.locality_memberships to authenticated;
grant select, insert, update on table public.profiles to authenticated;

grant all on table private.verification_outcomes to service_role;
grant all on table private.family_invitations to service_role;
grant all on table private.family_account_links to service_role;

create policy localities_select_same_membership
on public.localities
for select
to authenticated
using (private.is_locality_member(id));

create policy locality_memberships_select_self
on public.locality_memberships
for select
to authenticated
using (user_id = (select auth.uid()));

create policy profiles_select_visible_in_locality
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    visibility = 'locality_members'
    and private.is_locality_member(locality_id)
  )
);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_locality_member(locality_id)
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and private.is_locality_member(locality_id)
);
