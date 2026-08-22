# Phase 0 — auditoria do próprio harness

> 2026-08-22. Executada antes de qualquer trabalho de produto, para não começar a
> implementação com o `AGENTS.md` novo e agentes velhos semanticamente divergentes.
> O resultado virou [`AGENT_ARCHITECTURE.md`](AGENT_ARCHITECTURE.md).

## 1. O que foi auditado

`.claude/agents/` (5 arquivos), `.claude/hooks/` (4 arquivos), `.claude/memory.md`,
`.mcp.json`, `.opencode/opencode.json`, e as skills citadas por `CLAUDE.md` e por
`docs/superpowers/plans/README.md`.

Pergunta da auditoria: **o harness descrito nos documentos é o harness que existe?**

## 2. Divergências medidas

| # | Achado | Evidência | Estado |
|---|---|---|---|
| 1 | As skills obrigatórias não existem | `CLAUDE.md` e `plans/README.md` exigem `gate-before-done` e `plan-execution` "em `~/.claude/skills/`". Naquele diretório existiam apenas `session-start-hook` e `synced/` — **nenhuma das duas** | corrigido: versionadas em `.claude/skills/` |
| 2 | Hooks presos à máquina de um dev | `biome-format.sh` e `stop-gate.sh` faziam `cd "C:/Users/juana/bivaque-community"`; fora daquele caminho o hook saía silenciosamente sem fazer nada | corrigido: `CLAUDE_PROJECT_DIR` com fallback para `git rev-parse` |
| 3 | Skill fantasma no agente | `security-auditor.md` mandava "usar a skill `supabase`", que não existe no repo nem globalmente | corrigido: checklist inline no próprio agente |
| 4 | TDD RED-first como arquitetura universal | `test-writer` (só testes) → `test-runner` (só produção) impunha dois agentes por unidade, enquanto o `AGENTS.md` §Style diz que implementação e teste são **um todo só** | corrigido: papéis fundidos em `implementer` |
| 5 | Delegação obrigatória | `explore-haiku` mandava explorar "ANTES de ler arquivos diretamente" como regra universal — delegação também custa contexto | corrigido: regra passa a ser amplitude da pergunta |
| 6 | Revisão sem independência | `code-reviewer` não dizia em lugar nenhum que quem implementou não revisa, nem protegia o primeiro parecer da explicação do implementador | corrigido: `reviewer` com regra de independência e ancoragem |
| 7 | Ninguém adjudicava runtime | O mesmo agente que implementava rodava o gate e declarava pronto. Não existia papel cuja única função fosse ler a saída e dizer PASS/FAIL/BLOCKED | corrigido: `runtime-verifier`, proibido de editar |
| 8 | Memória apontando para documento aposentado | `.claude/memory.md` abria com "Read first: `docs/journeys/MAP.md`"; o `AGENTS.md` diz que esse mapa é histórico desde 2026-08-11 | corrigido: memória aponta para `BIVAQUE.md` + `PRODUCT_STATUS.md` |

## 3. Achados aceitos, sem correção

- **`.mcp.json` e `.opencode/opencode.json` divergem** (o primeiro tem `context7`, o
  segundo tem `chrome-devtools` e `playwright` desligado). É divergência real, mas
  legítima: são dois harnesses com superfícies diferentes. O que **precisa** coincidir —
  Playwright fora do caminho do loop visual — coincide.
- **Caminho Windows em `.mcp.json`** aponta para o binário do `codebase-memory-mcp`
  instalado em `~/.local/bin` da máquina de dev. Diferente do achado 2: ali o caminho
  descrevia o repositório (que muda de lugar); aqui descreve um binário local que
  realmente mora lá.
- **`bash-guard.sh` bloqueia `db:reset`** e continua bloqueando. Em execução headless
  isso torna o E2E inalcançável para agente — restrição conhecida e documentada em
  `plans/README.md`, não defeito do guarda.

## 4. O que passou a ser travado por teste

`tests/scope/agent-architecture.test.mjs` — roda em milissegundos, junto do resto do
`test:scope`:

- o conjunto de agentes é exatamente os sete papéis da v1; os quatro aposentados não voltam;
- todo agente tem frontmatter completo, com `name` igual ao nome do arquivo;
- papel somente-leitura (`explorer`, `reviewer`, `runtime-verifier`, `security-auditor`,
  `experiment-judge`) não declara `Write`/`Edit`;
- as sete skills citadas existem no repositório, com frontmatter;
- nenhum hook contém caminho absoluto de máquina;
- o template de contrato e todo contrato em `docs/agents/tasks/` passam no validador.

`tests/unit/agents/task-contract.test.ts` trava a semântica do validador — as sete
recusas descritas em [`TASK_CONTRACT.md`](TASK_CONTRACT.md).

## 5. O que continua aberto

- **Nenhuma das sete skills foi medida.** São hipóteses até passarem pelo A/B da
  `experiment-protocol`. A primeira a medir deveria ser `adversarial-review`, contra
  revisão sem skill, em tarefas históricas deste repo.
- **A composição não é executada por código.** A estrutura está travada; a sequência
  (implementer → reviewer → verifier) depende de quem orquestra a sessão.
- **`docs/journeys/MAP.md` continua no repositório** como trilha de auditoria. Ele já
  enganou uma sessão; a memória parou de apontar para ele, mas o arquivo segue lá.

## 6. Achado que esta unidade NÃO corrigiu — e por quê

**O gate está vermelho no `main`, e não é por causa deste trabalho.**

```
docs/superpowers/plans/2026-08-16-onda-d2-a-porta.md:617:
  Generic base64-looking token (40+ chars) — Gate/Upload/…/Convites
```

Verificado com a árvore limpa (`git stash -u` + `npx pnpm@11.18.0 test:secrets`): reproduz
igual. A linha entrou em `5325c35`, então `test:secrets` — e com ele o `gate` e a CI —
falha desde aquele commit. Derruba também o assert 46 do `test:scope`
("the secrets scanner runs clean on the real repo").

É **falso positivo**: uma enumeração em prosa separada por barras
(`Gate/Upload/…/Convites`, 41 caracteres no original) casa com o padrão genérico
`[A-Za-z0-9+/]{40,}`, que já tem isenção irmã para caminho do repositório (`isRepoPath`).

> A enumeração aparece elidida acima **de propósito**: escrita por extenso, ela casa com
> o próprio padrão que este parágrafo descreve, e o documento passa a criar dois achados
> novos além do que documenta. Foi o que aconteceu na primeira versão desta página.

**Correção proposta** (não aplicada): uma isenção análoga em `tests/secrets-scan.mjs`, para
match que contém `/` e cujos segmentos são todos palavras de letras (`^[A-Za-z]{2,}$`).
Um token base64 de 40+ caracteres sem nenhum dígito e partido em pedaços do tamanho de
palavra é estatisticamente improvável (~0,5% só pela ausência de dígito).

**Por que não foi aplicada aqui:** a `RISK_MATRIX` diz que qualquer plano que toque em
*secrets* é **R3**, e R3 exige ADR aprovado com assinatura humana. Afrouxar um detector de
credencial é decisão de segurança, não faxina de harness — e o próprio validador de
contrato classifica uma tarefa com `tests/secrets-scan.mjs` em `allowed_paths` como R3,
recusando-a sem `adr:`. A regra vale contra quem a escreveu: fica registrada aqui,
esperando decisão humana.

**Consequência para esta própria tarefa:** o `proof` de `HRN-001` lista o gate completo,
e o gate não pode ficar verde enquanto isso durar. O veredito corrente de HRN-001 é
portanto `BLOCKED`, não `PASS` — registrado no campo `blocked_by` do contrato, que o
validador reporta. Encolher o `proof` até caber no que fica verde seria ajustar a régua
ao resultado, que é exatamente o que este harness existe para impedir.
