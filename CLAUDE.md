# Bivaque Community — Claude Code

> Fonte de verdade: **AGENTS.md** (na raiz). Este CLAUDE.md é uma ponte fina —
> leia o AGENTS.md inteiro antes de qualquer trabalho, e siga-o.

@AGENTS.md

## Regras específicas do Claude Code

- Responda sempre em português brasileiro.
- Gate obrigatório antes de declarar pronto: `npx pnpm@11.18.0 gate` — ver a skill `gate-before-done`.
- Plano como contrato: planos vivem em `docs/superpowers/plans/`; execute todo a todo com a skill `plan-execution`; pare se o todo estiver errado ou impossível.
- Implementação e teste são um todo só — nunca entregue código sem o teste na mesma unidade.
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
