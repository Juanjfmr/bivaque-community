# Bivaque — Kanban local do MVP

O arquivo canônico é [public/board.json](public/board.json); [BOARD.md](BOARD.md) é seu resumo gerado.
A interface é somente leitura. Git sincroniza o trabalho; não há banco, login ou atualização por drag-and-drop.

## Consultar e executar

```sh
node tools/backend-kanban/src/board.mjs --card <ID>
node tools/backend-kanban/src/board.mjs --search <terms>
node tools/backend-kanban/src/board.mjs --next
```

Leia BOARD.md uma vez e consulte só o card pertinente. `--next` considera status, prioridade e
dependências concluídas; não interpreta autorização, ADR, escopo web/mobile ou bloqueios escondidos
na descrição. É uma sugestão de fila, não permissão para executar. O pedido atual e o processo §0
prevalecem. Trabalho autônomo resolve um card por commit; não abre um segundo sistema de tarefas.

## Atualizar uma vez por transição material

1. Confirme o que mudou em código, teste, migration ou GitHub. Só começar o trabalho não muda o card.
2. Edite pelo ID estável, preservando evidências anteriores. Registre a nova prova com revisão,
   comando/resultado e caminho/link; não copie logs inteiros para o JSON.
3. Atualize `updatedAt` e `sourceRevision` com o commit confrontado, não um hash futuro do próprio
   commit. Registre prova, bloqueio, prioridade/status ou conclusão no mesmo commit do trabalho.
4. Se houver drift, reconcilie a fonte ou deixe bloqueio/ação concreta. Drift é temporário;
   um card `done` não pode mantê-lo. Um bloqueio de subitem não impede frentes independentes.
5. Regenere e valide:

```sh
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --check
```

Não edite BOARD.md manualmente. Se outra sessão alterou o JSON, reconcilie somente os cards/hunks
pertinentes; não substitua o arquivo inteiro por uma cópia antiga. Consultas somente leitura não
exigem atualização. Não gere relatório, handoff e inventário repetindo a mesma conclusão.

## Status e fechamento

| Status | Uso |
|---|---|
| `repo` | Triagem ou reconciliação ainda necessária |
| `next` | Trabalho planejado, sujeito a dependências/autorização |
| `now` | Frente priorizada, com pendências explícitas |
| `blocked` | Impedimento concreto registrado em `blockers` |
| `frozen` | Trabalho deliberadamente suspenso |
| `done` | Aceitação cumprida, prova registrada, `completedAt`, sem drift aberto |

A validação automática confere schema, IDs, dependências existentes, metadados, prova declarada e
sincronização do resumo; não executa os comandos citados nem confirma que todo checklist foi cumprido.
A conclusão exige julgamento sobre evidência real. Não reduza a aceitação para caber no que passou.

Para backend, aplique os itens pertinentes: contrato/schema, migration, constraints/RLS/grants,
happy/sad path, autorização positiva/negativa, caller real, idempotência/observabilidade/desempenho,
tipos e documentação. `service_role` não preenche `auth.uid()` automaticamente.
R0 documental exige verificações documentais, não E2E artificial. As demais provas seguem o risco.

## Descobertas

Pesquise IDs, títulos e checklists antes de criar card. Estenda o card quando o achado pertence ao
mesmo fechamento. Nova frente exige ID, prioridade/categoria/status, origem, checklist,
`dependencies` explícitas, `updatedAt` e `sourceRevision` no commit que a revela.
Se faltar decisão sobre produto, dados pessoais, pagamento ou R3, use `repo` ou `blocked` com motivo;
descobrir trabalho não autoriza inventar decisão. Vincule ações de incidente ao card existente.

## Interface local

Node >=22, sem dependências adicionais:

```sh
npx pnpm@11.18.0 --dir tools/backend-kanban dev
```

Abra http://127.0.0.1:4175. A variável `KANBAN_PORT` muda a porta; o servidor escuta só em loopback.
Não altera `apps/web` nem Supabase. Autoridade de produto/processo e regras técnicas: [AGENTS.md](../../AGENTS.md).
