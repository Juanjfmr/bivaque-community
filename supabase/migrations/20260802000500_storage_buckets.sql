-- Create privacy-scoped storage buckets for avatars and event/post photos.
-- Buckets are private (public = false) — all access is gated by RLS policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'event-photos',
    'event-photos',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  );

-- Drop every default permissive storage policy so only the restrictive
-- policies below remain. PostgreSQL RLS policies for the same command are
-- combined with OR, so leaving a broad default policy in place would
-- create a bypass.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end
$$;

-- RLS is already enabled on storage.objects by the Storage service; access is
-- gated exclusively by the restrictive policies below (default permissive
-- policies were dropped above so no OR-bypass remains). The Storage API
-- evaluates these policies against the end-user's JWT.

-- ── Avatars ──────────────────────────────────────────────────────────────

-- Only the owning user may upload to their own avatar folder.
-- The first path segment must equal auth.uid().
create policy "avatars_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Any authenticated user may view avatars (profile photos are public to
-- signed-in members).
create policy "avatars_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

-- Only the owning user may update their own avatar files.
create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner = auth.uid()
);

-- Only the owning user may delete their own avatar files.
create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner = auth.uid()
);

-- ── Event / Post Photos ──────────────────────────────────────────────────

-- Any locality member may upload photos.
create policy "event_photos_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-photos'
  and exists (
    select 1
    from public.locality_memberships
    where user_id = auth.uid()
  )
);

-- Only locality members may view event photos.
create policy "event_photos_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-photos'
  and exists (
    select 1
    from public.locality_memberships
    where user_id = auth.uid()
  )
);

-- Only the original uploader may update an event photo.
create policy "event_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-photos'
  and owner = auth.uid()
);

-- Only the original uploader may delete an event photo.
create policy "event_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-photos'
  and owner = auth.uid()
);
