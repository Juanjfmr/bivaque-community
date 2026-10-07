-- FIGMA-002 — contexto de conversa para interesse em anúncio
-- (ADR-20260909-pedidos-e-conversa-contextual D2: o par (tipo, id) é único e
-- os participantes são derivados do contexto pelo servidor).
--
-- O alter type mora SOZINHO neste arquivo, mesmo precedente de
-- 20260825205847_dm_provider_context.sql: dentro da transação única do CLI,
-- referenciar o valor recém-adicionado em função language sql dispara 55P04
-- (unsafe use of new value). As políticas, RPCs e triggers que usam 'listing'
-- vêm na migration seguinte, em transação separada.

alter type public.dm_context_type add value if not exists 'listing';
