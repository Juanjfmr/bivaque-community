-- RECON-029 (R34 / ADR-20260909 D3): a pergunta ao organizador é uma conversa
-- contextual vinculada ao evento.
--
-- O valor novo do enum entra sozinho neste arquivo porque, dentro da transação
-- única do CLI, referenciar um valor de enum recém-adicionado em função
-- `language sql` dispara 55P04 (unsafe use of new value) — a mesma armadilha já
-- documentada em 20260825205847_dm_provider_context.sql. O `commit;` separa a
-- transação do ALTER TYPE da transação que usa o valor.

alter type public.dm_context_type add value if not exists 'event_question';

commit;
