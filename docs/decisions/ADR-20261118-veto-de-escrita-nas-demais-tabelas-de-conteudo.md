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
- As RPCs SECURITY DEFINER que criam ou mudam conteúdo a pedido do membro (`create_group`,
  `create_group_in_community`, `transition_listing`, `set_group_rules`, `pin_group_post`, `unpin_group_post`,
  `transfer_group_ownership`, `delete_group`, `complete_event` e as quatro de resolução de pergunta)
  não olham suspensão nem exclusão pedida.

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
3. As treze RPCs definer listadas acima recebem o mesmo veto no corpo (42501): `transition_listing`
   logo depois da autenticação, as outras na primeira linha. O resto de cada corpo é idêntico à
   versão anterior. Nenhuma delas é chamada por job nem por outra função, só pela sessão do membro.
   As restritivas usam `(select private.can_write_own_content())`, avaliado uma vez por comando.
4. Migration nova `20261118060000_authz006_veto_escrita_conteudo`; nenhuma migration aplicada é
   editada.

## Consequências

- As rotas do app que editam e apagam pergunta, resposta, anúncio e evento tratam a recusa como
  falha (404, 403 ou 503, conforme a rota); nenhuma devolve sucesso falso. A mensagem para a conta
  suspensa ainda é genérica; um texto dedicado é melhoria, não brecha.
- Service role e funções definer (operação, purga da conta, jobs) não passam pelas restritivas e
  continuam funcionando.
- `events` e `groups` não têm GRANT DELETE para `authenticated`; as restritivas de DELETE dessas
  duas tabelas valem como proteção para um grant futuro.
- Resíduo conhecido, fora deste lote: a tela antiga da web de indicação
  (`apps/web/app/components/indications/indication-detail.tsx`) olha só o erro e trata zero linhas
  como sucesso, então a conta suspensa vê o diálogo fechar como se tivesse editado. Nada é gravado;
  a tela sai na troca da fase 6. As rotas do app que usam `.single()` respondem 503 em vez de "sua
  conta não pode…" quando a linha some pela RLS: mensagem errada, sem sucesso falso. Desafixar pela
  rota de ações do grupo devolve 200 com o estado real (ainda fixado), sem gravar nada.
- Resíduo fora das sete tabelas, para um cartão próprio: a página de negócio
  (`create_member_business_page`, `update_member_business_page` e as policies de
  `provider_profiles`, `provider_catalog_items` e `provider_portfolio_photos`) não olha suspensão, e
  `create_service_request` só veta exclusão pedida. Os buckets de foto de anúncio e de evento não
  olham suspensão; o objeto enviado fica órfão, porque a linha no banco é vetada.

## Prova

`supabase/tests/authz-veto-escrita-conteudo.sql` (43 asserções): catálogo das 21 restritivas; conta
ativa edita, apaga, edita imóvel, cria evento, cria grupo e muda situação do anúncio; suspensa lê mas
não escreve em nenhuma das sete tabelas (inclusive foto nova e detalhes do imóvel) nem por
`create_group`, `transition_listing`, `set_group_rules`, `delete_group` e
`mark_recommendation_resolved`; suspensão vencida devolve a escrita; exclusão pedida congela igual,
inclusive responder pergunta; cancelar o pedido devolve a escrita; outra pessoa ativa não é afetada.
