-- The owner-facing "Excluir grupo" button (deleteGroupAction,
-- groups/[id]/page.tsx) writes groups.is_deleted through the authenticated
-- client, but block_soft_delete_groups (20260802001600_reports.sql) raises
-- 'only service_role can toggle is_deleted' for anyone but service_role —
-- the button has always thrown. This RPC does the same ownership check as
-- transfer_group_ownership, then runs the toggle as the function owner
-- (security definer), which the trigger allows.

create function public.delete_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can delete the group';
  end if;

  update public.groups
  set is_deleted = true
  where id = p_group_id;
end;
$$;

revoke all on function public.delete_group(uuid) from public;
revoke all on function public.delete_group(uuid) from anon;
revoke all on function public.delete_group(uuid) from authenticated;

grant execute on function public.delete_group(uuid) to authenticated;
