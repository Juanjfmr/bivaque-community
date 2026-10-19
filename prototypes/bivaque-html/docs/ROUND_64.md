# Bivaque — Rodada 64: correções da revisão do Lote Funcional (visibilidade, grupo encerrado, ofertas, acessibilidade e pequenos)

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-064.task.yml` (R2). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: revisão do Lote Funcional sobre a base `29fb032d` (R57 a R63), seção R64 de `correcoes.md` (revisão de
código, Codex e OpenCode). A R65 (pedidos, propostas, planos, página de negócio e apagar a conta) corre em paralelo
em outra worktree e não é tocada aqui.
Base: HEAD `29fb032d`, build `045ff351…`. Candidato: build `0e3b83d0…`.

**Veredito: PASS** no protótipo.

## O que mudou

### 1. Visibilidade centralizada (`app/state.js`)

Um predicado por tipo reúne moderação (`hidden`, `status==='removed'`, `suspended`), ocultar pessoal
(`hiddenByMe`), bloqueio (`isBlocked`) e página pausada:

| Predicado | Regra |
| --- | --- |
| `askVisible(q)` | não removida pela moderação, não oculta por mim, e minha ou de quem não bloqueei |
| `itemVisible(x)` | não removido e meu ou de vendedor não bloqueado |
| `bizLive(b)` / `bizVisible(b)` | página aberta (a de exemplo não tem `live`): não suspensa nem pausada; a minha sempre abre |
| `bizSays(b)` | relatos da página sem os de pessoas bloqueadas (o relato próprio fica) |
| `noticeVisible(n)` / `noticeList()` | aviso cujo registro (anúncio, pergunta, negócio, conversa) ficou invisível não é listado nem contado |
| `groupReadable(g)` | grupo encerrado só é lido dentro dos 30 dias |
| `accountKey()` | e-mail da conta (ou `local-member`), identificador estável |

Onde passaram a valer:

- **Continue de onde parou / Retomar** (Início do celular e do desktop, e o toque em Retomar): não mostra registro
  invisível. Bloquear a pessoa (`setBlocked`) e ocultar a pergunta limpam `lastViewed`.
- **Depoimentos e avatares** da página de negócio (e do cartão do Início): sem autores bloqueados.
- **"Ver interessados" / contatos recebidos**, **contador de conversas da navegação**, **métricas** do anúncio e da
  página: não contam nem mostram o texto de conversas com bloqueados.
- **Avisos:** lista da central, destino ao abrir, sino e faixa do Início desktop só consideram avisos visíveis;
  "Sua pergunta recebeu N respostas" usa `askAnswers(q).length` (sem bloqueadas nem removidas).
- **Alertas de busca:** a contagem ignora anúncios de bloqueados; a simulação de anúncio novo recusa quando quem
  "publicaria" (Paula V.) está bloqueada.
- **Ocultados:** não mostra título de pergunta de bloqueado.
- **Simular resposta:** a resposta doadora vem só de resposta visível (nem `hidden`, nem `hiddenByMe`, nem de
  bloqueada).
- **"Bloquear X"** não aparece quando X já está bloqueado (pergunta e anúncio, inclusive em "Ver mesmo assim").
- **"Suas perguntas"** em Você usa o mesmo critério da lista de Minhas perguntas (`mineQuestionList`).

### 2. Grupo encerrado (`features/groups/`, `home/`, `search/`, `shell/command-palette.js`)

- `groupReadable(g)`: encerrado e dentro dos 30 dias, leitura; depois do prazo, nada. Aplicado em `groupPosts`, na
  publicação (`renderPost`, "Conteúdo indisponível"), na prévia (`gLast` vira "Grupo encerrado"), em "Nos seus grupos"
  e em "Próximo encontro" do Início (grupo encerrado nunca é o próximo encontro).
- Busca global e paleta excluem grupo encerrado, como "Descobrir grupos".
- Encerrar zera também `g.requests`. `approve-req` e `deny-req` recusam em grupo encerrado e o Gerenciar esconde a
  seção "Pedidos de entrada".

### 3. Prévia do grupo
`gLast` ignora publicação `hidden` (removida pela moderação).

### 4. Ofertas de grupo
- `groupPosts` e `renderPost` descartam `offer` cuja página não está aberta (pausada, suspensa ou excluída).
- A prévia do grupo e "Nos seus grupos" prefixam "Oferta · ".
- A cota semanal usa `accountKey()` (e-mail da conta), não o nome: trocar de nome não zera a semana. O pedido de
  entrada em grupo fechado também passou a levar `uid` (o mesmo identificador) e o `cancel-join` remove por ele.

### 5. Publicação apagada pelo autor
Abre "Esta publicação foi excluída." com o atalho Ver grupos, em vez de "Conteúdo indisponível nesta cidade".

### 6. Acessibilidade dos menus ⋮
`openCreate(anchor, choices, contextMenu, label)` recebe o nome acessível do menu: "Ações da pergunta", "da
resposta", "da publicação", "do comentário", "da conversa", "da página", "do grupo", "do encontro", "da enquete"
(o padrão "Criar publicação" ficou só para o botão Criar). O gatilho declara `aria-haspopup="menu"` desde a
renderização (`iconBtn` para ações terminadas em `-menu`, e o botão "Participando").

### 7. "Ocultar" sem gesto
A pergunta de outra pessoa ganhou o ⋮ no cabeçalho (`question-other-menu`) com **Ocultar pergunta**, Denunciar
pergunta e Bloquear X (o gesto de deslizar continua). Pergunta já oculta não oferece Ocultar de novo.

### 8. Pequenos
- `removePost` desconta `recN` dos negócios marcados nos comentários apagados junto, como `delete-comment`.
- Editar publicação de grupo com `alsoCity` atualiza a pergunta de Indicações correspondente e o aviso diz
  "Pergunta atualizada, também em Indicações."
- Links das Configurações para Ocultados, Pessoas bloqueadas, Política, Código, Ajuda e Apagar a conta perguntam
  "Descartar alterações?" quando há edição não salva (novo `leaveDialog`); só navegam depois de descartar. Para isso as
  Configurações passaram a rastrear edição (diálogo `editor`; o `md-switch` também conta).
- Rascunho da entrada (`ENTRY_DRAFT_FIELDS`): a senha não é guardada; ao voltar da leitura de um documento o campo
  de senha vem vazio.
- Formulários de anúncio, imóvel, pedido e indicação: em cidade sem lista de bairros (`cityHasHoods()` da R63) o
  campo vira texto livre e opcional ("Bairro (opcional)"), sem os bairros de Manaus. Pedido sem bairro guarda o nome
  da cidade; o casamento com prestadores não exige bairro nessas cidades.

## Decisões minhas

- **Aviso some da central** (e do sino) quando o registro dele fica invisível, em vez de ficar listado com "conteúdo
  indisponível". Aviso sem registro (já apagado) segue como antes.
- **Página pausada ou suspensa** conta como invisível no Retomar e nos avisos de negócio, mas a minha própria
  página continua abrindo (é o que o dono precisa ver para reativar).
- **Bloqueio não se aplica a páginas de negócio** (a página não é uma pessoa); só os relatos de pessoas bloqueadas saem.
- **Grupo encerrado dentro do prazo** continua com publicações visíveis e prévia; só o "Próximo encontro" do Início o
  ignora (ninguém confirma presença em grupo encerrado).
- **Cota de oferta pela conta:** a chave passou de `profile.name` para `profile.email` (ou `local-member`). Dados
  gravados antes da R64 com a chave antiga perdem o prazo restante (dados de teste).
- **Settings como diálogo `editor`** para reaproveitar o "Descartar alterações?" do fechamento normal, em vez de
  inventar outra pergunta. Escolher "Continuar" mantém tudo como estava.
- **`bizLive` novo** em vez de mexer em `bizOpen` (`groups/editors.js`, que exige `live` e serve à página da própria
  pessoa): as páginas de exemplo não têm `live`, e a R65 também mexe nesse assunto.
- **Pedido fora de Manaus sem bairro** guarda o nome da cidade como "bairro" para os textos não ficarem vazios.

## Prova

`scripts/bivaque-html/round64-proof.mjs`, 22 checkpoints, um por item corrigido:

| Checkpoint | Cobre |
| --- | --- |
| `resume-drops-blocked-and-hidden-records` | 1: Retomar sem registro bloqueado/oculto; limpa ao bloquear e ao ocultar |
| `business-testimonials-skip-blocked-authors` | 1: relatos e avatares da página |
| `leads-badge-and-metrics-skip-blocked-conversations` | 1: interessados, contador de conversas, métricas |
| `notices-skip-records-of-blocked-people` | 1: lista, sino e "Sua pergunta recebeu N respostas" |
| `alerts-count-and-simulation-skip-blocked-sellers` | 1: contagem e simulação de alertas |
| `hidden-list-skips-questions-of-blocked-people` | 1: Ocultados |
| `simulated-answer-donor-skips-blocked-answers` | 1: Simular resposta |
| `block-button-is-hidden-for-someone-already-blocked` | 1: Bloquear X (inclui "Ver mesmo assim") |
| `profile-question-counter-matches-the-list` | 1: contador de Você |
| `closing-a-group-clears-requests-and-refuses-approvals` | 2: pedidos zerados, aprovar recusado, seção escondida |
| `closed-group-is-readable-only-within-the-period` | 2: prévia, publicação, busca, Início |
| `group-preview-skips-moderated-posts` | 3 |
| `group-offers-follow-the-business-page` | 4: prefixo "Oferta · ", página pausada, suspensa e excluída |
| `offer-quota-survives-a-rename` | 4: cota pela conta |
| `deleted-group-post-says-it-was-deleted` | 5 |
| `menus-name-themselves-and-declare-the-popup` | 6: 11 menus (nome e `aria-haspopup`) |
| `question-menu-offers-hide-report-and-block` | 7 |
| `removing-a-group-post-takes-back-the-recommendations` | 8: `recN` |
| `editing-a-city-question-post-updates-indications` | 8: `alsoCity` |
| `settings-links-ask-before-discarding-edits` | 8: Ocultados, Bloqueados, Ajuda |
| `entry-draft-never-keeps-the-password` | 8: rascunho da entrada |
| `forms-offer-no-manaus-hoods-in-other-cities` | 8: anúncio, imóvel, pedido e indicação em Brasília |

Provas antigas adaptadas (com comentário no arquivo):
- `round63-proof.mjs`: a chave da cota semanal passou a ser `profile.email || 'local-member'`.
- `round58-proof.mjs` (`consent-links-open-the-pages-and-keep-the-form`): a senha agora volta vazia depois de ler o
  documento; a prova digita de novo antes de seguir.

Baseline (HEAD `29fb032d`, 375 claro): 0 de 22 PASS (build `045ff351…`).

Provas rodadas (lote enxuto: só a nova, três antigas diretamente afetadas e o gate):

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 64 (375 e 1440, claro) | `PASS: 44/44 checkpoints; JS errors 0; external 0` |
| Rodada 60 (bloquear e Painel, 375 claro) | `PASS: 14/14 checkpoints; JS errors 0; external 0` |
| Rodada 61 (grupo encerrado e página, 375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 63 (cota de oferta, planos, 375 claro) | `PASS: 11/11 checkpoints; JS errors 0; external 0` |
| Rodada 58, só os dois checkpoints tocados (consentimento e links das Configurações) | `PASS: 1/1 checkpoints; JS errors 0; external 0` (cada um) |
| Testes do build (`test_build.py`, 20 testes) | `OK` |
| Gate completo | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Contrato validado: `node scripts/agents/task-contract.mjs docs/agents/tasks/HTML-064.task.yml` → `ok (R2, retry 3)`.
Por ajuste de método, a bateria completa fica para o fechamento do lote.
