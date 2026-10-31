-- ADR-20260922-conversa-por-pedido (aceito pelo dono em 22/09/2026), parte 1.
--
-- Conversa de pedido de servico ganha contexto proprio: context_type =
-- 'service_request', context_id = id do pedido. O valor entra numa migration
-- so dele, como 'provider', 'listing' e 'event_question': `alter type ... add
-- value` nao pode ser usado na mesma transacao que o cria, e a migration
-- seguinte ja usa o valor no predicado de um indice.

alter type public.dm_context_type add value if not exists 'service_request';
