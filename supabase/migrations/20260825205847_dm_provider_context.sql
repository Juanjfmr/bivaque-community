-- Onda G — Task 6: três defeitos da DM antes do contexto novo (D36, §8).
--
-- 1. Criação por ordem de UUID: o check `participant_a < participant_b` garante
--    uma conversa por par, mas quem ordenava era o cliente — metade dos pares
--    batia na constraint. A ordenação passa a ser do servidor, dentro do RPC
--    `open_conversation`, único caminho de criação.
-- 2. Bloqueio contornável pelo bloqueador: quem bloqueava continuava escrevendo.
--    Bloqueio que não protege é pior que nenhum; passa a valer nos dois sentidos.
-- 3. Contexto declarado não validado: `context_type`/`context_id` entravam como
--    o cliente mandasse. Agora cada ramo confere aquele contexto específico.

alter type public.dm_context_type add value if not exists 'provider';

commit;
