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

## Emenda de 18/11, AUTHZ-007

O resíduo "página de negócio e pedido de serviço" (achado M2 do `security-auditor` sobre `f6eca95`)
vira regra neste lote, com o mesmo predicado e o mesmo erro:

1. `provider_profiles`, `provider_catalog_items` e `provider_portfolio_photos` ganham as três
   restritivas `<tabela>_veto_conta_insert|update|delete` com `private.can_write_own_content()`;
   as permissivas de autoria e escopo ficam intactas e toda permissiva futura herda o veto.
2. `create_member_business_page`, `update_member_business_page` e `create_service_request`
   recebem o veto no corpo, logo depois da autenticação (42501, `account cannot write content`).
   Em `create_service_request` o veto substitui o `account_deletion_requested(v_me)` antigo, que
   cobria só metade do estado e nunca mais era alcançado; o do prestador permanece, porque o
   prestador não é o chamador.
3. Os buckets de foto de anúncio (`listing-photos`) e de evento (`event-photos`) não recebem policy:
   desde o SEC-006 nenhum cliente tem INSERT em `storage.objects` e a prova do SEC-006 veta recriar.
   O upload é da Server Action com `service_role`, que ignora RLS — então o veto é um TRIGGER
   `before insert` em `storage.objects` que deriva a conta responsável do caminho (em
   `listing-photos` a pasta é o id do anúncio e a conta é o dono; em `event-photos` a pasta é o id
   de quem organiza, a convenção da capa) e recusa com o mesmo 42501. Caminho sem pasta uuid não
   identifica conta e passa: o que o expõe é a linha da tabela, que já tem o veto do AUTHZ-006.
   A recusa da foto de anúncio chega à pessoa como falha (503 da action), sem sucesso falso.
4. Migration `20261118174716_authz_007_veto_prestador`; nenhuma migration aplicada é editada.

Resíduo conhecido: criar trigger em `storage.objects` exige privilégio do dono do storage; o banco
local do CI (superusuário) aplica sem problema, e se o push de produção reclamar, conceder o
privilégio é ato do dono.

Prova: `supabase/tests/authz-007-veto-prestador.sql` (38 asserções): catálogo das 9 restritivas e do
trigger; conta ativa cria, edita e apaga página pela RPC e diretamente, cria, edita e apaga item de
catálogo e foto de portfólio, sobe foto nos dois buckets e pede serviço; suspensa lê a própria página
mas não escreve nada disso, nem por RPC nem pelo upload de serviço; suspensão vencida devolve;
exclusão pedida congela igual e cancelar o pedido devolve; outra pessoa ativa não é afetada.
