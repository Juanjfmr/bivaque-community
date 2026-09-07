# Bivaque Community — Claude Code

## Owner corrections — 2026-09-07

Read [the six explicit corrections](docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md). They require city-wide questions, event information requests, an optional reason for joining, the exact military label, fast CPF verification with identity/AI fallback, and optional self-declared Armed Force/OM with individual visibility controls. These are current product instructions, not delivered runtime. They supersede conflicting older product prohibitions; retain server authorization, privacy and data-integrity requirements.

> Fonte de verdade: **AGENTS.md** (na raiz). Este CLAUDE.md é uma ponte fina —
> leia o AGENTS.md inteiro antes de qualquer trabalho, e siga-o.

@AGENTS.md

## Versão atual — leitura obrigatória

Leia [o processo de construção de 06/09/2026](docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md)
antes de planejar, implementar ou revisar a reconstrução. A autorização atual do usuário
substitui decisões antigas conflitantes de produto, aparência, navegação e sequência.
As regras técnicas e de proteção dos dados continuam aplicáveis. A seção 14 explica o que
é verificação independente e quais camadas ainda dependem de execução externa à sessão.

## Ampliação visual — 07/09/2026

Após o processo, leia o [mapa de telas](docs/design/visual-guide-2026-09-06/MAPA-DE-TELAS.md) e as [instruções do guia](docs/design/visual-guide-2026-09-06/AGENTS.md). Inspecione a referência da plataforma e os estados de falha antes de implementar. Não confunda imagem gerada com fluxo funcional nem repita onboarding já concluído.

## Regras específicas do Claude Code

- Responda sempre em português brasileiro.
- Gate obrigatório antes de declarar pronto: `npx pnpm@11.18.0 gate` — ver a skill `gate-before-done`.
- Plano como contrato: planos vivem em `docs/superpowers/plans/`; execute todo a todo com a skill `plan-execution`; pare se o todo estiver errado ou impossível.
- Implementação e teste são um todo só — nunca entregue código sem o teste na mesma unidade.

## Arquitetura de agentes (leia antes de delegar)

**[`docs/agents/AGENT_ARCHITECTURE.md`](docs/agents/AGENT_ARCHITECTURE.md)** — sete papéis,
o laço de execução, os padrões de composição e o roteamento por risco.

- **A unidade de execução é o contrato de tarefa**, não o agente: `docs/agents/tasks/*.task.yml`,
  validados por `node scripts/agents/task-contract.mjs`. Contrato inválido não vai para execução.
  Formato em [`docs/agents/TASK_CONTRACT.md`](docs/agents/TASK_CONTRACT.md).
- **`implementer` ≠ `reviewer` ≠ `runtime-verifier`.** Quem implementou não revisa nem adjudica
  a própria evidência. Não explique sua solução ao revisor antes do primeiro parecer dele.
- **Subagente isolado é o default; time é exceção justificada** — agente que conversa produz
  erro correlacionado, e erro correlacionado some na revisão.
- **Existir não é evidência.** Fechar tarefa exige comportamento observado — skill `runtime-proof`.
- **`retry_budget` esgotado nunca vira `PASS`**: vira `FAIL`, `BLOCKED` ou `HUMAN_DECISION`.
- As skills estão versionadas em `.claude/skills/` — não dependa de skill instalada na máquina.
- **Armadilhas conhecidas (ver AGENTS.md §Known traps):**
  - O perfil fantasma "Visual Capture": `.visual/` insere um profile no banco local. Não rodar dev server nem captura visual entre `db:reset` e `test:db`, senão 6 asserts de pgTAP quebram com aparência de regressão real.
  - `dev-server.pid` / `dev-server.log` stale: apagar e tentar de novo antes de atribuir falha ao código.
- Supabase: nunca editar migration aplicada; adicionar timestamped via `supabase migration new`. Usar a skill `supabase` (checklist RLS inline) para qualquer schema/policy.
- Secrets: nunca commitar `.env`; nunca ecoar valor de secret.

## Grafo de código (codebase-memory-mcp)

O projeto está indexado no `codebase-memory-mcp` (MCP `codebase-memory-mcp` no `.mcp.json`).
**Use-o ANTES de grep/read para descoberta estrutural:**

- Projeto: **`bivaque-community`** — passe SEMPRE `project: "bivaque-community"` em toda tool do grafo (sem isso, falha).
- `search_graph` → achar símbolos (funções, classes, rotas) por nome/query.
- `trace_path` → quem chama X / o que X chama (callers/callees).
- `detect_changes` → impacto de mudanças não commitadas (blast radius).
- `get_architecture` → visão geral (pacotes, entry points, rotas, clusters).
- `get_code_snippet` → código exato de um símbolo (lê do disco, ground truth).
- `index_status` / `check_index_coverage` → antes de confiar em completeza do grafo; se um arquivo está `parse_partial`, faça grep nele.
- Respostas `has_more: true` → paginar com `offset`/`cursor`.

O índice se atualiza sozinho (watcher). Para forçar frescor após mudança grande externa, chame `index_repository`.
