-- post_saves: persistent bookmarking for feed posts
-- A member of a locality can save (bookmark) any post they can see.
-- All functions use set search_path = '' to prevent search-path injection.

-- ==== post_saves table ====================================================

create table public.post_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_saves_user_id_idx
  on public.post_saves (user_id, saved_at desc);

create index post_saves_post_id_idx
  on public.post_saves (post_id);

-- ==== RLS enable + force ==================================================

alter table public.post_saves enable row level security;
alter table public.post_saves force row level security;

-- ==== minimal grants ======================================================

revoke all on table public.post_saves from anon, authenticated;

grant select, insert, delete on table public.post_saves to authenticated;

-- ==== RLS policies ========================================================

-- SELECT: only see own saves
create policy post_saves_select_own
on public.post_saves
for select
to authenticated
using (
  user_id = (select auth.uid())
);

-- INSERT: must be self-authored and a member of the post's locality
create policy post_saves_insert_own
on public.post_saves
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = post_saves.post_id
      and private.is_locality_member(p.locality_id)
  )
);

-- DELETE: own saves only
create policy post_saves_delete_own
on public.post_saves
for delete
to authenticated
using (
  user_id = (select auth.uid())
);
