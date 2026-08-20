-- 037: event photos bucket for post photo uploads (Wave F Task 9).
--
-- Private bucket with scoped read access. The model follows the verification-
-- documents bucket (migration 032) and the storage-policies test suite.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies for event-photos bucket.
-- Members can upload their own photos; read access is scoped to the post
--'s
-- visibility (the photo is accessible if the member can see the post).

create policy event_photos_insert_self
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-photos'
  and owner = auth.uid()
);

create policy event_photos_select_scoped
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-photos'
  and exists (
    select 1 from public.posts p
    where p.photo_path = storage.objects.name
      and private.is_locality_member(p.locality_id)
  )
);
