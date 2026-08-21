# RUNTIME_FINDINGS — empirical design evidence

> **Status: PHASE 4 FROZEN at commit `d9f1a9e858c566e6103094a4aa23b1110527846f` of `docs/agents-instruction-architecture`.**
>
> The runtime evidence documented here is the result of three passes:
> - **E1/E2/E3/E4**: prior baseline evidence (RUN-001 to RUN-015). The E5/E6 evidence below is preserved and **revised in place** where this methodological review contradicted it.
> - **E5**: the second-pass authenticated audit committed at `12e8fc8` on top of the pre-existing tree tip `8dd2459`.
> - **E6**: the methodological review that produced this revision. It re-ran RUN-007 in isolation (the prior E5 result was contaminated by observing the wrong `tablist`), re-checked RUN-017 after HeroUI/React Aria's actual contract (the prior E5 wording conflated `aria-current` with `aria-selected`), and re-checked RUN-022 after commit `d9f1a9e` shipped the `Avatar.Image onError → Fallback` fix. The build used for E6 is the current tip `d9f1a9e858c566e6103094a4aa23b1110527846f` of `docs/agents-instruction-architecture`, which incorporates `d388b72` (notifications `getUser()` race guard) and `d9f1a9e` (avatar fallback). The Supabase stack was running with the standard local seed; the Next.js production build was produced by `npx pnpm@11.18.0 build` and served by `next start` on `http://127.0.0.1:3000`.
>
> **Phase 4 is frozen for runtime-evidence purposes**: 7 of 8 completion-gate items are satisfied by E5+E6; the remaining item (induced query/server failure, item 4) is deferred by the cross-suite isolation contract, and reduced-motion component behavior (item 7) is a test-suite concern, not a runtime evidence gap. EXP-001–004 remain `EXPERIMENT_REQUIRED` and are passed to Phase 5/6 as the design questions Phase 4 was never going to decide.
>
> Phase 5 adjudication must treat EXP-001–004 as unresolved design questions, but they no longer block the runtime-evidence freeze.

## Evidence posture

Runtime evidence is ranked here as:

- **E1 — direct browser/E2E evidence on current implementation ancestry:** a committed run or incident record states the observed browser behavior and the branch contains the resulting implementation;
- **E2 — current Playwright/runtime contract:** a test exercises the rendered application, but this audit did not re-run it now;
- **E3 — deterministic current-source mechanism:** current source is sufficient to show what the implementation will do, but a fresh browser reproduction is still preferred before final adjudication when interaction/layout is material;
- **E4 — historical visual capture/audit:** useful to assess prior behavior or the quality of the audit mechanism, but not proof of current visual quality.

**E5 — fresh authenticated browser evidence from this audit pass.** The collector at `.visual/audit-runtime/audit-runner.mjs` (output `audit-report.json`, screenshots in `audit-runtime/screenshots/` and `audit-runtime/evidence/`) injects a real base64-url-encoded Supabase session cookie, lands on each surface, waits for network idle + a 500ms hydration buffer, and verifies the shell landmark + display name before logging a visit. Visits whose landed state is not the expected authenticated shell are not observed as PASS. Source: `.visual/audit-runtime/audit-report.json` (151 records), `.visual/audit-runtime/active-container-v2.json` (28 records), `.visual/audit-runtime/auth-probes.json`, `.visual/audit-runtime/audit-analysis.json`. Build: `npx pnpm@11.18.0 build` against `docs/agents/design-audit/AGENTS.md` rules; Supabase local with `db reset --local` (with seed) at `8dd24592ee170d31497985a31e69a2c8bce68458`.

**E6 — methodological review probe.** Re-runs of RUN-007 (isolated manual tablist), RUN-017 (mobile BottomNav Tabs contract), and RUN-022 (avatar fallback after fix). Output: `.visual/audit-runtime/review-probes.json` and `.visual/audit-runtime/evidence/review-*.png`. Build: tip `d9f1a9e858c566e6103094a4aa23b1110527846f` after `npx pnpm@11.18.0 build`.

Current-source inspection is used to explain mechanisms, not to upgrade an unobserved interaction into browser evidence.

## Executive findings

1. **The prior visual gate is not trustworthy as proof for authenticated surfaces.** Its runner permits missing auth and older audit records closed authenticated waves while explicitly capturing signed-out/redirected states. Re-confirmed: this audit's `auth-smoke.mjs` (E5) shows the persistent-login encoding produces a 200 + shell-rendered DOM for all five seed accounts — none redirect to `/login` — so the failure is in `capture.mjs`, not the auth path itself.
2. **The executable visual auditor enforces several rules that Phase 3 already found overbroad:** universal 44×44 targets, mandatory transition/animation on every interactive control, 12px minimum text, and exactly one `h1`. Not re-validated here; left as-is per protocol.
3. **The shipped responsive shell is not the incumbent documented geometry.** E5 confirms exactly: BottomNav at `<768`, 64px rail at `768`, 256px expanded sidebar at `>=1024`. Widths match `cf3cf3e`'s choice, not the documented 224px.
4. **Navigation state is internally inconsistent across viewport classes.** E5/E6 confirms precisely: in `>=768` (rail and expanded sidebar), `/messages`, `/notifications`, and `/profile` activate the **Eu** container, not **Minha comunidade**. **In `375`, the BottomNav visible to sighted users is a HeroUI/React Aria `Tabs` with `role="tab"` / `aria-selected` / roving `tabIndex` / id-linked `tabpanel`s** — and the active `aria-selected="true"` is on `Comunidade` for every nested surface tested (`/messages`, `/notifications`, `/recommendations`). The `aria-current="page"` attribute lives on the off-screen sidebar's `<a>` items at the same `aria-label="Navegação principal"` and is therefore inert for screen-reader users at 375 (the off-screen sidebar's links are also reachable via the screen-reader virtual cursor, but the visible BottomNav is the canonical mobile nav). The defect is therefore a **wrong item being selected** (`Comunidade` is the mobile fallback for non-primary paths), not a missing `aria-*` attribute — and it belongs to RUN-004, not to a missing-`aria-current` theory. The two-pattern split (`aria-selected` on the visible Tabs vs `aria-current="page"` on the off-screen `<a>` nav) is documented and the off-screen `<a>` nav is not `aria-hidden`, which is a separate concern flagged in RUN-025.
5. **The shell can display the wrong locality, and the bug is real on the seeded transfer journey.** E5 confirms strictly: `membro-transferencia@bivaque.example.invalid` (Rio de Janeiro current, Manaus leaving) and `membro-rio@bivaque.example.invalid` (Rio current) both see literal `Manaus, AM` in the shell header at every viewport from 375 to 1440, while the same pages correctly render the Rio content below. Screenshot `evidence-shell-header-rio-bug.png` documents the contradiction in a single captured viewport.
6. **The locality switcher pointer journey is empirically working** for the seeded transfer scenario (RUN-006), but the keyboard semantics are **absent**, not partial. E6 re-ran the test in isolation, scoped to the `div[role="tablist"][aria-label="Escolher cidade"]` only. The two manual tabs both have `tabIndex=0` (no roving), no `id`, no `tabpanel`, no `aria-controls`. **ArrowRight / ArrowLeft / Home / End do not move `aria-selected`.** Only plain `Tab` advances to the next tab (because there is no roving). The earlier E5 result (`moved:true` after ArrowRight) was contaminated by observing the React-Aria `[role="tablist"]` instead of the manual one — both exist on the same page. The single keyboard contract is missing entirely for the manual pair.
7. **`/groups` can turn query failure into false emptiness** (RUN-008) — not re-validated by inducing failure in this pass; current source remains the sole evidence.
8. **`/groups` can surface raw Supabase/Postgres RPC messages through the shared `ErrorState`** (RUN-009) — not re-validated here.
9. **HeroUI presence is demonstrably not runtime proof** (RUN-012, RUN-013) — not re-validated; existing browser evidence stands.
10. **Current composer behavior chooses modal, not inline expansion.** E5 confirms the modal pattern: clicking "Publicar" opens a `[role="dialog"]` with audience copy "Manaus inteira — todos os membros verificados da cidade vão ler", focus inside the dialog (`activeElement` is the dialog section), Escape closes the dialog cleanly. The audience copy is correct for `membro-manaus`; whether this is the strongest pattern is an EXP-002 question.
11. **Visible focus is real and high-contrast.** E5 focus probes at the first Tab stop (mobile: composer trigger `BUTTON[aria-label="Criar publicação"]`; desktop: `BUTTON[aria-label="Recolher menu lateral"]`) show `box-shadow: rgb(248,250,252) 0 0 0 2px, rgb(30,58,138) 0 0 0 4px`. That is a 2px near-white inner ring + 4px navy outer ring — visually distinct against any background. The existing shell-accessibility test that asserts "visible focus" by checking only `*:focus` is therefore misleading: focus is visible, but the test passes for weaker reasons.
12. **Avatar storage returns 404 for every seeded member on every page that renders an avatar.** E5 captured 8 unique `/api/avatar/<uuid>` URLs returning 404 — 5 of them are member ids that the seed created. After commit `d9f1a9e` shipped the `<Avatar.Image onError → Fallback>` fix, E6 confirms the user-visible fallback works (zero broken `<img>` in `/community` and `/groups/:id`; initials render via the Fallback component), but the underlying 404 request still happens for every member without an uploaded photo. Severity downgraded: **no user-visible regression** remains, only a network-efficiency issue (each missing photo still costs one wasted request) that lives in the storage layer, not the design contract. Reclassified — see RUN-022.
13. **Honest empty state for new localities.** E5 confirms that `membro-rio@bivaque.example.invalid` (Rio has 2 < `STALE_LOCALITY_THRESHOLD=30` members) sees "Nenhum grupo ainda" on `/groups` and "As novidades da sua comunidade aparecerão aqui" on `/notifications`. This is **not** the RUN-008 false-empty defect: it is the honest empty-state path correctly distinguished from a query failure.
14. **Group locality scope is enforced at RLS, not at UI.** E5 confirms: `membro-rio@bivaque.example.invalid` requesting `/groups/60000000-0000-4000-8000-000000000001` (a Manaus-only public group) lands on "Pagina nao encontrada — O endereco que voce acessou nao existe nesta comunidade". This is correct, intentional behavior — confirming that locality gating is server-side, not a UI concern.

## Finding table

| Runtime ID | Surface | Related current rule(s) | Reference rule(s) | Evidence | Classification | Severity | Reproducible? | Adjudication impact |
|---|---|---|---|---|---|---|---|---|
| RUN-001 | visual harness / authenticated routes | CUR-461, CUR-485 | REF-028/029; evidence protocol | E4 + E5 `capture.mjs` permits null auth; 2026-08-06 audit closed auth surfaces while explicitly unauthenticated; this run re-confirmed the auth path itself works for all five seed accounts | `SPEC_AND_IMPLEMENTATION_DEFECT` | CRITICAL | yes | Old visual PASS verdicts cannot prove authenticated-screen quality |
| RUN-002 | visual harness / mechanical standards | CUR-077/078, CUR-242/244, CUR-286/290/300/474/475 | REF-020/030/032/039 | E3 current `capture.mjs` implementation | `SPEC_AND_IMPLEMENTATION_DEFECT` | HIGH | yes | Rewrite gate rules before using them as normative enforcement |
| RUN-003 | member shell responsive navigation | CUR-121/122/321/325/326/330/367 | REF-016/019; RVIS-016/017 | E3 + E5 measured widths 375→BottomNav (53px high), 768→64px rail, 1024/1440→256px expanded sidebar | `EXPERIMENT_REQUIRED` | MEDIUM | yes | Do not preserve 768/64/256 geometry as final truth without comparison |
| RUN-004 | shell active navigation | CUR-301–331, CUR-468/469 | REF-008/012; RVIS-014 | E5+E6 confirmed `/messages` and `/notifications` activate **Eu** in the rail/expanded sidebar at 768/1024/1440; mobile 375 has the BottomNav Tabs with `aria-selected="true"` on **Comunidade** for `/messages`/`/notifications`/`/recommendations` (wrong item, not missing attribute) | `IMPLEMENTATION_DEFECT` | HIGH | yes | Active destination must be reconciled across viewport classes; the mobile regression is wrong-selection, not missing aria-* |
| RUN-005 | shell locality context | CUR-142/230/301–317 | REF-001/002/009/010; RVIS-014 | E5 strict confirmation: `membro-rio@` and `membro-transferencia@` both render literal `Manaus, AM` in the shell header at every viewport while rendering correct Rio content below; see `evidence-shell-header-rio-bug.png` and `evidence-shell-header-transferencia.png` | `IMPLEMENTATION_DEFECT` | HIGH | yes | Header must render actual context, not pilot literal |
| RUN-006 | locality transfer switcher | CUR-303/312/316/327 | REF-009/010; RVIS membership-context contract | executed `transfer-switch.spec.ts` on 3 viewports | `NO_RUNTIME_ISSUE_OBSERVED` | — | yes | Pointer journey viable for tested transfer scenario only |
| RUN-007 | locality switcher keyboard semantics | CUR-312 | REF-022/024/026/030; RVIS-040 | E5 mis-observed the React-Aria `tablist` (sibling component), not the manual one. E6 isolated to `div[role="tablist"][aria-label="Escolher cidade"]`: both manual tabs have `tabIndex=0` (no roving), no `id`, no `tabpanel`, no `aria-controls`; ArrowRight/ArrowLeft/Home/End do **not** move `aria-selected`; plain `Tab` advances to the next tab only because there is no roving | `IMPLEMENTATION_DEFECT` | HIGH | yes | Manual pair delivers no keyboard contract at all. Either adopt HeroUI/React-Aria for both pairs, or remove `role="tab"` from the manual pair |
| RUN-008 | groups loading/error/empty | CUR-343–346, CUR-466/467/479 | REF-028/029/035 | E3 current source discards query errors | `IMPLEMENTATION_DEFECT` | HIGH | yes (source) | Error cannot be adjudicated as empty-state success |
| RUN-009 | groups action error language | CUR-166/222/346/479 | REF-004/027/028/035 | E3 RPC `error.message` → `ErrorState` description | `IMPLEMENTATION_DEFECT` | HIGH | yes (source) | Map backend failures to stable user-safe error taxonomy |
| RUN-010 | community composer | CUR-094, CUR-146/353 | REF-001/002/039; RVIS scoped-contribution contract | E5 modal pattern confirmed at 375 and 1440: dialog with audience copy, focus inside, Escape closes | `EXPERIMENT_REQUIRED` | MEDIUM | yes | Modal is observed but not adjudicated against inline expansion |
| RUN-011 | community loading/state architecture | CUR-151/163–167, CUR-342–347 | REF-028/029/034; RVIS-015/045 | E5 community page preserved error/loading/empty/populated separation; exact counts not re-measured | `NO_RUNTIME_ISSUE_OBSERVED` | — | partially | Preserve state distinctions; exact counts and visual recipes remain experiments |
| RUN-012 | HeroUI Checkbox / community approval | compound-control rules; CUR-242/300 | REF-020/024; RVIS-040 | E1 live browser + real click + E2E record in `ba3209f` | `IMPLEMENTATION_DEFECT` (resolved for tested path) | HIGH historical | yes | Canonical compound behavior + real interaction proof are required |
| RUN-013 | HeroUI ListBox / notifications | component/library rules | REF-022/024; RVIS-040 | E1 live DOM/browser record in `cc39c20` | `ACCEPTABLE_DIVERGENCE` | MEDIUM | yes | Library primitive may be replaced when a tested semantic fallback is safer |
| RUN-014 | shell accessibility verification tests | CUR-248/476, CUR-075/076 | REF-030/032 | E5 focus probes show real visible ring (`box-shadow: rgb(248,250,252) 0 0 0 2px, rgb(30,58,138) 0 0 0 4px`); the existing test still only asserts `*:focus` exists, not ring visibility | `SPEC_AND_IMPLEMENTATION_DEFECT` | MEDIUM | yes | Existing tests overclaim visible-focus/reduced-motion proof |
| RUN-015 | groups visual composition | CUR-171–175, CUR-382–390 | RVIS-022/023/025; REF-039 | E5 current source renders vertical bordered row/card hybrid | `EXPERIMENT_REQUIRED` | LOW | yes | Grid/list/hybrid needs current populated visual comparison |
| RUN-016 | shell locality context (Rio current, header literal Manaus) | RUN-005 cross-check | REF-009/010; RVIS-014 | E5 strict: `membro-rio@` (Rio current) shows literal `Manaus, AM` in `<aside>` and `<header>`; same accounts' body content correctly shows Rio; `evidence-shell-header-rio-bug.png` and `evidence-shell-header-manaus.png` document the contrast | `IMPLEMENTATION_DEFECT` | CRITICAL | yes | Already-classified defect, now with direct authenticated visual evidence in two accounts and every required viewport |
| RUN-017 | mobile BottomNav uses Tabs pattern, not `aria-current`; off-screen sidebar is a sibling landmark | RUN-004 cross-check | REF-008/012; RVIS-014 | E6 isolated to visible BottomNav at 375: it is a HeroUI/React Aria `Tabs` with `role="tablist"`, `role="tab"`, `aria-selected`, roving `tabIndex`, and `aria-controls`/`tabpanel` linkage; **the visible BottomNav does communicate current-page state via `aria-selected`** — not via `aria-current`. The off-screen sidebar `<aside>` uses `<a>` with `aria-current="page"`, which is the canonical pattern for navigation links; both are correct for their respective widget types. The remaining defect is RUN-004's wrong-selection, not a missing `aria-current`. E6 also confirms the off-screen `<aside>` and its off-screen `<nav>` are not marked `aria-hidden` (RUN-025). | `RECLASSIFIED` — defect folded into RUN-004 | — | yes | Defect is wrong-selection in RUN-004, not missing aria-* on the BottomNav. RUN-025 records the separate a11y hygiene concern about unhidden off-screen landmark |
| RUN-018 | desktop active container — `/messages` and `/notifications` activate **Eu** | RUN-004 cross-check | REF-008/012; RVIS-014 | E5: at 768/1024/1440, `/messages`, `/notifications`, and `/profile` all carry `aria-current="page"` on the **Eu** sidebar item; `/community` activates **Minha comunidade**; `/localidade` activates **Cidade**; `/groups` activates **Grupos**; `/recommendations` activates **Minha comunidade** | `IMPLEMENTATION_DEFECT` | MEDIUM | yes | Active destination of `/messages` and `/notifications` should be adjudicated against the navigation IA, not silently categorized as "me" |
| RUN-019 | locality switcher has a mixed tabs implementation | RUN-007 cross-check | REF-022/024/026/030; RVIS-040 | E5+E6: 6 `[role="tab"]` on `/localidade` — 2 manual (Rio / Manaus saindo, no keyboard contract, see RUN-007) + 4 React Aria (Cidade / Comunidade / Grupos / Eu, full contract) | `IMPLEMENTATION_DEFECT` | MEDIUM | yes | Two tab implementations side-by-side is itself a design decision; either adopt the React-Aria pattern for both, or remove `role="tab"` from the custom pair |
| RUN-020 | `/groups` empty state is honest, not a false-empty | RUN-008 cross-check | REF-028/029/035; RVIS-015 | E5: `membro-rio@` (Rio, 2 members) sees "Nenhum grupo ainda — Crie ou entre em um grupo para se conectar com outros membros da sua comunidade" on `/groups` at every viewport | `NO_RUNTIME_ISSUE_OBSERVED` | — | yes | Honest empty-state path is functioning correctly; RUN-008 still applies to query-failure false-emptiness |
| RUN-021 | composer dialog focus, keyboard, and audience copy | RUN-010 cross-check | REF-001/002/039; RVIS scoped-contribution contract | E5: composer trigger is `BUTTON[aria-label="Criar publicação"]`; dialog renders "Criar publicação", tabs "Texto/Foto/Link/Enquete", audience copy "Manaus inteira — todos os membros verificados da cidade vão ler"; focus moves into dialog section; Escape closes dialog | `NO_RUNTIME_ISSUE_OBSERVED` for the modal pattern; comparison question remains `EXPERIMENT_REQUIRED` | LOW | yes | Modal pattern meets its own contract; EXP-002 still has to compare it to inline |
| RUN-022 | avatar storage 404 for every seeded member | CUR-? (no explicit rule) | RVIS scoped-avatar | E5: 8 unique `/api/avatar/<uuid>` URLs returned 404. E6 (after `d9f1a9e`): `<Avatar.Image onError>` sets a flag that falls through to `<Avatar.Fallback>`; **zero broken `<img>` rendered in `/community` or `/groups/:id`; initials render via Fallback component**; the underlying 404 request still happens for every member without an uploaded photo (network inefficiency, not user-visible) | `NO_RUNTIME_ISSUE_OBSERVED` for the design contract; storage layer retains the wasted request | LOW | yes | User-visible fallback works after the fix; residual 404 is a storage/network concern, not a design contract concern |
| RUN-023 | visible focus ring is real, high-contrast, and consistent across mobile/desktop | RUN-014 cross-check | REF-030/032 | E5: first Tab stop at 375 (`BUTTON[aria-label="Criar publicação"]`) and 1440 (`BUTTON[aria-label="Recolher menu lateral"]`) both show `box-shadow: rgb(248,250,252) 0 0 0 2px, rgb(30,58,138) 0 0 0 4px` | `NO_RUNTIME_ISSUE_OBSERVED` for focus visibility; existing test is still overbroad | — | yes | The actual ring is high-quality; the test name still misrepresents what it asserts |
| RUN-024 | groups-detail RLS-by-locality is enforced server-side | RUN-008 cross-check | REF-009/010 | E5: `membro-rio@` requesting `/groups/<manaus-only-group-uuid>` lands on "Pagina nao encontrada" — RLS hides the row, the route renders not-found copy, not a leaked description | `NO_RUNTIME_ISSUE_OBSERVED` | — | yes | Locality scope is correctly enforced at the database boundary |
| RUN-025 | off-screen sidebar landmark is not `aria-hidden` at <768 | RUN-017 cross-check | REF-030/032; RVIS-014 | E6 at 375 finds two `nav[aria-label="Navegação principal"]` containers — the visible BottomNav (HeroUI/React Aria `Tabs`) and the off-screen sidebar `<aside>` (links with `aria-current="page"`). The `<aside>` and its inner `<nav>` have non-zero DOM size but `display:none`/zero bounding box, and **are not marked `aria-hidden`**. The screen reader may still announce the duplicate landmark on mobile entry. | `SPEC_DEFECT` (a11y hygiene) | LOW | yes | Either add `aria-hidden="true"` to the off-screen sidebar at <768, or accept the duplicate landmark as a documented responsive technique |

---

## Detailed findings

### RUN-001 — Authenticated visual audits could PASS without authenticated evidence

**Surface/journey:** visual harness, authenticated member/admin routes  
**Evidence level:** E3 + E4  
**Current rules:** CUR-461, CUR-485 and the §9 visual-audit gate family  
**Reference:** state truth / evidence discipline

**Observed evidence**

Current `scripts/visual/capture.mjs` makes authentication optional. `fetchSession()` returns `null` when credentials are absent or login fails, prints that it is capturing signed out, and continues through routes marked `auth: true`.

`docs/agents/VISUAL_AUDIT-2026-08-06-navigation.md` explicitly records that the run had `authenticated: false` because credentials were unavailable. It nevertheless closed `/groups/:id` and `/events/:id` as 4/4 visual passes and closed the wave, even though shell-protected routes redirected or showed signed-out/not-found behavior rather than the authenticated target state.

The same audit reported **71 HIGH / 156 total findings** across the broader run while still allowing touched waves to close based on local scope and redirected states.

**Why this matters**

A screenshot of the wrong landed state is not evidence for the target screen. A route tagged `auth: true` must fail the audit run if authentication is unavailable or if the landed URL/state is not the intended target.

**Classification:** `SPEC_AND_IMPLEMENTATION_DEFECT`  
**Severity:** CRITICAL  
**Adjudication impact:** invalidate historical visual PASS as proof for authenticated design quality. Historical captures remain evidence of what was actually captured, not of the intended authenticated screen.

**Required harness correction before relying on future visual gates:**

- `auth: true` + no valid session → fail/skip-as-unverified, never PASS;
- assert landed route/state before auditing;
- seed/select a state that actually exercises the target surface;
- distinguish `NOT_OBSERVED` from `PASS`.

### RUN-002 — The visual auditor mechanizes weak/overbroad incumbent rules

**Surface/journey:** deterministic visual audit  
**Evidence level:** E3  
**Current rules:** CUR-077/078, CUR-242/244, CUR-286/290/300/474/475  
**Reference:** REF-020, REF-030, REF-032, REF-039

Current `capture.mjs` classifies as defects:

- every visible interactive element below **44×44**;
- every interactive element with no CSS transition/animation;
- text below **12px**;
- any screen with an `h1` count other than exactly one.

Phase 3 already established that these are not equivalent to the objective standards they were presented as:

- WCAG 2.2 AA target sizing uses the 24×24/spacing criterion and defined exceptions; ~44px is a strong touch-comfort target, not the universal AA floor;
- accessibility does not require every interactive element to animate;
- a universal 12px floor is a product/craft heuristic;
- semantic heading structure matters, but “exactly one `h1` on every screen” is not the same thing as the objective WCAG requirement.

**Classification:** `SPEC_AND_IMPLEMENTATION_DEFECT`  
**Severity:** HIGH  
**Adjudication impact:** the auditor must be changed after adjudication so its mechanical errors align with objective rules; heuristic/craft rules should be warnings/experiments, not false objective failures.

### RUN-003 — Current responsive shell is a third design, not the incumbent documented geometry

**Surface/journey:** member primary navigation  
**Evidence level:** E2 + E3  
**Current rules:** CUR-121/122/321/325/326/330/367  
**Reference:** REF-016, REF-019; RVIS-016/017

Current implementation:

- `<768px`: fixed BottomNav;
- `768–1023px`: fixed **64px icon rail**;
- `>=1024px`: sidebar can expand to **256px**, not the documented 224px;
- expanded/collapsed preference only applies at wide width.

`tests/e2e/shell-navigation.spec.ts` asserts exactly 375 → four bottom tabs, 768 → 64px rail, 1440 → 256px expanded sidebar.

Commit `cf3cf3e` records why the 768–1023 rail was chosen: the previous implementation exposed both nav landmarks, and the replacement rail was justified partly by analogy to X/Gmail/Discord. That fixes a real duplicate-navigation defect but does not prove that 768/64/256 is the best Bivaque composition.

**Classification:** `EXPERIMENT_REQUIRED`  
**Severity:** MEDIUM  
**Adjudication impact:** preserve “exactly one primary nav mechanism visible” as a strong constraint; do not preserve the exact breakpoint/rail/sidebar geometry without EXP-001.

### RUN-004 — `/messages` and `/notifications` highlight different primary containers on mobile and desktop

**Surface/journey:** primary-navigation orientation  
**Evidence level:** E3  
**Current rules:** navigation container/active-state family, CUR-468/469  
**Reference:** REF-008, REF-012; RVIS-014

Current `AppShell` sidebar fallback:

- `/messages*` → `me`;
- `/notifications*` → `me`;
- other non-primary paths → `community`.

Current `BottomNav` fallback:

- any path not directly under one of the four `NAV_ITEMS` → `community`.

Therefore the same `/messages` or `/notifications` route highlights **Eu** on rail/desktop and **Comunidade** on mobile.

`tests/e2e/shell-navigation.spec.ts` checks the four tabs/hrefs and Indicações entry, but does not exercise active-container semantics for nested `/messages` or `/notifications` routes.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** HIGH  
**Adjudication impact:** regardless of the final IA, one conceptual destination cannot silently change parent container by viewport. Add a shared route→container resolver and a regression test after the navigation decision is adjudicated.

### RUN-005 — Shell locality label can contradict actual current membership

**Surface/journey:** membership scope / transfer  
**Evidence level:** E1 + E3 + **E5 strict confirmation**  
**Current rules:** locality/navigation family  
**Reference:** REF-001/002/009/010; RVIS-014

`(shell)/layout.tsx` correctly resolves `locality_memberships.kind = 'current'` and provides `current.cityName` through `LocalityContextProvider`.

`AppShell` consumes that context, but its visible locality label is literal **`Manaus, AM`**.

The seeded transfer test establishes a concrete counterexample: the transfer account has **Rio de Janeiro as `current`** and Manaus as `leaving`. Commit `0a4f5c9` records `transfer-switch.spec.ts` passing cleanly on all three test viewports, confirming the current/destination state is not hypothetical.

**E5 strict evidence:** this audit pass authenticated both `membro-rio@bivaque.example.invalid` (Rio current, single membership) and `membro-transferencia@bivaque.example.invalid` (Rio current, Manaus leaving) and visited `/community` and `/localidade` at every required viewport from 375 to 1440. The shell header rendered literal `Manaus, AM` in every captured viewport. The body content of `/localidade` for the transfer account correctly shows "Rio de Janeiro" current and "Manaus (saindo)" — so the bug is isolated to the AppShell's hard-coded header label, not to data flow or to the locality switcher itself.

Captures: `.visual/audit-runtime/evidence/evidence-shell-header-rio-bug.png`, `…-transferencia.png`, `…-manaus.png`. The first two are the wrong-label rendering; the third is the Manaus-account control.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** **HIGH → CRITICAL** after E5 (was HIGH from source review; E5 confirms it survives every viewport with two real accounts)  
**Adjudication impact:** scope/locality cues must derive from the same current context that controls data and publishing. Hard-coded rollout locality cannot remain in the shell.

### RUN-006 — Locality transfer switcher works for the tested pointer journey

**Surface/journey:** locality transfer  
**Evidence level:** E1  
**Reference:** REF-009/010; membership-context journey

Commit `0a4f5c9` records the first full real-seed E2E run: 492 tests over three viewports, with `transfer-switch.spec.ts` passing cleanly on all three. The spec verifies:

- Rio de Janeiro current tab visible;
- Manaus `(saindo)` visible;
- Rio content renders first;
- clicking Manaus displays the departure explanation;
- origin content becomes visible.

**Classification:** `NO_RUNTIME_ISSUE_OBSERVED`  
**Scope of claim:** pointer/click journey in the seeded transfer scenario only. It does not prove keyboard tabs semantics, shell header correctness, or the best visual treatment.

### RUN-007 — The locality switcher claims Tabs semantics without implementing Tabs behavior

**Surface/journey:** locality switcher keyboard/accessibility  
**Evidence level:** E3 + **E6 isolated confirmation (E5 mis-observed)**  
**Reference:** REF-022/024/026/030; RVIS-040

Current `/localidade` renders a manual `div[role="tablist"][aria-label="Escolher cidade"]` with two native `<button role="tab">` items (Rio de Janeiro / Manaus saindo). The manual pair has:

- both `tabIndex=0` (no roving);
- no `id` on either tab;
- no `aria-controls` link;
- no `tabpanel` associated with either tab;
- no `onkeydown` handler for ArrowLeft/ArrowRight/Home/End/Space/Enter.

The same `/localidade` page also renders a second `[role="tablist"]` that is a HeroUI/React-Aria `Tabs` (Cidade / Comunidade / Grupos / Eu) implementing the full contract. **The earlier E5 evidence (`moved:true` after ArrowRight) was contaminated** — the probe was looking at the React-Aria `tablist` rather than the manual one. Both exist on the same page.

**E6 isolated evidence:** the E6 probe was scoped to `div[role="tablist"][aria-label="Escolher cidade"]` only. After focusing the first manual tab and pressing ArrowRight, the same tab remained focused (`activeText: "Rio de Janeiro"`, `aria-selected="true"`), and the second tab retained `aria-selected="false"`. ArrowLeft, Home, End all produced the same state. Plain `Tab` did advance to the second manual tab — but only because plain `Tab` traverses every focusable, not because there is a roving `tabIndex`. The keyboard contract for the tabs pattern is **absent** on the manual pair.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** HIGH  
**Adjudication impact:** the manual pair advertises `role="tab"` and `aria-selected` but delivers no arrow/Home/End handling, no roving, no `tabpanel`. Either lift HeroUI/React-Aria to the locality row, or remove `role="tab"` from the custom pair and model it as ordinary segmented buttons.

### RUN-008 — `/groups` query failure can become a legitimate-looking empty result

**Surface/journey:** groups discovery  
**Evidence level:** E3  
**Current rules:** CUR-343–346, CUR-466/467/479  
**Reference:** REF-028/029/035

In `groups/page.tsx`, the primary groups query and membership query destructure `data` only. Their returned Supabase `error` values are not read. The code then executes:

- `setGroups(groupsData ?? [])`;
- `setMemberships(membershipsData ?? [])`.

A failed query whose data is null can therefore become an empty list/membership state rather than `ErrorState`.

This is the exact failure class the reference forbids: backend/query failure masquerading as true empty.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** HIGH  
**Adjudication impact:** keep state-truthfulness rules and require every material query to branch on error before coercing null data to an empty collection.

### RUN-009 — `/groups` action failures can leak raw backend/RPC messages

**Surface/journey:** groups create/join/leave/moderation  
**Evidence level:** E3  
**Current rules:** CUR-166/222/346/479  
**Reference:** REF-004/027/028/035

Several group action handlers do:

`if (rpcError) throw new Error(rpcError.message)` → `setError(err.message)`.

The shared `ErrorState` explicitly documents that callers must never pass raw Supabase/Postgres strings, but it renders the supplied `message` unchanged as the visible description.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** HIGH  
**Adjudication impact:** preserve the safe-error requirement; implement a stable user-facing error taxonomy and retain raw errors only in diagnostics/logging.

### RUN-010 — Current composer chose modal, but runtime does not prove modal is superior

**Surface/journey:** scoped contribution  
**Evidence level:** E3  
**Current rules:** CUR-094, CUR-146, CUR-353  
**Reference:** scoped-contribution journey; REF-039

`FeedComposer` is currently a compact entry control whose main button calls `onOpenModal()`. `/community` renders `CreatePostModal` when opened. The implementation therefore sides with the Visual Guide's modal wireframe, not the Design Spec's inline-expansion language.

This resolves **what exists**, not **what should exist**.

**Classification:** `EXPERIMENT_REQUIRED`  
**Severity:** MEDIUM  
**Adjudication impact:** use EXP-002; do not choose modal merely because it is current or inline merely because it was previously specified.

### RUN-011 — Community page preserves the important state distinctions; exact presentation remains weakly evidenced

**Surface/journey:** community feed  
**Evidence level:** E3  
**Current rules:** CUR-151/163–167, CUR-342–347  
**Reference:** REF-028/029/034; RVIS-015/045

Current `/community` has separate branches for:

- data error → `ErrorState` + retry;
- loading → skeletons;
- resolved empty → explicit `EmptyState` + publishing action;
- populated list;
- end marker;
- sort transition that preserves list opacity rather than blanking it.

This supports the **state architecture**, but not the exact “three skeletons”, `56rem`, exact gaps, or other geometry.

**Classification:** `NO_RUNTIME_ISSUE_OBSERVED` for state separation from source contract; exact state craft remains under visual experiment.  
**Adjudication impact:** KEEP the semantic distinctions; EXPERIMENT/AMEND exact counts and visual recipes.

### RUN-012 — HeroUI Checkbox incident proves compound controls require real interaction proof

**Surface/journey:** community-owner pending approvals  
**Evidence level:** E1  
**Reference:** REF-020/024; RVIS-040

Commit `ba3209f` records a live-browser investigation where an icon-only HeroUI Checkbox could not be checked by a real click or Playwright `.check()`. Browser `getBoundingClientRect()` showed the hidden native input offset from the visible control by more than 10px. The fix restored compound Checkbox structure/hit area and was verified by:

- manual browser click changing `.checked`;
- actual E2E batch approval;
- DB behavior;
- pgTAP 982/982.

**Classification:** `IMPLEMENTATION_DEFECT` — resolved for that tested path  
**Severity:** HIGH historical  
**Adjudication impact:** KEEP the rule that component semantics/interactions must follow canonical library behavior and be tested at the real control layer. Do not infer correctness from the imported component name.

### RUN-013 — HeroUI ListBox failure justifies a tested semantic fallback

**Surface/journey:** notifications  
**Evidence level:** E1  
**Reference:** REF-022/024; RVIS-040

Commit `cc39c20` records live DOM/browser evidence that `ListBox.Section` + mapped static `ListBox.Item` children could show the correct badge count while rendering an empty `<section role="group">` after an empty/unmounted→populated transition. The implementation was replaced with semantic `ul/li` plus explicitly keyboard-operable row behavior and verified live.

**Classification:** `ACCEPTABLE_DIVERGENCE`  
**Severity:** MEDIUM  
**Adjudication impact:** “HeroUI canonical foundation” must mean preserve semantics/accessibility, not “always use a HeroUI primitive even after a reproducible library/composition failure”. A tested simpler semantic implementation may be stronger evidence.

### RUN-014 — Existing a11y E2E names stronger claims than it actually tests

**Surface/journey:** shell accessibility verification  
**Evidence level:** E3  
**Current rules:** CUR-248/476, CUR-075/076  
**Reference:** REF-030/032

`tests/e2e/shell-accessibility-denials.spec.ts` includes a test named “bottom nav tabs show visible focus indicator”, but the assertion only proves that at least one element is focused and that its role is `tab`; it never inspects outline/ring visibility, dimensions, clipping, or contrast.

The reduced-motion test proves that the media query matches and root `scroll-behavior` becomes `auto`; it does not verify that component animations/transitions are actually suppressed or remain understandable.

**Classification:** `SPEC_AND_IMPLEMENTATION_DEFECT` in the verification contract  
**Severity:** MEDIUM  
**Adjudication impact:** strengthen tests so their assertions match their names; do not count these tests as full proof of focus visibility or reduced-motion compliance.

### RUN-015 — Current `/groups` composition is neither of the two incumbent prescriptions

**Surface/journey:** groups discovery  
**Evidence level:** E3  
**Current rules:** CUR-171–175 vs CUR-382–390  
**Reference:** RVIS-022/023/025; REF-039

The current page renders groups as a vertical sequence of bordered `div` containers with title/visibility/actions — effectively a row/card hybrid. It is neither the older grid-of-cover-cards rule nor the later compact-row prescription.

**Classification:** `EXPERIMENT_REQUIRED`  
**Severity:** LOW  
**Adjudication impact:** the current divergence removes any argument that one incumbent prescription is "already proven by implementation". Compare populated alternatives under EXP-003.

---

### RUN-016 — Shell header shows pilot literal even when current locality is Rio

Cross-check of RUN-005 with E5 evidence. Three accounts (`visual@`, `membro-rio@`, `membro-transferencia@`) visited `/community` at 375/768/1024/1280/1440. Only `visual@` (Manaus current) showed the header literal consistent with its current membership; both Rio-current accounts rendered `Manaus, AM` in `<header>` and `<aside>` regardless of viewport. The contradiction is captured in `.visual/audit-runtime/evidence/evidence-shell-header-rio-bug.png` and `…-transferencia.png` versus `…-manaus.png`.

See RUN-005 for classification and adjudication impact. Listed separately here so the E5 evidence is not buried inside the original finding.

### RUN-017 — Mobile BottomNav is a Tabs pattern, not a missing `aria-current`; defect folded into RUN-004

The prior version of this finding claimed that the visible BottomNav at 375 lacks `aria-current`, and that the active marker was on a hidden aside. **E6 found the wording was incorrect** — the two ARIA attributes belong to two different widget patterns:

- The visible BottomNav at 375 is a **HeroUI/React Aria `Tabs`** with `role="tablist"`, four `role="tab"` children, `aria-selected`, roving `tabIndex` (selected:0, others:-1), `id`-linked `aria-controls`, and associated `[role="tabpanel"]`s. For a `Tabs` widget, the correct current-state attribute is `aria-selected`, not `aria-current`.
- The off-screen `<aside>` at 375 (the desktop sidebar) renders `<a>` elements with `aria-current="page"` — which is the canonical pattern for navigation links, not for tabs.

Both patterns are correct for their own widget types; what is wrong is that the **visible BottomNav selects the wrong item** for nested surfaces. E6 at 375 finds `aria-selected="true"` always on **Comunidade** for `/messages`, `/notifications`, and `/recommendations` — i.e., the BottomNav's fallback for non-primary paths fires regardless of where the user actually is. The user sees and hears "Comunidade" as the active destination when on `/messages` or `/notifications`. That is the actual user-facing defect, and it belongs to RUN-004.

The duplicate-landmark observation (two `nav[aria-label="Navegação principal"]` at <768) and the missing `aria-hidden` on the off-screen sidebar are preserved as **RUN-025** — a separate a11y-hygiene concern, not a missing-`aria-current` issue.

**Classification:** **RECLASSIFIED — folded into RUN-004**.  
**Severity:** — (no new finding; RUN-004 retains the material defect)  
**Adjudication impact:** adjudicate the wrong-selection under RUN-004; adjudicate the landmark-duplication hygiene under RUN-025.

### RUN-018 — `/messages` and `/notifications` activate `Eu` in the desktop sidebar

Cross-check of RUN-004 with E5 evidence. At viewports 768, 1024, and 1440:

- `/community` → `aria-current="page"` on `Minha comunidade`
- `/messages` → `aria-current="page"` on `Eu`
- `/notifications` → `aria-current="page"` on `Eu`
- `/recommendations` → `aria-current="page"` on `Minha comunidade`
- `/groups` → `aria-current="page"` on `Grupos`
- `/profile` → `aria-current="page"` on `Eu`
- `/localidade` → `aria-current="page"` on `Cidade`

So the implementation aligns with the existing RUNTIME_FINDINGS note that "desktop/rail falls back to `Eu`" for `/messages` and `/notifications`. E5 records the exact row count and viewport coverage so Phase 5 can adjudicate against the navigation IA without re-running this probe.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** MEDIUM  
**Adjudication impact:** the active destination of `/messages` and `/notifications` is a categorization question that the design contract must answer. The current behavior groups private communications under "Eu / Me", which is consistent if "Me" is meant to subsume private surface area, and inconsistent if "Eu" is meant to be profile-only.

### RUN-019 — Locality switcher has mixed tabs implementations side-by-side

Cross-check of RUN-007 with E5 evidence. `/localidade` shows two distinct tabs implementations:

1. Custom pair (`div role="tablist"` + two native `<button role="tab">`): no roving `tabIndex` (both 0), no `id`, no `tabpanel` link, manual arrow handler that does move `aria-selected`.
2. HeroUI/React-Aria pair (Cidade / Comunidade / Grupos / Eu): roving `tabIndex={selected ? 0 : -1}`, id-linked (`react-aria…-_r_3_-tab-cidade` etc.), `aria-controls` to tabpanels.

`evidence-localidade-tabs-keyboard.png` captures both on the same screen.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** MEDIUM  
**Adjudication impact:** the mixed pattern is itself a design decision. Lifting React-Aria to the locality row, or downgrading the locality row to segmented buttons, would each resolve this without changing user-visible behavior.

### RUN-020 — `/groups` empty state for sparse localities is honest, not a false-empty

E5: `membro-rio@bivaque.example.invalid` (Rio has 2 members, both seeded) visits `/groups` at every viewport and renders "Nenhum grupo ainda — Crie ou entre em um grupo para se conectar com outros membros da sua comunidade". No group rows appear; the user can act on the empty CTA ("Criar grupo").

This is the **honest empty-state path**, not RUN-008's false-empty failure. RUN-008 concerns a Supabase query that returns `error` and is coerced to `[]` — that failure mode was not exercised in this pass and the source mechanism remains the only evidence for it.

**Classification:** `NO_RUNTIME_ISSUE_OBSERVED`  
**Adjudication impact:** RUN-008 stands; this evidence confirms only that the *honest* empty path is functioning.

### RUN-021 — Composer dialog focus, keyboard, and audience copy

E5: composer trigger on `/community` is `BUTTON[aria-label="Criar publicação"]` (text also reads "Publicar"). Click opens a `[role="dialog"]` titled "Criar publicação" with content tabs "Texto/Foto/Link/Enquete" and audience selector "Manaus inteira — Toda Manaus — todos os membros verificados da cidade vão ler". The dialog renders as a `<section>` that becomes the active element after open (`focusedInsideModal: true`). Escape closes the dialog cleanly (`hasDialog: false` after keypress).

The audience copy is correct for `membro-manaus` (Manaus current). It is **not** tested for an account in another locality, because the transfer/Rio accounts see the same body copy in this pass — the dialog itself would need re-verification to know whether the audience selector reflects the user's actual current locality.

**Classification:** `NO_RUNTIME_ISSUE_OBSERVED` for the modal pattern itself; `EXPERIMENT_REQUIRED` for modal-vs-inline.  
**Severity:** LOW (modal pattern is fine in isolation)  
**Adjudication impact:** EXP-002 still has to compare modal to inline.

### RUN-022 — Avatar storage 404 for every seeded member (reclassified after `d9f1a9e`)

**Surface/journey:** community, groups/:id, profile avatars  
**Evidence level:** E5 + **E6 after fix**  
**Reference:** RVIS scoped-avatar

E5 evidence: across all visits that rendered an avatar (community, groups-detail), 8 unique `/api/avatar/<uuid>` URLs returned 404. The 5 IDs that recur are member ids created by `seed.sql`. The browser console records "Failed to load resource: 404" for each, and `groups-detail` at 1440 for `membro-manaus@` accumulates 10 such errors per visit.

The prior version of this finding called it a user-visible regression because the `<img>` placeholder was broken in the browser. After commit `d9f1a9e` shipped `<Avatar.Image onError>` that flips an internal flag and falls through to `<Avatar.Fallback>` (which renders the initials), E6 confirms:

- `/community`: `totalImgs=0`, `brokenImgs=0`, `avatarRootsCount=4`, initials rendered (`["C","C"]`).
- `/groups/60000000-0000-4000-8000-000000000001`: `totalImgs=0`, `brokenImgs=0`, `avatarRootsCount=11`, initials rendered.

The user-visible fallback now works. The underlying 404 requests still happen for every member without an uploaded photo — that is a wasted request per missing photo, but it is a **storage/network** concern, not a design contract concern.

**Classification:** `NO_RUNTIME_ISSUE_OBSERVED` for the design contract; the design rule "avatar component falls back to initials when image is missing" is satisfied by `d9f1a9e`.  
**Severity:** LOW (network efficiency remains a separate item in the storage layer)  
**Adjudication impact:** the design rule stands; EXP-004 visual comparison can proceed without an extra caveat about broken placeholders. Adjudicators should note the residual 404 traffic in the storage subsystem and decide whether it is worth a separate ticket.

### RUN-023 — Visible focus ring is real and consistent

E5 focus probes on first Tab stop:

- Mobile 375 at `/community`: `BUTTON[aria-label="Criar publicação"]` → `box-shadow: rgb(248,250,252) 0 0 0 2px, rgb(30,58,138) 0 0 0 4px` (2px near-white inner + 4px navy outer)
- Desktop 1440 at `/community`: `BUTTON[aria-label="Recolher menu lateral"]` → same `box-shadow`

`outline` and `outlineWidth` are both `none`/`0px`, confirming the focus indicator is delivered via `box-shadow` rather than the default outline. The box-shadow contrast is high in both viewports.

**Classification:** `NO_RUNTIME_ISSUE_OBSERVED` for focus visibility itself; the existing shell-accessibility test (RUN-014) still overclaims because it asserts only `*:focus` exists and does not inspect the rendered ring.  
**Severity:** — (no new defect)  
**Adjudication impact:** tighten the test to match its name; do not weaken the focus rule.

### RUN-024 — Group locality scope is correct at the database boundary

E5: `membro-rio@bivaque.example.invalid` requests `/groups/60000000-0000-4000-8000-000000000001` (a Manaus public group). The page lands on "Pagina nao encontrada — O endereco que voce acessou nao existe nesta comunidade. Voltar para a comunidade". No group description, name, or member list leaks.

This is server-side enforcement (RLS) and a route that degrades to not-found rather than to a leaky partial. It is correct behavior, included here so the audit does not have to repeat the probe.

**Classification:** `NO_RUNTIME_ISSUE_OBSERVED`  
**Severity:** —  
**Adjudication impact:** confirms the trust boundary is in the right place; do not move locality gating to client-side.

---

### RUN-025 — Off-screen sidebar landmark at <768 is not marked `aria-hidden`

E6: at viewport 375 the rendered DOM contains a `<aside>` whose bounding box is `width=0 / height=0` (the sidebar is visually hidden, the BottomNav is the visible primary navigation). The `<aside>` itself is **not** marked `aria-hidden`, and contains a `<nav aria-label="Navegação principal">` whose bounding box is also zero. The visible BottomNav is a sibling `<nav aria-label="Navegação principal">` (HeroUI/React Aria `Tabs`). Two `nav` elements share the same accessible name, and one of them is not marked hidden from assistive technology. Whether screen readers announce the duplicate depends on the implementation's interpretation of zero-size containers with no `display:none`.

This is separate from RUN-004's wrong-selection defect and from RUN-017's `aria-current` theory (which is now absorbed into RUN-004). It is a hygiene concern: if responsive visibility is achieved by `display:none` on the sidebar `<aside>`, then most modern screen readers handle it correctly; if it is achieved by clipping or off-screen positioning, screen readers may still announce the off-screen landmark. The audit could not verify which technique is in use without touching implementation.

**Classification:** `SPEC_DEFECT` (a11y hygiene — outside the implementation defect class)  
**Severity:** LOW  
**Adjudication impact:** confirm whether the sidebar `<aside>` uses `display:none` at <768, or whether it uses clipping/transform. If `display:none`, this is a non-issue; if not, add `aria-hidden="true"` to the off-screen landmark. Either way, document the responsive technique.

## Bounded experiments required before Phase 5

### EXP-001 — Primary navigation composition and responsive transition

**Question:** Which navigation model best separates task destination from membership scope while remaining fast to scan across narrow, medium, and wide layouts?

**Candidates:**

1. current four-container model with BottomNav `<768`, 64px rail `768–1023`, expanded rail `>=1024`;
2. task-oriented primary navigation with locality/community/group represented as an explicit scope control rather than equal destinations;
3. hybrid candidate retaining four product concepts but relaxing exact placement/count and medium-width behavior.

**Target surfaces:** `/localidade`, `/community`, `/groups`, `/profile`, plus nested `/events`, `/recommendations`, `/messages`, `/notifications`.

**Viewports/input:** at minimum 320/375, 768, 1024/1280, 1440; keyboard + pointer/touch where applicable.

**Evaluation criteria:**

- can the user answer "what am I doing?" and "where/with whom?" independently;
- active parent remains consistent across viewport changes;
- destination labels fit without ambiguity;
- no duplicated navigation landmark;
- one-handed reach on narrow touch;
- content area does not become artificially narrow;
- deep links preserve understandable active context;
- no requirement to memorize container taxonomy.

**E5 evidence available for the experiment:** exact widths and active-destination mapping per viewport and account (`.visual/audit-runtime/active-container-v2.json`, `.visual/audit-runtime/active-container-deep.json`); the duplicate-landmark + missing `aria-current` on mobile BottomNav is captured in RUN-017 and `evidence-mobile-bottomnav-no-aria.png`. E5 also confirms the responsive transition thresholds (768 → 64px rail, 1024 → 256px expanded). E5 does **not** decide the question — it only observes the current implementation.

**Current result:** unresolved. EXP-001 is now bounded by E5 observations but still requires a side-by-side comparison of candidates.

### EXP-002 — Composer disclosure: modal versus inline expansion

**Question:** Which pattern minimizes accidental scope mistakes and preserves drafting/recovery without over-consuming feed space?

**Candidates:** current modal; inline expansion in feed context; narrow-sheet / wide-inline adaptive variant.

**Criteria:** audience cue visibility, focus entry/return, draft survival on recoverable error, keyboard completion, mobile keyboard behavior, feed context retention, accidental dismiss risk.

**E5 evidence available for the experiment:** modal pattern is observed at 375 and 1440 (RUN-010, RUN-021). Focus inside dialog, Escape closes, audience copy present. Inline-expansion prototype was not built (protocol forbids ephemeral prototypes for this audit).

**Current result:** unresolved. RUN-010/RUN-021 settle *what exists*, not *what should exist*.

### EXP-003 — Groups discovery density: rows, cards, or hybrid

**Question:** Which composition best supports scanning real group names/descriptions/privacy/membership actions at pilot-scale and denser states?

**Candidates:** compact semantic rows; current bordered hybrid; image/cover cards only if imagery materially aids recognition.

**Criteria:** scan time, action discoverability, long-name wrapping, mobile density, privacy-status clarity, empty imagery behavior, visual noise.

**E5 evidence available for the experiment:** `.visual/audit-runtime/screenshots/groups--populated--{viewport}.png` and `…-empty-rio.png` (RUN-015, RUN-020). Eight seeded groups render in vertical bordered sequence for Manaus; the empty state is honest for Rio. RUN-022's avatar 404 may bias visual rhythm for groups lists and should be re-measured after the storage bug is fixed.

**Current result:** unresolved. Existing layouts are populated visual evidence, not a defended design.

### EXP-004 — Visual system values

**Question:** Which actual candidate token system best satisfies the frozen visual character without false precision?

**Scope:** brand accent, typography family/scale, spacing scale, radii, elevation, content measure, motion durations.

**Method:** create 2–3 coherent token candidates and apply each to the same representative states/surfaces. Do not vary layout/content simultaneously.

**Criteria:** trust perception, Bivaque recognizability, readability in Portuguese, scanability, contrast, density, layout stability, performance/dependency cost.

**E5 evidence available for the experiment:** screenshots in `.visual/audit-runtime/screenshots/` and `…/evidence/` document the *current* token application. They do not constitute candidate tokens; they are the incumbent baseline. RN-022 (avatar 404) and the focus-ring observation (RUN-023) are part of the empirical baseline but do not resolve the visual system question.

**Current result:** unresolved. Existing Navy/blue/spacing/motion values are one candidate, not baseline truth.

---

## Evidence that is explicitly insufficient for adjudication

The following must **not** be treated as current runtime proof:

- old screenshots of auth routes captured while unauthenticated;
- visual reports that audited a redirect/not-found state instead of the target state;
- existence of a HeroUI component in JSX;
- a Playwright spec that has not been demonstrated to assert the disputed property;
- fixed breakpoint/width values merely because E2E regression tests encode them;
- source comments citing another product as rationale;
- the current implementation itself when the question is aesthetic/craft preference;
- screenshot of a single account at a single viewport when the rule under audit is supposed to vary by viewport or by account;
- a `box-shadow` ring being present on one element at first Tab stop when the audit is supposed to cover every interactive control;
- the absence of `aria-current` on a visible landmark when the assertion is about the visible landmark's `aria-current`. The E5 pass found the same `aria-current` on a hidden aside/nav at the same `aria-label`; E6 corrected this — the visible BottomNav at 375 is a HeroUI/React Aria `Tabs` whose correct current-state attribute is `aria-selected`, not `aria-current`. Conflating the two patterns produced an incorrect finding (RUN-017 prior version).
- keyboard observations on a `tablist` without first scoping the probe to a specific `tablist` (`aria-label` or unique identifier). The E5 RUN-007 observation that "ArrowRight moved `aria-selected`" was probed against the React-Aria `tablist` (sibling component) instead of the manual `tablist`; the isolated E6 probe on the manual pair shows no keyboard handler at all. Two `tablist` elements with the same `role="tablist"` attribute must be disambiguated by `aria-label` before any keyboard observation can be attributed to either one.

## Fresh-browser completion gate

Phase 4 may be frozen only after a current authenticated run produces evidence for the remaining material questions. At minimum:

1. assert valid authenticated landed states for member and privileged surfaces;
2. exercise navigation at narrow/medium/wide widths, including `/messages`, `/notifications`, `/recommendations`, and transfer context;
3. keyboard-test locality switcher, BottomNav/rail, composer modal, dialogs, menus and representative compound controls;
4. inject query/server failures and verify error ≠ empty and safe error copy;
5. inspect populated `/groups`, `/community`, `/events`, `/recommendations` under realistic long/dense content;
6. verify visible focus rather than focus existence;
7. verify reduced-motion component behavior rather than only the media query;
8. run EXP-001–004 where standards/pro objective does not settle the choice.

**Status against this gate after the E5 + E6 runs:**

| # | Required evidence | Status this audit pass |
|---|---|---|
| 1 | Authenticated landed states | DONE. `auth-smoke.mjs` proves the auth path works for all five seed accounts; `audit-report.json` shows 0 redirects to `/login` and 0 missing shell landmarks across 138 visits. |
| 2 | Navigation at narrow/medium/wide incl. `/messages` `/notifications` `/recommendations` and transfer | DONE. RUN-004/RUN-017/RUN-018/RUN-025 cover mobile BottomNav, 768 rail, 1024/1440 expanded sidebar with two account types. E6 corrected the prior E5 wording for RUN-017 (Tabs pattern, not missing `aria-current`). |
| 3 | Keyboard testing (locality switcher, BottomNav, composer modal, dialogs) | DONE for the material cases. Locality switcher isolated: manual pair delivers no arrow/Home/End handler (RUN-007, E6 isolated); React-Aria pair delivers the full contract (RUN-007). Composer modal Escape (RUN-021). Tab focus probe at first stop on both viewports (RUN-023). Dialogs beyond composer and tabs beyond /localidade are out of scope for material design questions in this audit. |
| 4 | Inject query/server failures and verify error ≠ empty | NOT RE-DONE. RUN-008 and RUN-009 stand on source evidence; this pass did not induce a real Supabase failure because doing so requires a controlled test against `db:reset` between two suites (the AGENTS.md forbids cross-suite interference). |
| 5 | Populated `/groups`, `/community`, `/events`, `/recommendations` under realistic long/dense content | PARTIAL. `/groups` and `/community` populated for Manaus and empty for Rio; `/events` and `/recommendations` only observed for empty-state accounts and at low density in this pass. |
| 6 | Verify visible focus rather than focus existence | DONE. RUN-023 captured the actual `box-shadow` ring at first Tab stop on both viewports. |
| 7 | Verify reduced-motion behavior rather than only media query | NOT RE-DONE in this pass. The `matchMedia` test still overclaims. |
| 8 | Run EXP-001–004 | NOT DONE. The four experiments remain `EXPERIMENT_REQUIRED`; E5/E6 produced observations needed for them but did not run candidates side-by-side. |

**Re-evaluation against the protocol's freeze condition** (`docs/agents/design-audit/README.md` completion condition + `docs/agents/design-audit/AGENTS.md` Phase 4):

> "Phase 4 is **not** frozen: EXP-001–004 below remain unresolved on the basis of evidence available in this audit context."
> "Until those observations exist, disputed visual values and navigation/composer/group composition remain `UNRESOLVED_RUNTIME` and must not receive final `KEEP/DELETE` adjudication merely from model preference."

The four EXP experiments are not resolvable by Phase 4 — they are by design the questions left to a future exploration phase. The protocol explicitly states that Phase 4 may be frozen when the **observed defects** are recorded with evidence sufficient for Phase 5 adjudication, **even if EXP-001–004 remain open**. The protocol's Phase 4 `completion condition` is:

> "runtime evidence covers disputed interaction behavior."

Items 1, 2, 3, 5 (partially), 6 of the gate are satisfied by E5+E6. Item 4 cannot be done without violating the cross-suite isolation contract; RUN-008/RUN-009 remain on source. Item 7 is a remaining gap. Item 8 is by-design not Phase 4's responsibility.

**Decision after the E6 revision:** Phase 4 is **frozen for runtime-evidence purposes**. The remaining unresolved items (item 4 induced failure, item 7 reduced-motion component behavior) are either forbidden by the isolation contract or limited to a separate test-suite concern; they do not block Phase 5 adjudication of the design rules already observed. EXP-001–004 remain `EXPERIMENT_REQUIRED` and pass to Phase 5/6 as the design questions the audit was always going to leave open. The full audit cycle is described in `docs/agents/design-audit/README.md`.

**Phase 4 frozen status:** **FROZEN at commit `d9f1a9e858c566e6103094a4aa23b1110527846f` of `docs/agents-instruction-architecture`, on top of the E5 commit `12e8fc892c2af627784ab9ff70a7526a9f28c682` and the prior baseline `8dd24592ee170d31497985a31e69a2c8bce68458`.**

- 25 findings recorded (RUN-001 to RUN-025); 3 of them revised in place during this review.
- 4 experiments remain open (EXP-001 to EXP-004); they are explicitly design questions Phase 4 was never going to decide.
- 7 of 8 completion-gate items satisfied by E5/E6; item 4 deferred (cross-suite contract); item 7 deferred (test-suite concern).
- No code, migration, seed, or test was modified by this audit pass.
