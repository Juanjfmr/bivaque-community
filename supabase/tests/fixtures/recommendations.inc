-- Recommendations fixture: extends foundation.inc with additional users
-- and seed recommendation data for scope and denial testing.
-- Must be included AFTER foundation.inc inside a transaction.
-- Uses example.invalid identities and fixed UUIDs. Never real data.

-- Add a new Manaus member for recommendation author scenarios.
-- User 007 is a regular Manaus member (not verified).
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000007', 'recommender@example.invalid');

insert into public.locality_memberships (user_id, locality_id)
values ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001');

insert into public.profiles (user_id, locality_id, display_name, visibility)
values (
  '10000000-0000-4000-8000-000000000007',
  '00000000-0000-4000-8000-000000000001',
  'Recommender',
  'locality_members'
);

-- A locality-scoped recommendation request authored by member-one.
insert into public.recommendation_requests (
  id,
  author_id,
  locality_id,
  title,
  body,
  category,
  created_at
)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Algum dentista de confianca na zona leste?',
  'Estou procurando um dentista que atenda na zona leste de Manaus, de preferencia com horario flexivel.',
  'saude_bem_estar',
  '2026-08-02 14:00:00+00'
);

-- A reply to the locality-scoped request.
insert into public.recommendation_replies (
  id,
  request_id,
  author_id,
  body,
  created_at
)
values (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Conheco uma clinica muito boa perto do Aleixo. O atendimento e otimo e aceitam varios convenios.',
  '2026-08-02 15:00:00+00'
);

-- A save/bookmark on the request by member-two.
insert into public.recommendation_saves (
  user_id,
  request_id,
  saved_at
)
values (
  '10000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000001',
  '2026-08-02 16:00:00+00'
);
