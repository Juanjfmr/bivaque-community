# Histórico — não é instrução

Tudo nesta pasta foi autoridade em algum momento e deixou de ser em 02/11/2026, quando o dono pediu
que o repositório não tivesse ruído para quem executa. Fica aqui como registro: para entender por
que uma decisão foi tomada, para recuperar evidência antiga ou para não repetir um erro já pago.

**Nenhum arquivo daqui orienta trabalho novo.** O que vale está em [`AGENTS.md`](../../AGENTS.md),
na [definição do lançamento](../LANCAMENTO.md), nos ADRs de [`docs/decisions/`](../decisions/) e na
[régua Nextdoor](../agents/regua-nextdoor/). Se algo daqui ainda for necessário, traga para a fonte
viva com data e motivo; não aponte agentes para cá.

| Pasta ou arquivo | O que era |
|---|---|
| `BIVAQUE.md`, `PRODUCT_STATUS.md` | Visão de produto de agosto e o inventário de runtime da web antiga. O escopo do lançamento vive em `docs/LANCAMENTO.md`; o estado vive no quadro. |
| `AUDITORIA_ADERENCIA_2026-10-19.md`, `agents/HANDOFF-*` | Auditoria e handoffs de outubro, já absorvidos pelos ADRs e pela régua. |
| `agents/` | Auditorias visuais de agosto e setembro, pranchas, prompts do Qwen, sistema de design do HeroUI, inventários e o rascunho do harness. |
| `design/visual-guide-2026-09-06/`, `design/fluxos-2026-10-30/` | Guia de pranchas de setembro e referências do F01 de 30/10. A régua Nextdoor substituiu os dois. |
| `superpowers/`, `journeys/`, `red-team/`, `evidence/` | Planos por onda, mapa de jornadas, red team de agosto e evidência do Figma. |
| `bivaque-html-kit/`, `codex-agents/` | Kit e os 18 agentes do Codex da fase do protótipo HTML. Mandavam não implementar backend; saíram de `.codex/agents/` para não orientar o Codex. |
| `tasks/` | Contratos de tarefa já executados. Contrato novo nasce em `docs/agents/tasks/`. |
| `claude-memory-agosto.md` | Índice de memória de agosto que apontava para documentos superados. |

As ferramentas de setembro que ainda leem daqui (galeria de flows, comparação com pranchas e os
testes de contrato do design da web antiga) saem junto com as telas antigas do `apps/web`.
