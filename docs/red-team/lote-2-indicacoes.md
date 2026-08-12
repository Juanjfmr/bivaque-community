# Lote 2 — Indicações/Recomendações (RT-43..47)

Varredura feita em 2026-08-10 contra a página completa, o schema/RLS, os testes
de escopo e as superfícies de destino. Este lote não reabre F13: a decisão sobre
manter descoberta, pedidos e salvos na mesma área já está registrada. Aqui são
avaliadas somente as mecânicas de cada subfuncionalidade.

## Estado operacional confirmado

| RT | O que o código faz hoje |
|---|---|
| RT-43 — explorar | Carrega **grupos e eventos**. Grupos: todos os metadados permitidos pela RLS na localidade, sem filtro de `visibility`, mais novos primeiro; exclui qualquer grupo para o qual já exista membership e corta os seis primeiros no cliente. Portanto grupos públicos e privados aparecem, coerente com C5; grupos internos a uma comunidade continuam sujeitos ao contêiner. Eventos: `upcoming`, mais próximos primeiro, limite quatro, sujeitos à RLS de evento. Não há personalização nem paginação. |
| RT-44 — pedir | O cliente grava diretamente em `recommendation_requests`, sempre com `locality_id` do perfil e `group_id: null`. A policy torna o pedido legível por qualquer membro da mesma localidade. Não existe server action associada a recomendações. |
| RT-45 — responder | `recommendation_replies` e suas policies existem, mas nenhuma rota/componente em `apps/web/app` consulta ou insere replies. O autor não recebe notificação nem possui lista de respostas. O diagnóstico do MAP 7b, “sem ciclo de resposta visível”, está confirmado. |
| RT-46/47 — salvar/recuperar | O modelo salva somente `request_id` de `recommendation_requests`, não grupos nem eventos. A aba Salvas busca saves do usuário, recupera os pedidos correspondentes e permite remover; a UI não possui inserção de save nem destino para abrir o pedido. |

Evidência-base: `apps/web/app/(shell)/recommendations/page.tsx:146-239,279-420`;
`supabase/migrations/20260802001100_recommendations.sql:22-242`;
`supabase/migrations/20260805214709_community_scope.sql:329-343,409-443`.

---

## Findings

### F115 · “Explorar” é um recorte fixo de recência, não uma recomendação — RT-43

- **Promessa:** “Indicações” e “Descubra grupos e eventos da sua comunidade” sugerem uma seleção útil para a pessoa.
- **Comportamento:** grupos são ordenados apenas por criação, filtrados por ausência de qualquer membership e cortados nos seis primeiros; eventos são ordenados apenas por data de início e limitados a quatro. Não há preferência, categoria, afinidade, diversidade, paginação ou continuação. Grupos privados aparecem porque a consulta não filtra `visibility`, como C5 exige.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:181-220,429-433,501-618`; `supabase/migrations/20260802001000_groups_moderation.sql:120-128`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** B — decidir se “indicações” precisa de personalização/paginação ou se a copy deve assumir que é somente uma vitrine cronológica curta.

### F116 · Os cards de Explorar não levam ao objeto descoberto — RT-43

- **Promessa:** ao descobrir um grupo ou evento, o usuário consegue inspecionar o item antes de agir.
- **Comportamento:** o card de grupo não tem link para `/groups/[id]` e oferece apenas entrar/solicitar; isso é especialmente ruim para grupo privado. Todo card de evento aponta para a lista genérica `/events`, embora exista detalhe em `/events/[id]`.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:519-565,588-615`; `apps/web/app/(shell)/groups/[id]/page.tsx:152-188`; `apps/web/app/(shell)/events/[id]/page.tsx:78-100,138-195`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — os destinos específicos já existem; cards descobríveis devem apontar para eles.

### F117 · “Não um marketplace” depende de denylist contornável e não tem moderação própria — RT-44/45

- **Promessa:** a área não permite conteúdo comercial, anúncios ou promoções.
- **Comportamento:** requests e replies aceitam texto livre e bloqueiam apenas palavras de uma expressão regular. Variações, handles sociais e ofertas sem os termos listados passam. Além disso, `report_target_type` não inclui request/reply de recomendação, então conteúdo comercial ou abusivo que passe não pode ser denunciado por essa infraestrutura.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:678-693`; `supabase/migrations/20260802001100_recommendations.sql:36-41,55-63`; `supabase/migrations/20260802001600_reports.sql:1-16,52-56`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — o dono precisa escolher entre moderação/reporting, outra política de publicação ou uma promessa menos absoluta; a denylist sozinha não prova o contrato.

### F118 · Publicar pedido é um fluxo write-only na superfície — RT-44

- **Promessa:** “Publicar pedido” cria uma pergunta comunitária que outros membros podem encontrar e atender.
- **Comportamento:** após o insert, a tela apenas limpa o formulário e mostra “Pedido publicado!”. A página não lista pedidos da localidade nem os pedidos do próprio autor; a única leitura de requests recebe IDs previamente vindos de saves. Assim, o banco compartilha o pedido, mas o produto não oferece descoberta do pedido.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:315-333,344-392,623-705`; `supabase/tests/recommendations-scope.sql:93-120`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — se o pedido é publicável, precisa de uma superfície visível de leitura; capacidade apenas no banco não fecha o happy path.

### F119 · O autor não consegue revisar, editar ou retirar o próprio pedido — RT-44

- **Promessa:** quem publica informação em seu nome mantém controle básico sobre ela.
- **Comportamento:** a RLS permite ao autor atualizar e excluir o request, mas não existe UI para localizar, editar ou excluir o próprio pedido. Para texto sensível, o usuário comum não tem como interromper a exposição que iniciou.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:315-333,623-705`; `supabase/migrations/20260802001100_recommendations.sql:157-170`; `supabase/tests/recommendations-scope.sql:172-218`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** A — expor os controles que a autorização já prevê é correção inequívoca de privacidade e sad path.

### F120 · Pedido de saúde pode revelar condição para toda Manaus sob copy ambígua — RT-44

- **Promessa:** “Sua indicação será visível apenas para membros da sua localidade ou grupo” comunica um escopo protegido, mas não informa qual dos dois será usado neste envio.
- **Comportamento:** “Saúde & Bem-estar” é categoria explícita e o campo incentiva explicar o que se procura. O formulário sempre envia `group_id: null`; a policy permite leitura a qualquer membro da localidade, inclusive perfil com visibilidade `hidden`. **Inferência:** perguntas como “procuro fisioterapeuta após cirurgia” podem revelar condição de saúde associada ao `author_id` para toda a localidade, não para um grupo escolhido.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:47-55,315-322,678-693`; `supabase/migrations/20260802001100_recommendations.sql:22-29,128-142`; `supabase/tests/recommendations-scope.sql:221-235`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** B — cabe ao dono decidir se categorias sensíveis aceitam escopo de localidade, se exigem grupo/aviso reforçado ou se não pertencem a este fluxo.

### F121 · O escopo de grupo aceito pelo banco não autoriza nem entrega o grupo — RT-44/45/46

- **Promessa:** a migration define requests/replies “inside a locality or a group” e diz que pedidos de grupo não vazam; a copy também menciona localidade ou grupo.
- **Comportamento:** `group_id` não possui foreign key; o INSERT aceita qualquer `group_id` não nulo sem testar existência ou membership. Depois, SELECT de request, SELECT/INSERT de reply e INSERT de save só reconhecem pai com `locality_id` não nulo. Um autenticado pode criar request com UUID arbitrário, mas membros do grupo não conseguem vê-lo, responder ou salvar; na prática, só o autor o enxerga pela exceção `author_id`.
- **Evidência:** `supabase/migrations/20260802001100_recommendations.sql:1-5,22-35,128-155,172-208,219-235`; `supabase/tests/recommendations-scope-denials.sql:163-216` (testa apenas XOR/ausência de escopo, não membership de grupo).
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** A — é falha inequívoca de autorização/integridade no contrato existente; policy e vínculo de grupo precisam convergir antes de expor esse escopo.

### F122 · O ciclo de resposta existe só no schema — RT-45

- **Promessa:** um pedido de indicação admite respostas comunitárias; o schema possui `recommendation_replies` e autoriza membros que veem o request a responder.
- **Comportamento:** não existe lista de pedidos, detalhe de pedido, formulário de resposta ou renderização de replies. Todas as interações frontend com tabelas de recomendação estão restritas a inserir request e carregar/remover saves. O diagnóstico do MAP 7b está confirmado, não refutado.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:279-420,623-775`; `supabase/migrations/20260802001100_recommendations.sql:53-70,172-208`; `supabase/tests/recommendations-scope.sql:25-31,105-120`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — a superfície promete um pedido útil e o backend de replies já é parte do contrato; sem resposta visível, o valor central não acontece.

### F123 · Mesmo uma resposta criada fora da UI não chega ao autor — RT-45

- **Promessa:** quando outro membro responde ao pedido, o autor consegue saber e retornar ao contexto.
- **Comportamento:** o enum e os triggers de notifications não incluem reply de recomendação, e a página não consulta respostas. O vínculo `recommendation_thread` chega a habilitar DM no backend após uma reply, mas não substitui inbox/lista/notificação do pedido. Uma resposta inserida pela Data API fica silenciosa para o autor.
- **Evidência:** `supabase/migrations/20260802001400_personal_notifications.sql:1-18,70-100,102-232`; `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:101-159`; `apps/web/app/(shell)/recommendations/page.tsx:344-420`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** B — decidir se o retorno será por notificação, caixa do próprio pedido ou ambos envolve custo e modelo de comunicação; o estado silencioso atual deve ser deliberado ou corrigido.

### F124 · “Salvas” recupera bookmarks que a própria UI não consegue criar nem abrir — RT-46/47

- **Promessa:** outros membros publicam pedidos que podem ser salvos “para consultar depois”.
- **Comportamento:** `recommendation_saves` salva exclusivamente requests, não os grupos/eventos mostrados em Explorar. A página não faz INSERT nessa tabela e não renderiza botão Salvar em lugar algum. Se uma linha for criada externamente, a aba recupera corretamente o request e permite removê-lo, mas o card é estático, sem link para detalhe/respostas, e ordena por `request.created_at`, não por `saved_at`.
- **Evidência:** `apps/web/app/(shell)/recommendations/page.tsx:344-413,707-775`; `supabase/migrations/20260802001100_recommendations.sql:72-82,210-242`; `supabase/tests/recommendations-scope.sql:123-169`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — adicionar a affordance de salvar no objeto realmente salvável e um destino consultável é a correção mínima da tab já existente.

---

## Cobertura das dimensões com falha

| Dimensão | Findings |
|---|---|
| Modelo mental | F115, F118, F120, F124 |
| Coerência | F117, F121, F123, F124 |
| Happy path | F116, F118, F122, F124 |
| Sad paths | F119 |
| Permissões | F121 |
| Privacidade | F119, F120 |
| Abuso | F117, F121 |
| Operação | F117, F123 |
| Valor | F115, F118, F122, F123, F124 |

A dimensão **Necessidade** não é reavaliada aqui porque sua tensão arquitetural
já está registrada em F13, conforme a restrição deste lote.

## Placar

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F116, F118, F119, F121, F122, F124 (6) | Corrigir destinos, superfícies e autorização sem decidir a arquitetura do domínio. |
| B — decisão do dono | F115, F117, F120, F123 (4) | Decidir seleção, moderação, privacidade de escopo e mecanismo de retorno. |
