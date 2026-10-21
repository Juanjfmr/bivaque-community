-- SEC-AUD-002 (MEDIUM, 2026-10-19) — a reserva SQL do outbox precisa caber no
-- teto do consumidor HTTP.
--
-- `private.outbox_prepare_due()` reservava TODOS os vencidos e
-- `private.outbox_dispatch_due()` mandava todos num único POST. A rota aceita no
-- máximo 5.000 IDs; uma fila de 5.001+ ficava pendente para sempre, porque o SQL
-- avançava `updated_at` de todos antes de o HTTP responder 400.
--
-- A reserva passa a limitar 5.000 IDs por chamada, na ordem determinística de
-- vencimento (`updated_at`, `id`). Os itens nono lote NÃO têm `updated_at`
-- alterado: continuam vencidos e elegíveis na chamada seguinte. `SKIP LOCKED`
-- evita que dois workers concorrentes reservem o mesmo ID ou fiquem esperando um
-- ao outro. O consumidor continua com o teto de 5.000 e os blocos de 100.
--
-- Não altera autenticação, fail-closed de preferência/opt-out nem a migration
-- aplicada. A função mantém a mesma assinatura (setof uuid), então os tipos
-- públicos não mudam.

create or replace function private.outbox_prepare_due()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Itens vencidos sem permissão de entrega são terminais: não entram no lote
  -- HTTP e não precisam esperar a próxima chamada.
  update public.outbox o
     set status = 'skipped',
         updated_at = now()
   where o.status = 'pending'
     and o.attempts < private.outbox_max_attempts()
     and private.outbox_is_due(o.updated_at, o.attempts)
     and not private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload);

  -- 5.000 é o teto de segurança da rota (`MAX_TOTAL_BATCH`). Reservar mais que
  -- isso produzia um POST recusado antes de qualquer processamento.
  return query
    with due as (
      select o.id
        from public.outbox o
       where o.status = 'pending'
         and o.attempts < private.outbox_max_attempts()
         and private.outbox_is_due(o.updated_at, o.attempts)
         and private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload)
       order by o.updated_at asc, o.id asc
       for update skip locked
       limit 5000
    )
    update public.outbox o
       set updated_at = now()
      from due
     where o.id = due.id
    returning o.id;
end;
$$;

revoke all on function private.outbox_prepare_due() from public;
