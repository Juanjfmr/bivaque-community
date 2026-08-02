begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

\ir fixtures/foundation.inc
\ir fixtures/events.inc
\ir fixtures/authz.inc

-- ── venue CHECK constraint: rejects personal/residential/military addresses ──

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Rua',
      '2026-09-10 10:00:00+00',
      'Rua das Flores, 123'
    )
  $$,
  23514,
  null,
  'venue CHECK rejects value containing "Rua"'
);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Avenida',
      '2026-09-10 10:00:00+00',
      'Avenida Principal, 456'
    )
  $$,
  23514,
  null,
  'venue CHECK rejects value containing "Avenida"'
);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Militar',
      '2026-09-10 10:00:00+00',
      'Quartel General'
    )
  $$,
  23514,
  null,
  'venue CHECK rejects value containing "Quartel"'
);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Residencial',
      '2026-09-10 10:00:00+00',
      'Condomínio Residencial Bela Vista'
    )
  $$,
  23514,
  null,
  'venue CHECK rejects value containing "Condomínio" or "Residencial"'
);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Endereço',
      '2026-09-10 10:00:00+00',
      'Endereço: Rua X'
    )
  $$,
  23514,
  null,
  'venue CHECK rejects value containing "Endereço"'
);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Base Aérea',
      '2026-09-10 10:00:00+00',
      'Base Aérea de Manaus'
    )
  $$,
  23514,
  null,
  'venue CHECK rejects value containing "Base Aérea"'
);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento CEP',
      '2026-09-10 10:00:00+00',
      'CEP 69000-000'
    )
  $$,
  23514,
  null,
  'venue CHECK rejects value containing "CEP"'
);

-- ── valid venues pass CHECK ─────────────────────────────────────────────────

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Válido 1',
      '2026-09-10 10:00:00+00',
      'Parque Municipal'
    )
  $$,
  'venue CHECK accepts public place "Parque Municipal"'
);

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Válido 2',
      '2026-09-10 10:00:00+00',
      'Centro de Convenções'
    )
  $$,
  'venue CHECK accepts "Centro de Convenções"'
);

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Válido 3',
      '2026-09-10 10:00:00+00',
      'Praça da Matriz'
    )
  $$,
  'venue CHECK accepts "Praça da Matriz"'
);

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento sem Venue',
      '2026-09-10 10:00:00+00'
    )
  $$,
  'null venue is accepted'
);

-- ── unverified member cannot create events ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000001',
      'Evento Não Autorizado',
      '2026-09-10 10:00:00+00',
      'Parque Municipal'
    )
  $$,
  42501,
  null,
  'unverified locality member cannot create an event'
);

-- ── cross-locality user cannot create an event in another locality ───────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000001',
      'Evento Intruso',
      '2026-09-10 10:00:00+00',
      'Parque Municipal'
    )
  $$,
  42501,
  null,
  'cross-locality user cannot create an event in another locality'
);

-- ── cross-user cannot update another organizer's event ──────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    update public.events
    set title = 'Hijacked'
    where id = '30000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'non-organizer cannot update another member event'
);

-- ── cross-user cannot RSVP as someone else ──────────────────────────────────

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'going'
    )
  $$,
  'P0001',
  null,
  'user cannot RSVP on behalf of another user'
);

-- ── nonmember cannot create events ──────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000001',
      'Evento Não Membro',
      '2026-09-10 10:00:00+00',
      'Parque Municipal'
    )
  $$,
  42501,
  null,
  'nonmember cannot create an event'
);

-- ── waitlist user cannot create events ──────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000006',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-000000000001',
      'Evento Waitlist',
      '2026-09-10 10:00:00+00',
      'Parque Municipal'
    )
  $$,
  42501,
  null,
  'waitlist user cannot create an event'
);

-- ── organizer cannot set venue to a residential address ─────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento Casa',
      '2026-09-10 10:00:00+00',
      'Minha Casa'
    )
  $$,
  'venue CHECK accepts "Minha Casa" ("Casa" is not in the blocked-pattern list)'
);

-- ── organizer cannot insert event for another user ──────────────────────────

select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      'Evento Alheio',
      '2026-09-10 10:00:00+00',
      'Parque Municipal'
    )
  $$,
  42501,
  null,
  'user cannot create event with another user as organizer'
);

-- ── cross-user RSVP denial ──────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003',
      'interested'
    )
  $$,
  42501,
  null,
  'cross-locality user cannot RSVP to another locality event'
);

select * from finish();
rollback;
