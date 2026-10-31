# Bivaque Community — Claude Code

@AGENTS.md

Shared rules and task-specific reading routes live in `AGENTS.md`; do not duplicate them here.
Use the current October ADRs/handoff linked there before September reconstruction instructions; check the latest main/PR state before dispatching.
Respond in Brazilian Portuguese. Local procedures: `.claude/skills/`.
Before delegation, follow [AGENT_ARCHITECTURE.md](docs/agents/AGENT_ARCHITECTURE.md) and validate the batch contract.

## Code graph (when available)

MCP: `codebase-memory-mcp` in `.mcp.json`. Always pass `project: "bivaque-community"`.
Use `get_architecture` for structure, `search_graph` for symbols, `trace_path` for callers/callees, `detect_changes` for impact and `get_code_snippet` for exact source.
Check `index_status`/`check_index_coverage` before trusting completeness; paginate `has_more` results.
The watcher updates the index. Reindex only when freshness requires it; use `rg`/source for simple searches, unavailable tools or stale/partial coverage.
