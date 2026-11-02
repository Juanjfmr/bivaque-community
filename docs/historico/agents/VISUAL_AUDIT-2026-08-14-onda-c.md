# Veredito da auditoria visual — Onda C (devolver a fala) — 2026-08-14

> Procedimento do `docs/superpowers/plans/README.md` (fim de cada onda) e
> §9 do `docs/agents/VISUAL_GUIDE.md`. Telas tocadas por esta onda:
> `/community` (compositor) e `/recommendations` (formulário de pedido).

Capturas: `.visual/2026-08-14T07-35-51-506Z/shots/` (run do
`scripts/visual/loop.mjs` após os commits das Tasks 1–5).

---

## Achados

- **Total: 213, high-severity: 104.**
- **0 achados introduzidos pela Onda C.**
- **Nenhum achado `forbidden-copy`** — a regra da auditoria continua reprovando
  rótulo de asserção ("Patente:", "OM:"), e esta onda não introduziu nenhum.

Os 104 high são o mesmo par de botões do cabeçalho (`button.` 67×32 e 56×32,
mínimo 44×44) repetido em toda rota do shell — os botões `size="sm"` do
HeroUI v3, **preexistentes** (backlog da Phase 2 do plano de auditoria visual).
O veredito da Onda B (`VISUAL_AUDIT-2026-08-14-onda-b.md`) já os documentava.

O número caiu de 216 (Onda B) para 213: a mudança de copy em `/recommendations`
removendo a promessa "não permite conteúdo comercial" e a ausência de novos
rótulos de PII mantêm a superfície estável.

## O que esta onda mudou na superfície

- `/community` e `/recommendations`: o bloqueio de vocabulário saiu. No lugar,
  um aviso de PII ("Isso parece um CPF ou CEP. Quer mesmo publicar?") com
  "Publicar mesmo" / "Cancelar" — sem novo achado de auditoria.

## Task 6 — adiada

A regra `forbidden-copy` só muda quando o `ADR-20260811-om-declarada`
(afiliação declarada) for aprovado. Está `proposed`; o adiamento foi registrado
no `PRODUCT_STATUS.md` (§3, "Afiliação declarada").

## Status

A Onda C está **fechada** (com a Task 6 adiada e registrada):

- ✓ `db:lint` limpo, pgTAP verde (693), gate verde.
- ✓ 0 achados visuais introduzidos; 104 high preexistentes.
- ✓ Veredito escrito (este documento).
