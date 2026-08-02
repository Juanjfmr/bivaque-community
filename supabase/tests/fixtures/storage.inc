-- Storage fixtures for pgTAP policy tests.
-- Inserted inside a transaction alongside foundation.inc — auto-rollback.

-- Member One avatar
insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'avatars',
  '10000000-0000-4000-8000-000000000001/photo.jpg',
  '10000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/jpeg","size":100000}'
);

-- Member Two avatar
insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'avatars',
  '10000000-0000-4000-8000-000000000002/photo.jpg',
  '10000000-0000-4000-8000-000000000002',
  '{"mimetype":"image/jpeg","size":100000}'
);

-- Event photo uploaded by Member One
insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'event-photos',
  'event-1/group.jpg',
  '10000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/jpeg","size":500000}'
);
