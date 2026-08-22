# Bivaque — Kanban local do MVP

Uma superfície web local e versionada para acompanhar o fechamento e lançamento do MVP. Ela não é
o sistema de tickets, não grava em Supabase e não modifica o frontend produtivo.

Leia este README junto do [README da raiz](../../README.md). O roteador da raiz aponta para as
fontes que governam cada decisão:

- `docs/BIVAQUE.md`: visão e decisões de produto;
- `docs/PRODUCT_STATUS.md`: estado registrado do runtime;
- migrations, código e testes: evidência primária do que realmente existe;
- `docs/superpowers/plans/README.md`: protocolo e ordem das ondas.

Quando uma dessas fontes diverge da evidência primária, registre o card com `drift`. Não trate
texto desatualizado como funcionalidade entregue.

## Rodar

Não há dependências para instalar: o servidor usa somente Node.js 22+.

Na raiz do repositório:

```sh
npx pnpm@11.18.0 --dir tools/backend-kanban dev
```

Abra [http://127.0.0.1:4175](http://127.0.0.1:4175). O servidor escuta apenas em `127.0.0.1`.
Para outra porta local, use `KANBAN_PORT`, por exemplo no PowerShell:

```powershell
$env:KANBAN_PORT=4176; npx pnpm@11.18.0 --dir tools/backend-kanban dev
```

## Dados e atualização por agentes

O arquivo canônico é [`public/board.json`](public/board.json). A interface apenas o carrega e
projeta: busca e filtros não alteram os dados. Portanto, Git é a única sincronização necessária.

Agentes leem primeiro [`BOARD.md`](BOARD.md), um resumo curto gerado a partir do JSON. Depois usam
o `id` estável para consultar apenas o card relevante no arquivo canônico. `BOARD.md` nunca é
editado manualmente.

Para atualizar um card:

1. confirme o estado no código, migration, teste ou GitHub;
2. atualize o card pelo `id` estável, preservando `proof`, `tests` e `links`;
3. quando houver conflito entre documentação e runtime, preencha `drift` em vez de esconder a
   diferença;
4. atualize o board apenas quando houver transição material: prova, bloqueio, drift, prioridade,
   status ou conclusão; apenas começar a trabalhar não muda o card;
5. só mova para `done` após o checklist aplicável e a prova estarem registrados;
6. regenere e valide o resumo;
7. faça um commit pequeno que mencione o `id` do card.

```sh
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --check
node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ
node tools/backend-kanban/src/board.mjs --search service_role
```

O `test:scope` executado no gate também valida o schema, IDs, estados, Definition of Done e se o
resumo está sincronizado. Assim, a estrutura é automática; a decisão semântica de mudar um card
continua baseada em evidência.

Os campos opcionais `owner`, `branch`, `issuePr`, `proof`, `tests`, `blockedBy` e `completedAt`
estão previstos no formato. Eles permitem que vários agentes contribuam em worktrees diferentes
sem criar uma segunda fonte de verdade no navegador.

### Tarefas novas

O agente que encontra trabalho ainda não representado procura primeiro IDs, títulos e checklists
equivalentes. Se pertencer ao mesmo contrato de fechamento, amplia o card existente. Se for uma
frente realmente nova, cria um card no mesmo commit que revelou a necessidade, com:

- ID estável, prioridade, categoria e status;
- evidência da origem, checklist e `dependencies` explícitas, mesmo quando vazias;
- `updatedAt` (`YYYY-MM-DD`) e `sourceRevision` (commit confrontado com o card);
- `blocked` ou `repo` quando depender de decisão de produto, dados pessoais, pagamento, RLS ou
  outra fronteira R3.

Descobrir uma necessidade não autoriza o agente a inventar escopo ou decisão soberana.

## Definition of Done

Um card de backend não fica concluído apenas porque há código. Conforme o caso, exige:

- schema/contrato, migration, constraints, RLS/grants;
- happy path e sad path;
- teste negativo de autorização e teste do caller real;
- idempotência, observabilidade e desempenho mínimo;
- documentação de contrato, tipos gerados e prova registrada.

Para RPCs chamadas por `service_role`, teste o mesmo caller usado em runtime: `service_role` não
preenche `auth.uid()` automaticamente.

## Limites deliberados

- Nenhuma autenticação, banco, API remota ou colaboração em tempo real.
- Nenhuma alteração em `apps/web`.
- Nenhum mecanismo de drag-and-drop: mover status é uma mudança revisável no JSON canônico.
- IA é consumidora do Bivaque; desligá-la não pode quebrar Community, Marketplace, Events,
  Search, Guides ou Knowledge.
