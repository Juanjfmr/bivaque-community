# Auditoria visual — onda F (o laço semanal)

Run: `.visual/2026-08-20T07-14-02-383Z/` (após duas iterações de correção — ver
`.visual/2026-08-20T07-05-04-680Z/` e `.visual/2026-08-20T07-10-22-370Z/` para o antes).

Telas pedidas pelo plano (Task 10, Step 2): `/recommendations`, `/events`, `/events/[id]`,
`/groups`, `/groups/[id]`.

## Veredito: **high = 0**

- `/recommendations` @ 375/768/1440 — achado real de F: os cards de grupo em "Grupos para
  descobrir" (F5 Step 3, link pra `/groups/[id]`) tinham `<a class="truncate">` sem `min-h-11` —
  6 ocorrências (uma por card) em cada viewport, 18 no total. Corrigido em
  `recommendations/page.tsx` — o link do título do grupo agora é `inline-flex min-h-11 items-center`.
  O link de evento já era o card inteiro (bloco, não texto truncado) e não precisou de conserto.
  Depois da correção: **clean**.
- `/events` @ 375/768/1440 — **clean**.
- `/events/[id]` (`80000000-…-001`) @ 375/768/1440 — **medium** `heading-structure` × 1 (sem `h1`
  na página de detalhe). Achado pré-existente e já registrado em `PRODUCT_STATUS.md` desde a
  auditoria da P0 ("padrão pré-existente de páginas de detalhe") — não é novo desta onda e não
  bloqueia (só `high` bloqueia, por definição do loop).
- `/groups` @ 375/768/1440 — **clean**.
- `/groups/[id]` (`70000000-…-001`) @ 375/768/1440 — mesmo achado `medium` de `heading-structure`,
  mesma causa pré-existente.

## O que não foi capturado

O modal de publicação (composer) e o formulário de recorrência (checkbox "Este é um encontro
recorrente" → seletor de padrão → aviso de feriado) não entram na captura estática por rota — o
script de captura visita URLs, não interage com formulários. F4's recurring-event form foi
verificado manualmente no navegador nesta sessão (ver o commit `2ff5c66` e a linha "Encontro
recorrente" em `PRODUCT_STATUS.md` para o roteiro exato: criação com padrão "1ª sexta", snap
para a data real, aviso de Carnaval ao vivo, e o mesmo QA que achou os dois bugs de
`Checkbox`/RLS corrigidos nesta sessão).
