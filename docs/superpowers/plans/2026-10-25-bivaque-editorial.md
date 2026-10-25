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
- [x] Compact sidebar to only high priority destinations, preserve others via More.
- [x] Slim responsive header and mobile bottom navigation.
- [x] Verify Next build.
### Task 2: Editorial Home
- [x] Rebuild header, search, four discovery intents without stock skyscraper hero.
- [x] Put residential photography first and community as human-centric rows.
- [x] Verify Next build.
### Task 3: Separate module grammar
- [x] Imóveis: image-first catalog with low chrome.
- [x] Comunidade: post-like rows, inline answer context, no enclosing support-card.
- [x] Negócios: information-rich provider rows with useful imagery.
- [x] Keep shadcn detail and action affordances.
### Task 4: Deploy and review
- [x] Run compile and token checks in isolated branch.
- [x] Promote to GitHub Pages preview branch only if passed.
- [x] Verify exported root and module URLs. State absence of browser screenshot QA honestly.

## Verification ledger — 2026-10-25
- GitHub Actions visual verification: run 40225614192, result success (npm ci, WCAG contrast, static text smoke checks, Next.js TypeScript/build, exported routes).
- GitHub Pages publishing: run 40225692647, result success; source output mirrored to branch root; published Home/Imóveis/Comunidade/Serviços are Next.js static HTML with /bivaque-community/_next/static assets and no README.
- Default competing GitHub Pages build 40225750827 deployed with failure after building; custom workflow succeeded. Root export remains verified. A single-source GitHub Pages configuration should eventually replace the dual workflow to avoid competition.
- Limitation: no direct pixel-level browser screenshots or user-device validation; do not claim identical visual results across 375/768/1440.
- Lovable independent visual spike: project acba36ba-2a74-4c69-913f-9178f4eb730b (ready). GitHub Pages remains canonical test preview.
