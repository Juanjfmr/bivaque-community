-- F09 (RUN-022): o canal `push` entra na matriz de preferências.
--
-- Decisão do dono em 04/11/2026 (docs/LANCAMENTO.md, Mudanças de escopo): push
-- no celular entra no lançamento. A entrega de verdade é do LAN-PUSH, que ainda
-- depende do ADR do token do aparelho e das chaves da loja; aqui só nasce a
-- preferência, para a pessoa escolher antes de o envio existir.
--
-- A armadilha do Postgres já registrada em 20260809184316 e 20260911050941: um
-- valor adicionado a um enum numa transação não pode ser usado na mesma
-- transação. Esta migration só ADICIONA o valor; quem escreve a linha `push`
-- (a rota do app e, depois, o LAN-PUSH) roda em outra transação.
--
-- Nenhuma linha é semeada: sem linha na matriz, o app mostra o canal desligado
-- (preferencias-do-app.ts). Nada muda na entrega — `private.notification_channel_allows`
-- continua recebendo só `in_app` e `email` dos produtores atuais.

alter type public.notification_channel add value if not exists 'push';
