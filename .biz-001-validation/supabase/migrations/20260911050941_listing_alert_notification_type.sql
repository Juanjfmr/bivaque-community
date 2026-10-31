-- RECON-028 — o aviso de imóvel novo precisa do próprio tipo de notificação.
--
-- Armadilha do Postgres, já documentada em 20260809184316 e 20260821000010: um
-- valor adicionado a um enum numa transação NÃO pode ser usado na mesma
-- transação. Esta migration só ADICIONA o valor; a tabela de entrega, o job e o
-- gatilho que o usam vivem em 20260911051005_listing_alert_deliveries.sql.

alter type public.notification_type add value 'listing_alert';
