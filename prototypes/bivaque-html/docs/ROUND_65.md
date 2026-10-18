# Bivaque — Rodada 65: pedidos, propostas, planos, página de negócio e apagar a conta

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-065.task.yml` (R3, com o
[ADR-20260820-alcance-pago](../../../docs/decisions/ADR-20260820-alcance-pago.md)). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: seção "R65" das correções da revisão do Lote Funcional (revisão de código, Codex e OpenCode sobre o HEAD
`29fb032d`). Base: HEAD `29fb032d` (R57 a R63). Candidato: build `deaf73d1…`.

**Veredito: PASS** no protótipo. **Pendente com o dono do produto:** a aprovação comercial dos planos continua a
mesma da R63 (ver "Pendência R3"); esta rodada estendeu o limite de 5 conversas novas ao Destaque de momento.

## O que mudou, por item

### 1. Proposta removida pelo Painel (`features/owner/review.js`, `requests/views.js`)

- Remover a proposta **escolhida** reabre o pedido e devolve a `sent` as outras propostas `declined` ainda válidas
  (dentro da validade) e de páginas abertas, como o "desistir" faz. Pedido concluído ou cancelado **não** reabre
  (a proposta sai e o resto fica como está). Pedido já vencido reabre sem devolver nada (o prazo manda).
- "Escolher" só aparece em proposta `sent`, dentro da validade e de página aberta. A recusada de um pedido aberto
  (o estado que a remoção antiga deixava) deixou de oferecer o botão.

### 2. Desfazer no Painel (`features/owner/queues.js`)

O desfazer de uma proposta que reabriu o pedido só restaura se o pedido ainda está como a decisão o deixou (aberto,
sem escolhida, sem conversa); senão avisa "O pedido já mudou depois dessa decisão. Ela não pode mais ser desfeita." e
mantém a decisão. Quando restaura, devolve a `declined` só as propostas que a remoção tinha devolvido (`restored`).

### 3. Página fechada nas propostas (`requests/model.js`, `requests/handlers.js`, `businesses/detail.js`)

- Novo predicado **`proposalBizOpen(b)`**: página existe, não está suspensa nem pausada e, sendo a da própria
  pessoa, está publicada (`live`). Aplicado em: `choose-proposal` (antes e dentro da confirmação), "Escolher" na
  tela, o "desistir" (não devolve proposta de página fechada), `propose` (suspensa agora recusa como a pausada) e
  `providerCanSee` (suspensa não vê pedido novo).
- Excluir a página retira também as propostas `declined` de pedido aberto ou escolhido (rotina nova
  `bizLeaveRequests`, reaproveitada por apagar a conta); o histórico de pedido concluído não muda.
- "Conversar com o prestador" abre `r.threadId` quando a conversa existe (mesmo com a página suspensa depois); sem
  conversa e com página fechada ou excluída, explica; só cria conversa nova se a página está aberta.

### 4. Patrocinado preso à página (`businesses/plans.js`, `detail.js`, `editor.js`, `app/handlers.js`)

`subscription.spot` guarda `bizId`; `spotActive` confere o id; excluir a página zera o `spot`. A suspensão do Painel
fica na conta (`state.bizSuspended`, gravada ao excluir uma página suspensa) e a página nova nasce suspensa (criar
pela tela de editar ou assumir uma página de exemplo). Desfazer a suspensão no Painel depois da exclusão limpa a
marca e a suspensão da página nova.

### 5. Planos (`businesses/plans.js`, `profile/demo-actions.js`)

O limite de 5 conversas novas por mês vale para Grátis **e** Destaque de momento; só o Plano do negócio é ilimitado
("Conversas novas sem limite" só nele). O aviso do limite agora aponta o Plano do negócio. Voltar ao Grátis encerra o
destaque em andamento (com aviso) e é permitido com a página pausada, suspensa ou ausente; os planos pagos seguem
pedindo página aberta.

### 6. Apagar a conta (`support/help.js`, `accountPurge`, numa única `mutate`)

Zera `state.blocked` e `state.reports` (texto digitado) e a suspensão da conta; tira as chaves da pessoa (nome e
e-mail) de `g.offerAt`; troca o nome da pessoa por "Membro que saiu" nos títulos e no registro do Painel; retira as
propostas da página dela em pedidos de terceiros (`bizLeaveRequests`) e as ofertas de grupo da página; remove
`alsoCity` das publicações cujas perguntas foram apagadas; grupo em que era a administradora: o primeiro moderador
assume (`g.admin`) e, sem moderador, o grupo é encerrado (`closedAt`, pedidos de entrada zerados); voto e presença em
publicação de grupo: limpa só `voted` e `on`, sem subtrair dos totais-base (a tela soma o da própria pessoa).
A presença em encontro da Agenda continua subtraindo, porque ali `going` já inclui a pessoa.

### 7. Chamados sem conta (`support/help.js`, `shell/navigation.js`)

A rota `chamados` sem conta redireciona para a Ajuda; a Ajuda sem conta não lista "Meus chamados"; quem envia o
chamado sem conta vê só a confirmação ("Recebemos. Respondemos por e-mail em até 2 dias úteis.", com "Voltar à
Ajuda"), não a lista.

## Pendência R3 (comercial) — continua com o dono

Nada aqui cobra. Os valores e limites da tela de planos continuam os da R63 e **não** são os do ADR
`ADR-20260820-alcance-pago` (assinatura única de R$ 49/mês; "acesso nunca se cobra, amplificação se cobra"). Esta
rodada **ampliou** o limite de 5 conversas novas por mês ao Destaque de momento (antes só o Grátis tinha), o que
reforça o ponto: um limite de conversas num plano pago toca "acesso nunca se cobra" e precisa de decisão explícita
do dono antes do back-end real.

## Decisões minhas

- **Predicado próprio `proposalBizOpen`** em `requests/model.js`, em vez de reusar `bizOpen` (R63, `groups/editors.js`):
  `bizOpen` exige `live`, que as páginas de exemplo do catálogo (as que mandam propostas) não têm. Também evita
  mexer numa linha que a R64 (ofertas de grupo) pode tocar.
- **Contrato R3** (com o ADR da R63), não R2: os planos tocam a pendência comercial.
- **Proposta removida num pedido vencido** reabre o pedido (como o "desistir") mas não devolve propostas.
- **Declinadas de pedido concluído/cancelado** não são retiradas ao excluir a página (histórico).
- **Administração passada ao moderador** grava `g.admin` (campo novo, sem tela que o leia hoje); o moderador sai de
  `g.mods`.
- **Suspensão da conta** (`bizSuspended`) é limpa ao apagar a conta, para a conta nova não herdá-la.
- **Grátis sem página** também é permitido (não só pausada ou suspensa), pois não há o que proteger.
- **`proposalBizOpen` em `requestEligible`** não foi aplicado (a contagem "Enviado para N empresas" fica como está).
- **Observado e não mexido:** depois de "Sou o responsável", fechar o editor sem salvar não redesenha a página aberta
  (continua mostrando "Sou o responsável" até sair e voltar). Fora do escopo; a prova contorna saindo e voltando.
- **Não tratado:** nomes e e-mails de moderadores convidados em `state.owner.team` (dados que a pessoa digitou no
  Painel) seguem no armazenamento ao apagar a conta; não estava na lista.

## Prova

`scripts/bivaque-html/round65-proof.mjs`, 16 checkpoints; cada um reproduz o estado do defeito pelo armazenamento e
confere a correção (o que dá para fazer pela tela, faz pela tela):

| Checkpoint | Item |
| --- | --- |
| `panel-removal-of-the-chosen-proposal-returns-the-other-valid-ones` | 1: devolve as válidas, não a vencida nem a de página pausada; "Escolher" só na `sent` |
| `panel-removal-does-not-reopen-a-done-request` | 1: pedido concluído fica concluído |
| `panel-undo-only-restores-while-the-request-is-as-the-decision-left-it` | 2: desfazer restaura; depois de nova escolha, recusa com aviso |
| `suspended-paused-or-deleted-page-proposals-cannot-be-chosen` | 3: botão e ação direta recusados (suspensa, pausada, excluída) |
| `give-up-does-not-bring-back-proposals-of-closed-pages` | 3: desistir só devolve a de página aberta |
| `deleting-the-page-withdraws-open-and-declined-proposals-and-the-sponsorship` | 3 e 4: retira enviadas e recusadas; histórico intacto; zera o patrocínio |
| `suspended-or-paused-page-does-not-see-new-requests-or-propose` | 3: lado do prestador |
| `chat-with-provider-opens-the-chosen-thread-or-explains-why-not` | 3: abre `threadId`; explica sem conversa |
| `sponsorship-belongs-to-the-page-that-activated-it` | 4: patrocínio de outra página não vale na página nova |
| `suspension-stays-on-the-account-when-the-page-is-deleted-and-recreated` | 4: suspensão passa à página nova |
| `moment-plan-keeps-the-five-new-conversations-limit` | 5: sexta conversa recusada no Destaque; Plano do negócio libera |
| `back-to-free-ends-the-boost-even-with-a-paused-or-suspended-page` | 5: voltar ao Grátis; pago continua recusado |
| `delete-account-clears-blocks-reports-offers-and-names-in-the-panel` | 6: bloqueios, denúncias, prazos, ofertas, propostas, `alsoCity`, nome no Painel |
| `delete-account-hands-the-group-over-or-closes-it-and-keeps-the-base-totals` | 6: administração, encerramento, voto e presença |
| `tickets-without-an-account-show-only-the-confirmation` | 7: sem conta |
| `tickets-with-an-account-still-open-my-tickets` | 7: controle com conta |

Baseline (HEAD `29fb032d`, 375 claro, build `045ff351…`): 1 de 16 PASS (só o controle com conta).

Provas antigas adaptadas (comentário `R65` no arquivo): `round62-proof.mjs` (a enquete não perde o total-base ao
apagar a conta; chamado sem conta mostra a confirmação, não Meus chamados).

Provas rodadas (lote enxuto: a nova, três antigas diretamente afetadas e o gate):

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 65 (375 e 1440, claro) | `PASS: 32/32 checkpoints; JS errors 0; external 0` |
| Rodada 58 (pedidos, 375 claro) | `PASS: 15/15 checkpoints; JS errors 0; external 0` |
| Rodada 62 (apagar a conta, 375 claro) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Rodada 63 (planos, 375 claro) | `PASS: 11/11 checkpoints; JS errors 0; external 0` |
| Testes do build (`test_build.py`) | `OK` |
| Gate completo | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Contrato validado: `node scripts/agents/task-contract.mjs docs/agents/tasks/HTML-065.task.yml` → `ok (R3, retry 3)`.
Por ajuste de método, a bateria completa (inclui a Rodada 60, que cobre o Desfazer do Painel) fica para o
fechamento do lote.
