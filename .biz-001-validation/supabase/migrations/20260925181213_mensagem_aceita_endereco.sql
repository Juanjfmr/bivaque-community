-- Mensagem direta sem filtro de conteúdo (decisões do dono, 25/09/2026).
--
-- `dm_message_no_pii` recusava mensagens com CPF (formatado ou 11 dígitos
-- seguidos), "patente", "posto/graduação militar", "OM", "organização
-- militar", "Portal da Transparência" e termos de endereço ("endereço",
-- "Rua X", "CEP 69…", "bairro X"…) — inclusive "qual o endereço do evento?".
--
-- O dono revogou primeiro a parte de endereço ("Se ele quiser divulgar o
-- endereço, a liberdade é dele") e em seguida o resto: "Quero revogar tudo".
-- O que a pessoa escreve para outra na conversa é escolha dela.
--
-- O que NÃO muda: o PRODUTO continua sem guardar CPF, posto, OM ou endereço
-- como dado de perfil ou de verificação (AGENTS.md). Esta migration só deixa
-- de censurar o texto livre que um membro envia a outro. O que alguém digitar
-- aqui fica na mensagem e sai com ela na exclusão de conta.
--
-- O limite de tamanho (dm_messages_content_check, 1 a 2000) continua.
--
-- (O nome do arquivo é da primeira versão desta migration, que só liberava
-- endereço; ela nunca chegou a ambiente compartilhado antes de ser ampliada.)

alter table public.dm_messages
  drop constraint dm_message_no_pii;
