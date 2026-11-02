# Veredito da auditoria visual — Onda 2 (2026-08-06)

> Procedimento §10.2 do `docs/journeys/MAP.md`: cada onda fecha com
> julgamento tela-a-tela depois dos achados mecânicos do auditor. Itens
> 1, 2, 5 e 6 da rubrica §9 do `VISUAL_GUIDE.md` (hierarquia, ritmo,
> densidade, responsivo). Screens auditadas nesta onda:
> `/onboarding/status` e `/onboarding/welcome`.

Capturas: `.visual/2026-08-06T11-07-48-757Z/shots/` (run do
`scripts/visual/loop.mjs` após os commits da Onda 2 Tasks 3 e 4).
A captura rodou **não autenticada** (`authenticated: false` em
`report.json`) porque não há `.env.local` com `BIVAQUE_VISUAL_EMAIL`
+ `BIVAQUE_VISUAL_PASSWORD` no host. O significado prático: rotas
protegidas foram capturadas no estado que um visitante anônimo vê
(redirect para `/login` ou conteúdo público).

---

## `/onboarding/welcome` — `landed=/onboarding/welcome` em todos os 3 viewports

A página não tem gate de auth (é o destino pós-verificação), portanto
foi capturada no estado real. Resultado:

| Item §9 | mobile-375 | tablet-768 | desktop-1440 |
|---|---|---|---|
| **Hierarquia** | passa | passa | passa |
| **Ritmo** | passa | passa | passa |
| **Densidade** | passa | passa | passa |
| **Responsivo** | passa | passa | passa |

**Achados mecânicos do auditor:**
- `touch-target` em `a.text-center` (327×20 / 384×20) — **HIGH**.
  O link "Ir para a comunidade" é texto puro sem padding vertical,
  fica abaixo do mínimo a11y de 44px.
- `no-transition` no mesmo elemento — **MEDIUM**.

**Tratamento do achado HIGH:** o commit
`86f3fb2 feat(onboarding): welcome screen with three first-action suggestions`
entregou o link sem padding por uma escolha editorial (deixar o
texto leve). O fix entrou no commit seguinte (esta onda): bloco
com `block rounded-md border border-border py-3 ... transition-colors
hover:bg-surface` — `py-3` (12px cada lado) + line-height do
`text-sm` (20px) = 44px. Em três re-runs consecutivas do loop após
clear-cache do `.next`, o auditor continuou reportando 384×20 /
327×20 — a largura mudou (de inline para full-width via `block`,
confirmando que a classe está sendo aplicada), mas a altura
permaneceu em 20px. O `getBoundingClientRect()` do script é correto
(`scripts/visual/capture.mjs:165`) e o texto sozinho mede ~20px.
A causa mais provável é que o `py-3` não está sendo emitido no
bundle CSS do Next para esse elemento específico (purge do
Tailwind lendo o source como string, ou ordem de classes), e não
um bug do auditor.

**Recomendação:** investigar por que `py-3` não está生效 para esse
`a` específico antes de declarar a onda fechada. Workaround
temporário: usar `style={{ paddingTop: 12, paddingBottom: 12 }}`
inline, que não passa por purge.

---

## `/onboarding/status` — `landed=/onboarding` em todos os 3 viewports

A página é Server Component e redireciona para `/onboarding` se
`searchParams.state !== "pending" && state !== "rejected"`. O
script de captura navega para `/onboarding/status` sem query param,
portanto a captura caiu no `/onboarding` em todos os viewports —
a nova rota nunca foi renderizada para a câmera.

| Item §9 | resultado |
|---|---|
| **Hierarquia** | (não avaliada — página não capturada) |
| **Ritmo** | (não avaliada) |
| **Densidade** | (não avaliada) |
| **Responsivo** | (não avaliada) |

**Achados no destino de redirect (`/onboarding`):** `font-too-small`
em `span.text-[0.625rem]` (10px) — **MEDIUM**, pré-existente no
`SegmentedProgress` da página de onboarding original. Não
introduzido pela Onda 2.

**Recomendação:** o script `capture.mjs` precisa aprender a
navegar com search params (ou o auditor precisa rodar com auth
para chegar ao estado pós-boot). Sem isso, a tela `/onboarding/status`
fica sem veredito.

---

## Achados pré-existentes (não bloqueiam a Onda 2)

O loop capturou todas as 11 rotas × 3 viewports. Os achados a
seguir existem antes da Onda 2 e devem ser tratados em uma onda
de auditoria dedicada:

- `/login` (tablet + desktop): `touch-target` em botão `text-[var(--accent)]`
  (129×20 / 98×20) — 3× **HIGH**. Botões de ação muito curtos.
- `/login` (tablet + desktop): `contrast` em `p.text-3xl` (1.05:1)
  — 3× **HIGH**. Texto branco sobre fundo branco — contraste
  insuficiente. Provavelmente regressão do HeroUI v3 migration.
- `/onboarding` (todos os viewports): `font-too-small` em
  `span.text-[0.625rem]` — **MEDIUM**, segmentado progress.

Esses achados são o backlog mecânico da Phase 2 do plano de
auditoria (`docs/superpowers/plans/2026-08-05-auditoria-telas.md`),
não desta onda.

---

## Status do gate §10.2

A Onda 2 está **parcialmente fechada**:
- ✓ Welcome screen auditada (4/4 itens da rubrica passam; 1 achado
  mecânico não resolvido por possível problema de Tailwind purge).
- ✗ Status screen não auditada de fato (script não navega com
  search params).
- ⚠ Veredito escrito (este documento) — sem ele, a onda não fecha
  (per §10.2 do MAP).