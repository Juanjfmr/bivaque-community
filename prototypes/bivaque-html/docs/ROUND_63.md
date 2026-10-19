# Bivaque — Rodada 63: promessas da tela, cumpridas ou retiradas

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-063.task.yml` (R3, com o
[ADR-20260820-alcance-pago](../../../docs/decisions/ADR-20260820-alcance-pago.md)). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: `docs/AUDITORIA_FUNCIONAL_2026-10-18.md`, seção B (itens 8, 9, 10, 11 e 13; o 12 foi feito na R57).
Base: HEAD `8f8b0d31` (Rodada 60). Candidato: build `216f159c…`.

**Veredito: PASS** no protótipo. **Pendente com o dono do produto:** a aprovação comercial dos planos (ver
"Pendência R3" abaixo).

## O que mudou

### "Mostrar meu bairro" (B8) — cumprido (`features/profile/hood-privacy.js`)

A Política de privacidade (R58) promete "Seu bairro só aparece se você permitir". Agora é verdade:

- **Desligado, o bairro some do que a própria pessoa publicou:** cartão e detalhe do anúncio (e "Ver bairro"),
  comparação, cartão de compartilhar, paleta de busca, pontos e lista do mapa, e a busca por texto não acha o
  anúncio pelo bairro escondido; pedido (lista, cabeçalho e faixa do Início); cabeçalho da própria pergunta,
  resposta, publicação e comentário de grupo. Só a cidade aparece.
- **Sem perder o dado:** o campo continua no registro; religar mostra de novo. Conteúdo de outras pessoas não muda.
- **O formulário de publicar continua pedindo bairro** (filtro de imóvel e desapego, matching de pedido); só a
  exibição respeita a preferência.
- **Bairro do perfil (novo, opcional):** Configurações ganhou "Seu bairro (opcional)" (só em cidade com lista de
  bairros). É o bairro que aparece nos cabeçalhos de pergunta, resposta e publicação ("Pergunta de um membro da
  cidade · Parque 10"). Antes não existia onde guardá-lo, e sem ele esses cabeçalhos nunca teriam bairro para
  mostrar nem para esconder. Vale o do perfil no momento da leitura (não é cópia gravada em cada publicação).

### Busca nas respostas (B11) — cumprido (`features/search/views.js`)

"Indicações e respostas" procura também no texto das respostas (as removidas pela moderação e as de pessoas
bloqueadas ficam de fora). Quando o texto da pergunta sozinho não basta e uma resposta bate, a linha mostra o
trecho: `Mônica L.: “…Escola Girassol tem horário integral…”` (cerca de 110 caracteres, com reticências).
Se a própria pergunta já casa com a busca, não há trecho.

### Oferta de negócio de membro no grupo (B9) — cumprido (`features/groups/`)

- Com o grupo permitindo (`allowOffers`) e a pessoa com página **ativa** (publicada, não suspensa, não pausada),
  o publicador oferece **"Oferta do meu negócio"**: texto + link para a página (o cartão mostra o rótulo Oferta e o
  botão da página).
- **Uma por semana por pessoa por grupo.** O prazo vem de `g.offerAt[nome]` (7 dias corridos). A recusa diz quando
  pode de novo ("Você já fez uma oferta neste grupo esta semana. Pode fazer outra em 25/10 às 14:30."). Excluir a
  oferta não zera o prazo.
- **Sem permissão** o tipo não aparece e as ofertas existentes (inclusive as da própria pessoa) ficam ocultas na
  lista e no endereço da publicação ("indisponível"); religar a permissão devolve tudo.

### Planos (B10) — aplicados (`features/businesses/plans.js`)

A tela de planos anuncia três coisas; cada uma passou a valer, só para a página do negócio da pessoa:

| Plano | O que vale agora |
| --- | --- |
| Grátis | até 5 **conversas novas** respondidas por mês na caixa da página. A sexta é recusada com um diálogo que explica, diz quando voltam (dia 1º) e convida a "Conhecer os planos". Conversa já respondida segue livre. O mês novo zera a conta. |
| Destaque de momento | ativar coloca a página no espaço **Patrocinado** por 7 dias (rótulo Patrocinado no cartão e na página, data de fim na página). Depois dos 7 dias volta ao normal e a página oferece "Destacar por 7 dias" de novo. |
| Plano do negócio | conversas sem limite e **4 destaques por mês** (7 dias cada); a página e a tela de planos mostram "Restam 3 de 4 destaques neste mês". Ativar o plano não destaca sozinho: o destaque é um botão. |

- **A ordem das indicações não muda:** o patrocínio só ocupa o espaço Patrocinado (Negócios, Início). Enquanto dura,
  a página sai da lista de indicações, como já acontecia com os patrocinados de exemplo; a ordem dos outros é a
  mesma (a prova compara antes e depois). Quando termina, volta ao lugar que as indicações dão a ela.
- Página pausada ou suspensa não ocupa o espaço Patrocinado. Assumir uma página que era patrocinada de exemplo
  tira o `spon` (patrocínio só vem do plano).
- **Caixa da página e modo teste:** uma conversa nova é a que a página ainda não respondeu. Como o protótipo não tem
  clientes de verdade, "Controles do protótipo" ganhou **Simular contato no meu negócio** (cria um contato novo,
  com aviso). A contagem fica em `state.subscription` (`repliedThreadIds`, `boosts`, `spot`, por mês).
- "Resultados da sua página" mostra, abaixo dos números, **Conversas** (quantas de 5, ou "sem limite") e
  **Destaque** (situação e botão).

### Pendência R3 (comercial) — continua com o dono

Nada aqui cobra: o plano é de teste. **A aprovação comercial dos planos continua pendente com o dono do
produto.** O ADR aprovado de referência (`ADR-20260820-alcance-pago`) decide **assinatura única de R$ 49/mês**,
recusa cobrar por conversa iniciada e fixa a regra "acesso nunca se cobra, amplificação se cobra". Os valores e
limites da tela de planos do protótipo (R$ 9,90 por semana, R$ 39 por mês, limite de 5 conversas novas no grátis,
quatro destaques de 7 dias) **não são os do ADR**: a rodada só faz o protótipo cumprir o que a tela já anunciava, e
o back-end real só pode implementar depois de o dono aprovar (ou trocar) esses números por ADR. O limite de 5
conversas no plano grátis em especial toca "acesso nunca se cobra" e precisa de decisão explícita.

### Bairros e mapa de outras cidades (B13) — retirados (`data/demo`, `features/listings/`)

Só Manaus tem lista de bairros e coordenadas (`HOOD_CITIES` em `hood-privacy.js`). Em Brasília, Rio de Janeiro e
Natal (Imóveis e Desapegos): sem a pílula **Bairro**, sem a seção Bairro em "Todos os filtros" e sem o botão
**Mapa** (Lista/Mapa); Manaus não é oferecida no lugar. Um filtro de bairro que ficou de Manaus não pesa nas
outras cidades. Manaus continua igual.

## Decisões minhas

- **Bairro do perfil opcional** (campo novo nas Configurações), pelo motivo acima. Os cabeçalhos mostram o bairro
  do perfil vivo, não uma cópia.
- **Pedido próprio sem bairro na tela do cliente** quando desligado, embora o dado siga para o casamento com
  prestadores (a decisão pedia "pedido").
- **Pontos do mapa:** anúncios próprios com bairro escondido saem da contagem por bairro do mapa (a lista e o filtro
  de bairro continuam achando o anúncio; o cartão não diz o bairro).
- **Patrocinado de plano sai das indicações enquanto dura**, como os de exemplo, em vez de aparecer nos dois.
- **No Início, o espaço Patrocinado único** vai para a página da própria pessoa enquanto o destaque dura; o de
  exemplo volta depois.
- **`paused`** é o nome que a oferta de grupo e o patrocínio checam para "página pausada" (a R61 define a pausa; se
  usar outro nome, basta ajustar `bizOpen` em `features/groups/editors.js`).
- **Fora do escopo, ficou:** os formulários de publicar anúncio, pedido e indicação de negócio ainda listam os
  bairros de Manaus quando a cidade da pessoa é outra (o escopo pedia retirar o filtro e o mapa).

## Prova

`scripts/bivaque-html/round63-proof.mjs`, 11 checkpoints, um por comportamento, com o lado ligado e o desligado:

| Checkpoint | Cobre |
| --- | --- |
| `own-listing-and-request-show-the-hood-only-while-allowed` | B8: anúncio e pedido (ligado, desligado pela tela, dado mantido, outro anúncio intacto, religado, busca) |
| `own-question-answer-and-group-post-headers-follow-the-preference` | B8: cabeçalhos de pergunta, resposta, publicação e comentário |
| `search-looks-inside-answers-and-shows-the-excerpt` | B11: busca no texto das respostas, trecho, removida e bloqueada |
| `group-offer-type-needs-permission-and-an-active-page` | B9: sem página, com página, suspensa, pausada, permissão desligada e religada |
| `group-offer-is-limited-to-one-per-week-with-the-date-to-try-again` | B9: oferta com link, limite semanal, data, passada a semana, exclusão |
| `free-plan-refuses-the-sixth-new-conversation-and-invites-to-plans` | B10: cinco passam, a sexta é recusada, convite, conversa já respondida, plano libera |
| `new-month-resets-the-free-conversation-count` | B10: mês novo zera |
| `test-panel-simulates-a-new-contact-in-the-page-inbox` | B10: contato de teste |
| `moment-plan-puts-the-page-in-sponsored-for-seven-days-without-reordering` | B10: 7 dias, rótulo, ordem das indicações, pausada, fim, destacar de novo |
| `business-plan-gives-four-boosts-a-month-and-shows-what-is-left` | B10: quatro destaques, saldo, esgotado, mês novo |
| `hood-filter-and-map-exist-only-for-cities-with-hood-data` | B13: Manaus com os dois; Brasília e Natal sem; volta a Manaus |

Baseline (HEAD `8f8b0d31`, 375 claro): 0 de 11 PASS (build `3402aae2…`).

Provas rodadas (lote enxuto: só a nova, três antigas diretamente afetadas e o gate):

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 63 (375 e 1440, claro) | `PASS: 22/22 checkpoints; JS errors 0; external 0` |
| Rodada 01 (planos; o arquivo roda os seis contextos) | `Global 1440 dark: PASS (33 checkpoints)`, com 375, 768 e 1440, claro e escuro, todos PASS |
| Rodada 31 (mapa, 375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 60 (bloquear e Painel, 375 claro) | `PASS: 14/14 checkpoints; JS errors 0; external 0` |
| Testes do build (`test_build.py`, 20 testes) | `OK` |
| Gate completo | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Contrato validado: `node scripts/agents/task-contract.mjs docs/agents/tasks/HTML-063.task.yml` → `ok (R3, retry 3)`.
Por ajuste de método, a bateria completa fica para o fechamento do lote.

