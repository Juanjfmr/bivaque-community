# Bivaque editorial redesign Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
**Goal:** A recognizable, high-quality Bivaque frontend, not an AI component showcase.
**Architecture:** Keep existing Next.js route shell + all module state. Replace presentation of the four screens with semantic Tailwind compositions and shadcn primitives. Add only a small editorial utility layer if needed.
**Tech Stack:** Next.js, TypeScript, Tailwind, shadcn/ui; GitHub Pages static export.
**Spec:** docs/superpowers/specs/2026-10-25-bivaque-editorial.md
## Global Constraints
- Preserve `main`, R72 and production.
- Maintain current Brasa/Papel/Grafite tokens and shadcn primitives.
- Do not invent real businesses, ratings, endorsements, users or platform availability.
- All buttons must function with existing local state.
## Review Focus
- 375px: no clipped nav/search/buttons, bottom bar never overlaps content.
- 768px: content grid does not show squeezed three-card layout.
- 1440px: whitespace is intentional; editorial reading rhythm not dashboard grids.
- Dark theme: appropriate foreground contrast.
- Other cities: no Brasília items attributed elsewhere.
### Task 1: Shell
- [ ] Compact sidebar to only high priority destinations, preserve others via More.
- [ ] Slim responsive header and mobile bottom navigation.
- [ ] Verify Next build.
### Task 2: Editorial Home
- [ ] Rebuild header, search, four discovery intents without stock skyscraper hero.
- [ ] Put residential photography first and community as human-centric rows.
- [ ] Verify Next build.
### Task 3: Separate module grammar
- [ ] Imóveis: image-first catalog with low chrome.
- [ ] Comunidade: post-like rows, inline answer context, no enclosing support-card.
- [ ] Negócios: information-rich provider rows with useful imagery.
- [ ] Keep shadcn detail and action affordances.
### Task 4: Deploy and review
- [ ] Run compile and token checks in isolated branch.
- [ ] Promote to GitHub Pages preview branch only if passed.
- [ ] Verify exported root and module URLs. State absence of browser screenshot QA honestly.
