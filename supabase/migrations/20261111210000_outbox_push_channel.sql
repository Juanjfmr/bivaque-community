-- RUN-137 (LAN-PUSH, parte web): o outbox ganha o canal `push`.
--
-- A armadilha do Postgres já registrada em 20260809184316, 20260911050941 e
-- 20261106214256: um valor novo de enum não pode ser usado na mesma transação
-- que o adiciona. Esta migration só ADICIONA o valor; a tabela, a regra de
-- entrega e o adaptador que o usam vivem no arquivo seguinte.

alter type public.outbox_channel add value if not exists 'push';
