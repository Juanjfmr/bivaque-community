-- O aviso de "seu chamado foi respondido" precisa de tipo próprio.
--
-- Armadilha do Postgres, já batida neste repositório (20260809184316:18,
-- 20260820052738): um valor adicionado a um enum NÃO pode ser usado na mesma
-- transação. Esta migration só acrescenta o valor; a função que o usa está em
-- 20261022130521_support_ticket_functions.sql.

alter type public.notification_type add value if not exists 'support_answered';
