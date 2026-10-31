-- RECON-025 — contexto de conversa do anúncio.
--
-- O interesse em um anúncio reusa `open_conversation`, que já é idempotente por
-- (participant_a, participant_b). O valor novo do enum entra sozinho neste
-- arquivo porque, dentro da transação única do CLI, referenciar um valor
-- recém-adicionado em função `language sql` dispara 55P04 (unsafe use of new
-- value) — a mesma armadilha documentada para o contexto `provider`
-- (migration 20260825205847).

alter type public.dm_context_type add value if not exists 'listing';

commit;
