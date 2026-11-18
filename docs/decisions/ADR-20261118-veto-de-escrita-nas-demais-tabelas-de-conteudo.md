# ADR-20261118-veto-de-escrita-nas-demais-tabelas-de-conteudo

Status: Aceito por delegação — aguarda ratificação

Data: 18/11/2026

## Contexto

O [ADR-20260901-account-suspension](ADR-20260901-account-suspension.md) diz que suspensão bloqueia
toda escrita de conteúdo, com leitura preservada; o pedido de exclusão de conta congela a escrita do
mesmo jeito. O lote AUTHZ-001/002 (PR #280, ADR-20261118-congelamento-de-escrita-e-colunas-de-grupo)
fechou isso em `posts` e `comments`. A auditoria do `security-auditor` sobre aquele lote (achado F1,
cartão AUTHZ-006) encontrou a mesma brecha, preexistente, nas outras tabelas de conteúdo:

- UPDATE/DELETE de `recommendation_requests`, `recommendation_replies`, `listings`,
  `property_details`, `listing_photos` e `events` checam só autoria. Um anunciante suspenso ainda
  muda preço e descrição pelas rotas do app, que usam o cliente da pessoa sob RLS.
- `create_group` e `transition_listing` são SECURITY DEFINER e não olham suspensão nem exclusão
  pedida.

## Decisão

1. Um helper `private.can_write_own_content()` (definer, `search_path` vazio, execute só para
   `authenticated`) responde se o chamador tem sessão, não está suspenso (suspensão vencida não
   conta) e não pediu exclusão de conta.
2. Cada uma das sete tabelas (`recommendation_requests`, `recommendation_replies`, `listings`,
   `property_details`, `listing_photos`, `events`, `groups`) ganha três policies **restritivas**
   `to authenticated` (`<tabela>_veto_conta_insert|update|delete`) com esse helper. O PostgreSQL
   faz AND entre restritivas e o OR das permissivas: nada antes negado passa a ser permitido, as
   policies permissivas atuais ficam intactas (sem reescrever autoria nem escopo) e qualquer
   permissiva futura nessas tabelas herda o veto.
3. `create_group` e `transition_listing` recebem o mesmo veto no corpo (42501), logo depois da
   autenticação. O resto do corpo é idêntico à versão anterior.
4. Migration nova `20261118060000_authz006_veto_escrita_conteudo`; nenhuma migration aplicada é
   editada.

## Consequências

- As rotas do app que editam e apagam pergunta, resposta, anúncio e evento já tratam zero linhas
  como 404 e erro do banco como falha; nenhuma devolve sucesso falso. A mensagem para a conta
  suspensa ainda é a genérica de "não encontrado" ou "sua conta não pode…"; um texto dedicado é
  melhoria, não brecha.
- Service role e funções definer (operação, purga da conta, jobs) não passam pelas restritivas e
  continuam funcionando.
- Resíduo conhecido, fora deste lote: outras RPCs definer que mudam estado de conteúdo do próprio
  membro (`delete_group`, `mark_recommendation_resolved`, `mark_recommendation_reply_resolved`,
  `clear_recommendation_resolved_reply`, `reopen_recommendation`) não olham suspensão. Nenhuma cria
  texto novo nem muda preço; ficam registradas no cartão AUTHZ-006 como próximo passo.

## Prova

`supabase/tests/authz-veto-escrita-conteudo.sql`: catálogo das 21 restritivas; conta ativa edita,
apaga, cria evento, cria grupo e muda situação do anúncio; suspensa lê mas não escreve em nenhuma
tabela nem pelas duas RPCs; exclusão pedida congela igual; cancelar o pedido devolve a escrita; outra
pessoa ativa não é afetada.
