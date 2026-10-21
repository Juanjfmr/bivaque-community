-- Revisao da confirmacao de 2026-10-21 (media) - a reserva do outbox tem dono.
--
-- `private.outbox_prepare_due()` reservava por tempo (`reserved_until`), sem
-- identificar quem reservou. Se a execucao A passasse dos 5 minutos, a execucao
-- B reservava os mesmos itens e enviava; quando A terminava, enviava de novo e
-- ainda podia sobrescrever o resultado de B.
--
-- A reserva passa a gravar `reserved_by` com um token novo por chamada
-- (`gen_random_uuid()`), devolvido junto com os IDs. `private.outbox_dispatch_due()`
-- continua sendo a funcao do cron e continua fazendo um unico `net.http_post`;
-- o corpo ganha o campo `reservation`:
--
--   { "ids": ["..."], "reservation": "<uuid>" }
--
-- A rota confere `reserved_by = reservation` e `reserved_until > now()` antes de
-- cada envio e grava o resultado com o mesmo filtro. Uma execucao atrasada nao
-- envia o item que outra reservou e nao sobrescreve o resultado dela.
--
-- O teto de 5.000 IDs, a ordem deterministica, o `SKIP LOCKED`, o prazo de 5
-- minutos e o fail-closed de preferencia/opt-out permanecem iguais.
--
-- Bloco de transacao explicito: o CLI do Supabase nao envolve a migration numa
-- transacao e a funcao troca de tipo de retorno (DROP + CREATE).

begin;

alter table public.outbox
  add column reserved_by uuid;

comment on column public.outbox.reserved_by is
  'Token da reserva feita por outbox_prepare_due(); nulo quando livre ou ja gravado.';

-- A funcao troca de `setof uuid` para uma tabela (id, reservation); o tipo de
-- retorno nao pode mudar com CREATE OR REPLACE.
drop function private.outbox_prepare_due();

create function private.outbox_prepare_due()
returns table (id uuid, reservation uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation uuid := gen_random_uuid();
begin
  -- Itens vencidos sem permissao de entrega sao terminais: nao entram no lote
  -- HTTP e nao precisam esperar a proxima chamada. A reserva de outro worker
  -- tambem protege esta transicao.
  update public.outbox o
     set status = 'skipped',
         updated_at = now(),
         reserved_until = null,
         reserved_by = null
   where o.status = 'pending'
     and o.attempts < private.outbox_max_attempts()
     and (o.reserved_until is null or o.reserved_until <= now())
     and private.outbox_is_due(o.updated_at, o.attempts)
     and not private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload);

  -- 5.000 e o teto de seguranca da rota (`MAX_TOTAL_BATCH`). A reserva de 5
  -- minutos cobre o envio de um bloco e impede que outro worker pegue a mesma
  -- linha enquanto ela esta em voo; `SKIP LOCKED` evita espera entre workers.
  -- Todas as linhas do lote levam o mesmo token, que o consumidor devolve ao
  -- gravar cada resultado.
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
           reserved_until = now() + interval '5 minutes',
           reserved_by = v_reservation
      from due
     where o.id = due.id
    returning o.id, v_reservation;
end;
$$;

revoke all on function private.outbox_prepare_due() from public;

create or replace function private.outbox_dispatch_due()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_endpoint text;
  v_secret text;
  v_ids jsonb;
  v_reservation uuid;
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'outbox-worker-endpoint';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'outbox-worker-secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return 0;
  end if;

  select coalesce(jsonb_agg(prepared.id), '[]'::jsonb), (array_agg(prepared.reservation))[1]
    into v_ids, v_reservation
  from private.outbox_prepare_due() as prepared;

  if v_ids = '[]'::jsonb then
    return 0;
  end if;

  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/internal/outbox',
    body := jsonb_build_object('ids', v_ids, 'reservation', v_reservation),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-outbox-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );

  return jsonb_array_length(v_ids)::integer;
end;
$$;

revoke all on function private.outbox_dispatch_due() from public;

commit;
