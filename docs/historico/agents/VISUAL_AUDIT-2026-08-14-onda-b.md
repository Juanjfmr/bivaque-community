# Veredito da auditoria visual — Onda B (coerência por subtração) — 2026-08-14

> Procedimento do `docs/superpowers/plans/README.md` (fim de cada onda) e
> §9 do `docs/agents/VISUAL_GUIDE.md`. Telas tocadas por esta onda:
> `/login`, `/community`, `/groups`, `/groups/[id]`, `/events/[id]`, `/profile`.

Capturas: `.visual/2026-08-14T07-00-06-876Z/shots/` (run do
`scripts/visual/loop.mjs` após os commits das Tasks 1–7).
Captura rodada **autenticada** (seed local) e não autenticada (preauth).

---

## Achados

- **Total: 216, high-severity: 106.**
- **0 achados introduzidos pela Onda B.**

Os 106 high são um único par de botões repetido em toda página do shell:

| Achado | Detalhe | Origem |
|---|---|---|
| `touch-target` (high) × 2 por rota/viewport | `button.` 67×32 e `button.` 56×32 (mínimo 44×44) | botões `size="sm"` do HeroUI v3 no cabeçalho (`Publicar`, notificações) — 32px de altura |
| `no-transition` (medium) × 2 | botões sem transição | mesmo cabeçalho |
| `heading-structure` (medium) × 1 | `h1` ausente | `/login`, `/` — preexistente |
| console `404`/`500` | assets/avatares do seed | preexistente/ambiente |

O par 67×32 / 56×32 é idêntico em `/consent`, `/onboarding/*`, `/groups`,
`/groups/[id]`, `/profile`, `/events`, `/events/[id]`, `/community`,
`/recommendations`, `/messages`, `/notifications` — é o cabeçalho
compartilhado, não uma tela específica. O veredito da Onda 6
(`VISUAL_AUDIT-2026-08-06-preauth.md`) já registrava exatamente isto:
"touch-target em botões curtos do HeroUI v3 migration".

**Nenhuma remoção desta onda deixou buraco.** A Onda B removeu affordances
mortas (checkbox/link de senha, chevron de localidade, contador de passos,
seção de comentários, botão de salvar, escolha de visibilidade, toggles de
DM/menção). Remoção não insere botão pequeno; o risco desta onda era
"buraco deixado para trás", e nenhuma das telas tocadas caiu em `HTTP != 200`
por conta das remoções.

## Status do gate de auditoria

A Onda B está **fechada**:

- ✓ Captura completou (gates lint/typecheck/test/build + captura ok).
- ✓ 0 achados introduzidos pela onda — os 106 high são preexistentes
  (backlog da Phase 2 do plano de auditoria visual, `2026-08-05-auditoria-telas.md`).
- ✓ Veredito escrito (este documento).
- ⚠ O loop termina em `KEEP ITERATING` porque a auditoria determinística
  conta os touch-targets preexistentes — não é sinal de regressão desta onda.
