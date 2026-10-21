-- SEC-AUD-002 — a reserva SQL do outbox não pode exceder o teto HTTP.
--
-- Uma fila de 5.001 avisos vencidos precisa drenar em chamadas limitadas: o
-- primeiro lote leva 5.000, o segundo leva o restante, e os IDs fora do primeiro
-- lote continuam vencidos (updated_at não foi adiantado) em vez de ficarem
-- parados para sempre atrás de um POST recusado.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
\ir fixtures/foundation.inc

reset role;

insert into public.outbox (recipient, channel, type, payload, updated_at)
select
  'batch-' || g || '@example.invalid',
  'email',
  'comment',
  '{}'::jsonb,
  '2026-01-01 00:00:00+00'::timestamptz
from generate_series(1, 5001) as g;

create temporary table batch_one as
select id from private.outbox_prepare_due() as due(id);

select is(
  (select count(*) from batch_one),
  5000::bigint,
  'a primeira reserva respeita o teto de 5.000 do consumidor HTTP'
);

select is(
  (
    select count(*)::integer
      from public.outbox
     where status = 'pending'
       and updated_at = '2026-01-01 00:00:00+00'::timestamptz
  ),
  1,
  'o ID fora do primeiro lote continua vencido e com o updated_at original'
);

create temporary table batch_two as
select id from private.outbox_prepare_due() as due(id);

select is(
  (select count(*) from batch_two),
  1::bigint,
  'a chamada seguinte leva o ID que restou'
);

select is_empty(
  $$ select 1 from batch_one where id in (select id from batch_two) $$,
  'o segundo lote não repete um ID já reservado'
);

select is_empty(
  $$ select * from private.outbox_prepare_due() $$,
  'uma terceira chamada não encontra mais nada vencido'
);

select is(
  (
    select count(*)::integer
      from public.outbox
     where status = 'pending'
       and updated_at = '2026-01-01 00:00:00+00'::timestamptz
  ),
  0,
  'todos os 5.001 IDs foram reservados em duas chamadas limitadas'
);

select * from finish();
rollback;
