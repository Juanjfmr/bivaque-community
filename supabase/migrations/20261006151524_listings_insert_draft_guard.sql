-- FIGMA-002 review delta: property listings are born as drafts. Their details
-- are created afterwards by create_property_listing; only the existing guarded
-- UPDATE may activate them. Applies to direct INSERT as well as the RPC.
create function private.listings_insert_draft_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if NEW.kind = 'property' and NEW.status <> 'draft' then
    raise exception 'property listing must be created as draft'
      using errcode = '23514';
  end if;
  return NEW;
end;
$$;

revoke all on function private.listings_insert_draft_guard() from public, anon, authenticated;

create trigger listings_insert_draft_guard
before insert on public.listings
for each row execute function private.listings_insert_draft_guard();
