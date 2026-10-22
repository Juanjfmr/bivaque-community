# Bivaque Community — Claude Code

@AGENTS.md

As regras compartilhadas vivem em `AGENTS.md`; este arquivo contém somente particularidades do Claude Code.
Responda em português brasileiro. A seção 0 do [processo atual](docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md) define a cadência enxuta e a ordem de consulta.
Antes de delegar, siga [AGENT_ARCHITECTURE.md](docs/agents/AGENT_ARCHITECTURE.md) e o contrato validado do lote. As skills locais ficam em `.claude/skills/`.

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
