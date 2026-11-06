begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Evento de alcance cidade (sem grupo/comunidade), organizado pela conta 001.
insert into public.events (
  id, organizer_id, locality_id, title, description, starts_at, venue
)
values (
  'e0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Encontro com alcance fixo',
  'Fixture do trigger de alcance.',
  now() + interval '3 days',
  'Parque Municipal'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Edição legítima continua liberada: título, descrição, local, horário e capa.
select lives_ok(
  $$
    update public.events
       set title = 'Encontro com alcance fixo (editado)',
           description = 'Descrição editada pelo organizador.',
           venue = 'Parque Municipal, portão principal',
           starts_at = now() + interval '5 days',
           cover_path = '10000000-0000-4000-8000-000000000001/capa.png'
     where id = 'e0000000-0000-4000-8000-000000000001'
  $$,
  'organizador ainda edita título, descrição, local, horário e capa'
);

-- Alcance imutável depois do insert.
select throws_ok(
  $$
    update public.events
       set locality_id = '00000000-0000-4000-8000-000000000002'
     where id = 'e0000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'event scope cannot change after creation',
  'trocar a localidade do encontro é recusado'
);

select throws_ok(
  $$
    update public.events
       set group_id = '80000000-0000-4000-8000-000000000001'
     where id = 'e0000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'event scope cannot change after creation',
  'trocar o grupo do encontro é recusado'
);

select throws_ok(
  $$
    update public.events
       set community_id = '70000000-0000-4000-8000-000000000001'
     where id = 'e0000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'event scope cannot change after creation',
  'trocar a comunidade do encontro é recusado'
);

select * from finish();
rollback;
