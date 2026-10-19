# Bivaque — Rodada 61: encerrar grupo; pausar e excluir minha página de negócio

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-061.task.yml` (R2). Lote: `docs/LOTE_FUNCIONAL.md`.
Origem: `docs/AUDITORIA_FUNCIONAL_2026-10-18.md`, seção C. Maquete aprovada: quadros 11 e 12
(`.visual/bivaque-html-funcional/maquete.html`).
Base: HEAD `8f8b0d31` (Rodada 60), build `3402aae2…` (reproduzido). Candidato: build `62a12c2e…`.

**Veredito: PASS.**

## O que mudou

### Encerrar grupo (quadro 11, `features/groups/`)

- **Quem vê:** só o admin. A seção **Encerrar** do Gerenciar grupo tem **Encerrar o grupo**, em vermelho, e a
  frase "As publicações ficam só para leitura por 30 dias." Não-admin não tem Gerenciar nem o botão.
- **Confirmação:** `confirm('Encerrar o grupo?', …, {ok:'Encerrar', cancel:'Cancelar', danger:true})`. Cancelar
  não encerra. O diálogo do Gerenciar fecha antes de abrir a confirmação.
- **Grupo encerrado** (`g.closedAt`):
  - Sem publicar (`Escrever`, `Nova publicação`, editor de tipo), sem comentar, sem votar (opções da enquete
    viram texto, "Votação encerrada"), sem confirmar encontro, sem resolver pergunta, sem Útil, sem editar ou
    excluir publicação e comentário próprios. Os botões somem; as ações que ainda chegam (atalho, aba aberta
    antes do encerramento) recusam com o aviso "Este grupo foi encerrado. As publicações estão só para leitura.".
  - Sem Entrar, Pedir e Convidar. Aviso de entrada recusado.
  - Faixa: "Grupo encerrado em DD/MM. As publicações ficam disponíveis para leitura até DD/MM." (classe
    `g-closed`).
  - Sai de Sugeridos, Populares e da busca de Descobrir grupos. Em **Meus grupos** continua, com a marca
    **Encerrado**.
- **Reabrir** (`reopen-group`): o admin abre Gerenciar e toca **Reabrir o grupo** enquanto estiver no prazo de
  30 dias. Sem confirmação (é reversível). Depois do prazo, o botão some e o texto diz que o prazo passou.
- Ao encerrar, pedidos de entrada pendentes são zerados (`pending=false`), para não sobrar aprovação em grupo fechado.
- Código: `views.js` (helpers `groupClosed`, `groupCanReopen`, `closedStrip`, `dayMonth`), `editors.js`
  (`closeSection` e bloqueio do editor), `handlers.js` (`closeGroup`, `close-group`, `reopen-group`, recusas).
  Em `community/manage.js` (R59) entrou uma guarda de uma linha: editar ou excluir publicação e comentário de grupo
  encerrado é recusado com o aviso.

### Pausar e excluir minha página (quadro 12, `features/businesses/detail.js`)

- **⋮ na minha página**, ao lado de "Editar página" (o botão foi mantido para as provas antigas que dependem dele):
  **Editar página**, **Pausar página** (vira **Reativar página** quando pausada) e **Excluir página**, em vermelho.
- **Pausar** (`myBiz.paused`): sai do catálogo, da busca e das sugestões de negócio (home, Comunidade, paleta),
  e deixa de ver pedidos novos para responder (`providerCanSee`). Propostas novas são recusadas com "Sua página está pausada. Reative para
  enviar propostas."; propostas já enviadas continuam. A página mostra **Página pausada** com **Reativar**.
  Reativar devolve tudo. Não usa `suspended`: essa flag é só do Painel (R60).
- **Excluir** (confirmação vermelha "Excluir página?", Cancelar não exclui): `state.myBiz=null`. As propostas
  com status `sent` da página viram `withdrawn` e saem das listas do pedido. Pedidos concluídos ficam intactos.
  O app volta para **Você** com o aviso "Página excluída. As propostas abertas saíram dos pedidos.".
- Catálogo, busca e sugestões passam por `cityBiz()` (`app/state.js`), que agora também filtra `paused`.
- Código: `detail.js` (`pausedStrip`, `ownBizAction`, `deleteMyBiz`), uma linha em `app/handlers.js` (switch)
  e os filtros em `state.js` e `requests/model.js` e `requests/handlers.js`.

## Decisões tomadas sem pergunta

- **Ícones:** `pause_circle` e `play_circle` não estão na fonte embutida (confirmado com
  `.visual/r13/icons.mjs`). Usei `visibility_off` (pausar) e `visibility` (reativar). `delete`, `edit`,
  `refresh`, `lock`, `more_vert` existem.
- **Frase de apoio do ⋮:** o popover não quebra linha (`.create-menu-label` tem `nowrap`), e a frase da maquete
  estourava os 375 px. O item de pausar mostra "Sai da busca e do catálogo". A frase completa da maquete ("Pausada,
  a página sai da busca e do catálogo; você reativa quando quiser.") ficou na faixa da página pausada.
- **Depois do prazo de 30 dias:** a spec não dizia. Escolhi: o grupo segue em Meus grupos marcado Encerrado, a
  faixa diz que as publicações deixaram de estar disponíveis desde DD/MM, as publicações não aparecem mais e não
  há reabertura.
- **Útil e Convidar** também somem no grupo encerrado (leitura é sem interação, e entrar é recusado).
- **Busca de grupos:** grupo encerrado sai dos resultados de Descobrir para todos, inclusive membros. Em Meus grupos
  ele continua.
- **Proposta escolhida de pedido em andamento** (status `chosen`, pedido ainda não concluído) **não é retirada**:
  o histórico da escolha do cliente fica como está. Na lista, a página excluída aparece como "Empresa" (fallback
  que já existia). Só as propostas `sent` viram `withdrawn`.
- **Excluir página não tem Desfazer** (a confirmação diz isso). Como o contrato é R2, a retirada de propostas de
  clientes foi tratada como ação destrutiva.
- **Tempo nas provas:** o contexto determinístico do harness fixa o relógio do navegador, que pode ser anterior ao
  relógio do Node. Por isso as datas dos fixtures usam `page.evaluate(() => Date.now())`.
- **Provas antigas:** nenhuma precisou de adaptação. `round04`, `round59` e `round10` passaram sem mudança de script.

## Prova

`scripts/bivaque-html/round61-proof.mjs`, 6 checkpoints, um por comportamento:

1. `close-group-is-admin-only-and-asks-red-confirmation`: não-admin não vê Gerenciar nem Encerrar; admin vê a seção;
   Encerrar pede confirmação vermelha; Cancelar não encerra; confirmar encerra e mostra a faixa.
2. `closed-group-stops-publish-comment-vote-event-and-like`: sem Escrever, sem voto na enquete, sem Útil, sem
   comentário, sem Vou, sem nova publicação.
3. `closed-group-leaves-suggestions-and-search-and-is-marked-in-my-groups`: fora de Populares e da busca de
   Descobrir (resultado vazio com "Nenhum grupo com esse nome"); em Meus grupos com "Encerrado".
4. `admin-reopens-within-deadline-and-cannot-after-it`: reabre no prazo (faixa some, escrita volta); depois do prazo,
   sem Reabrir e sem publicações.
5. `paused-business-leaves-catalog-and-search-and-reactivates`: ⋮ com os três itens e os ícones; pausar mostra
   Página pausada e Reativar; sai do catálogo e da busca; reativar devolve.
6. `deleted-business-withdraws-open-proposals-and-keeps-history`: Excluir pede confirmação vermelha; Cancelar não
   exclui; confirmar tira a página, marca a proposta aberta como `withdrawn`, mantém a `chosen` do pedido concluído,
   volta para Você com aviso.

| Prova | Resultado (última linha lida) |
| --- | --- |
| Rodada 61 (375 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Rodada 61 (1440 claro) | `PASS: 6/6 checkpoints; JS errors 0; external 0` |
| Baseline: Rodada 61 sobre HEAD `8f8b0d31` (375 claro, export limpo) | `FAIL: 0/6 checkpoints; JS errors 0; external 0` |
| Rodada 04 (375 claro, sem adaptação) | `PASS: 14/14 checkpoints; JS errors 0; external 0` |
| Rodada 59 (375 claro, sem adaptação) | `PASS: 14/14 checkpoints; JS errors 0; external 0` |
| Rodada 10 (375 claro, sem adaptação) | `PASS: 12/12 checkpoints; JS errors 0; external 0` |
| Testes do build (`test_build.py`, 20 testes) | `OK` |
| Gate completo (lint, tipos, testes 107/107, segredos) | `GATE VERDE (build não rodou).` O passo de build do app web é pulado por falta de `apps/web/.env.local`; não se aplica ao protótipo. |

Uma execução de 375 falhou no checkpoint de exclusão, e a mensagem não foi guardada. O screenshot da falha mostrava o estado final certo (página excluída, aviso na tela). Coloquei esperas explícitas pela rota e pelo aviso depois da confirmação (sem afrouxar nenhuma asserção). Depois disso: 375 e 1440 passaram 6/6, e o checkpoint isolado passou 3/3. Registro honesto: a causa exata não foi confirmada.

Método: pela regra do lote, rodei só a prova nova (375 e 1440), as três provas antigas diretamente afetadas e o gate.
A bateria completa fica para o fechamento do lote.
