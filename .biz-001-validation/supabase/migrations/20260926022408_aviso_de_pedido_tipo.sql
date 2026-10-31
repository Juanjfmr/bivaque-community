-- Aviso de pedido de indicação (ADR-20260925-aviso-de-pedido) precisa do próprio
-- tipo de notificação.
--
-- Armadilha do Postgres, já documentada em 20260911050941: um valor adicionado a
-- um enum numa transação NÃO pode ser usado na mesma transação. Esta migration
-- só ADICIONA o valor; o job, as entregas e as preferências vivem em
-- 20260926022416_aviso_de_pedido.sql.

alter type public.notification_type add value 'recommendation_request';
