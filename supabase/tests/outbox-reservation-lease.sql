-- SEC-AUD-003 / M3 da revisao final (2026-10-21) - a reserva do outbox dura
-- mais que o pior caso de um bloco de entrega.
--
-- `private.outbox_prepare_due()` adiantava `updated_at` para `now()`. Com
-- `attempts = 0`, a linha voltava a vencer em 60 segundos; se o envio de 100
-- mensagens demorasse mais que isso, outro disparo reservava e reenviava o que
-- ainda estava em voo.
--
-- A reserva passa a ter uma coluna propria, `reserved_until`. `updated_at`
-- continua marcando a ultima escrita (e alimenta o backoff), entao o
-- consumidor HTTP nao precisa de nenhuma regra nova: a linha reservada segue
-- vencida para ele. Outro despachante ignora a linha enquanto
-- `reserved_until > now()`; depois do prazo, sem confirmacao, ela volta a ser
-- elegivel. O consumidor limpa a reserva ao gravar a mutacao.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
\ir fixtures/foundation.inc

reset role;

select has_column(
  'public',
  'outbox',
  'reserved_until',
  'outbox tem a coluna de reserva'
);

insert into public.outbox (id, recipient, channel, type, payload, updated_at)
values (
  '50000000-0000-4000-8000-0000000000a1',
  'member-one@example.invalid',
  'email',
  'comment',
  '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb,
  now() - interval '10 minutes'
);

create temporary table reserved as
select id from private.outbox_prepare_due() as due(id);

select is(
  (select count(*) from reserved),
  1::bigint,
  'a linha vencida e reservada'
);

select ok(
  (
    select reserved_until >= now() + interval '4 minutes'
      from public.outbox
     where id = '50000000-0000-4000-8000-0000000000a1'
  ),
  'a reserva dura pelo menos 5 minutos'
);

select ok(
  (
    select updated_at <= now()
      from public.outbox
     where id = '50000000-0000-4000-8000-0000000000a1'
  ),
  'a reserva nao adianta updated_at para o futuro; o backoff segue intacto'
);

-- Simula o backoff vencido durante o envio: sem a reserva, a segunda chamada
-- levaria a mesma linha e ela seria reenviada.
update public.outbox
   set updated_at = now() - interval '10 minutes'
 where id = '50000000-0000-4000-8000-0000000000a1';

select is_empty(
  $$ select * from private.outbox_prepare_due() $$,
  'outro despachante nao reserva a mensagem enquanto a reserva vale'
);

update public.outbox
   set reserved_until = now() - interval '1 second'
 where id = '50000000-0000-4000-8000-0000000000a1';

select is(
  (select count(*) from private.outbox_prepare_due()),
  1::bigint,
  'depois do prazo, sem confirmacao, a mensagem volta a ser elegivel'
);

select * from finish();
rollback;
