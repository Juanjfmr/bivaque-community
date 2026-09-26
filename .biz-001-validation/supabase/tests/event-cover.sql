-- Capa do evento (prancha 70, RECON-049 item [backend]).
--
-- O que esta suíte prova, contra o schema real:
--   * a coluna existe e aceita NULL (evento sem capa é estado legítimo);
--   * caminho vazio vira NULL, não string vazia;
--   * caminho FORA da pasta do organizador é recusado pelo trigger — é o que
--     impede apontar a capa de um evento para o objeto de outra pessoa;
--   * caminho na pasta do organizador é aceito.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc

-- 1) a coluna existe
select has_column('public', 'events', 'cover_path', 'events ganhou a coluna de capa');

-- 2) evento de fixture com organizador conhecido
insert into public.events (id, locality_id, organizer_id, title, description, starts_at, status)
values (
  'c0000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Evento com capa',
  'Fixture do trigger de capa.',
  now() + interval '3 days',
  'upcoming'
);

-- 3) sem capa: NULL é aceito
select is(
  (select cover_path from public.events where id = 'c0000000-0000-4000-8000-000000000001'),
  null::text,
  'evento sem capa tem cover_path nulo'
);

-- 4) caminho na pasta do organizador é aceito
select lives_ok(
  $$ update public.events
        set cover_path = '10000000-0000-4000-8000-000000000001/capa.png'
      where id = 'c0000000-0000-4000-8000-000000000001' $$,
  'caminho na pasta do organizador e aceito'
);

-- 5) caminho de outra pessoa é recusado
select throws_ok(
  $$ update public.events
        set cover_path = '10000000-0000-4000-8000-000000000002/capa.png'
      where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '22023',
  'cover path must live under the organizer folder',
  'caminho fora da pasta do organizador e recusado'
);

-- 6) string vazia normaliza para NULL
select lives_ok(
  $$ update public.events
        set cover_path = ''
      where id = 'c0000000-0000-4000-8000-000000000001' $$,
  'capa vazia e normalizada'
);

select is(
  (select cover_path from public.events where id = 'c0000000-0000-4000-8000-000000000001'),
  null::text,
  'string vazia vira nulo no banco'
);

select * from finish();
rollback;
