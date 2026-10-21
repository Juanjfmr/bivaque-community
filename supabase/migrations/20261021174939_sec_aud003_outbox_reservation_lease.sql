-- SEC-AUD-003 / M3 da revisao final (2026-10-21) - a reserva do outbox
-- precisa durar mais que o pior caso de um bloco de entrega.
--
-- `private.outbox_prepare_due()` adiantava `updated_at` para `now()`. Com
-- `attempts = 0`, a linha voltava a vencer em 60 segundos. Se o envio de um
-- bloco de 100 mensagens demorasse mais que isso, outro disparo reservava as
-- linhas que continuavam `pending` e as reenviava, mesmo as que ja tinham sido
-- entregues e ainda nao tinham sido persistidas.
--
-- A reserva ganha uma coluna propria, `reserved_until`. `updated_at` continua
-- sendo a ultima escrita e alimenta o backoff; a rota do consumidor tambem faz
-- `isOutboxDue` com `baseRetryMs = 0`, entao ele continua enxergando a linha
-- reservada como vencida e entrega normalmente. O que muda e a selecao de
-- outro despachante: enquanto `reserved_until > now()`, a linha nao e
-- reservada de novo. Depois de 5 minutos, sem confirmacao (worker morto ou
-- resposta perdida), ela volta a ser elegivel. O consumidor limpa a reserva ao
-- gravar a mutacao (sent, failed, pending ou skipped).
--
-- O teto de 5.000 IDs, a ordem deterministica, o `SKIP LOCKED` e o
-- fail-closed de preferencia/opt-out permanecem iguais.

alter table public.outbox
  add column reserved_until timestamptz;

comment on column public.outbox.reserved_until is
  'Prazo da reserva feita por outbox_prepare_due(); nulo quando livre.';

create or replace function private.outbox_prepare_due()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Itens vencidos sem permissao de entrega sao terminais: nao entram no lote
  -- HTTP e nao precisam esperar a proxima chamada. A reserva de outro worker
  -- tambem protege esta transicao.
  update public.outbox o
     set status = 'skipped',
         updated_at = now(),
         reserved_until = null
   where o.status = 'pending'
     and o.attempts < private.outbox_max_attempts()
     and (o.reserved_until is null or o.reserved_until <= now())
     and private.outbox_is_due(o.updated_at, o.attempts)
     and not private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload);

  -- 5.000 e o teto de seguranca da rota (`MAX_TOTAL_BATCH`). A reserva de 5
  -- minutos cobre o envio de um bloco e impede que outro worker pegue a mesma
  -- linha enquanto ela esta em voo; `SKIP LOCKED` evita espera entre workers.
  return query
    with due as (
      select o.id
        from public.outbox o
       where o.status = 'pending'
         and o.attempts < private.outbox_max_attempts()
         and (o.reserved_until is null or o.reserved_until <= now())
         and private.outbox_is_due(o.updated_at, o.attempts)
         and private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload)
       order by o.updated_at asc, o.id asc
       for update skip locked
       limit 5000
    )
    update public.outbox o
       set updated_at = now(),
           reserved_until = now() + interval '5 minutes'
      from due
     where o.id = due.id
    returning o.id;
end;
$$;

revoke all on function private.outbox_prepare_due() from public;
