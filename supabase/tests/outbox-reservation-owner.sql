-- Revisao da confirmacao de 2026-10-21 (media) - a reserva do outbox tem dono.
--
-- `private.outbox_prepare_due()` reservava por tempo, sem identificar quem
-- reservou. Se a execucao A passasse dos 5 minutos, a execucao B reservava os
-- mesmos itens e enviava; quando A terminava, enviava de novo e ainda podia
-- sobrescrever o resultado de B.
--
-- A reserva passa a gravar `reserved_by` com um token novo por chamada. O
-- consumidor so envia o item enquanto `reserved_by` for o token dele e a
-- reserva nao tiver vencido; ao gravar o resultado, filtra pelo token. Uma
-- gravacao atrasada com o token antigo nao altera a linha.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc

reset role;

select has_column(
  'public',
  'outbox',
  'reserved_by',
  'outbox tem a coluna que identifica o dono da reserva'
);

insert into public.outbox (id, recipient, channel, type, payload, updated_at)
values (
  '50000000-0000-4000-8000-0000000000b1',
  'member-one@example.invalid',
  'email',
  'comment',
  '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb,
  now() - interval '10 minutes'
);

create temporary table first_reservation as
select id, reservation from private.outbox_prepare_due();

select is(
  (select count(*) from first_reservation),
  1::bigint,
  'a linha vencida e reservada'
);

select ok(
  (select reservation is not null from first_reservation),
  'a reserva entrega um token de dono'
);

select is(
  (
    select reserved_by
      from public.outbox
     where id = '50000000-0000-4000-8000-0000000000b1'
  ),
  (select reservation from first_reservation),
  'a linha guarda o token devolvido pela reserva'
);

-- A reserva venceu e a janela de nova tentativa (60s * 2^attempts) tambem.
update public.outbox
   set reserved_until = now() - interval '1 second',
       updated_at = now() - interval '10 minutes'
 where id = '50000000-0000-4000-8000-0000000000b1';

create temporary table second_reservation as
select id, reservation from private.outbox_prepare_due();

select is(
  (select count(*) from second_reservation),
  1::bigint,
  'a segunda reserva leva a linha cuja reserva venceu'
);

select isnt(
  (select reservation from second_reservation),
  (select reservation from first_reservation),
  'a segunda reserva troca o dono'
);

select is(
  (
    select reserved_by
      from public.outbox
     where id = '50000000-0000-4000-8000-0000000000b1'
  ),
  (select reservation from second_reservation),
  'a linha passa a pertencer a segunda reserva'
);

-- Gravacao atrasada da primeira execucao, com o token antigo.
update public.outbox
   set status = 'sent',
       reserved_until = null
 where id = '50000000-0000-4000-8000-0000000000b1'
   and reserved_by = (select reservation from first_reservation);

select is(
  (
    select status::text
      from public.outbox
     where id = '50000000-0000-4000-8000-0000000000b1'
  ),
  'pending',
  'gravacao com o token antigo nao altera o item'
);

select is(
  (
    select reserved_by
      from public.outbox
     where id = '50000000-0000-4000-8000-0000000000b1'
  ),
  (select reservation from second_reservation),
  'gravacao com o token antigo nao apaga a reserva nova'
);

select * from finish();
rollback;
