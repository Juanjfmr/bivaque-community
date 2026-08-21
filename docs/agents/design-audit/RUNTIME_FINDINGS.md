# RUNTIME_FINDINGS — empirical design evidence

> **Status: PHASE 4 IN PROGRESS — EMPIRICAL BASELINE RECORDED / CURRENT VISUAL EXPERIMENT RUN PENDING.**
>
> This artifact records runtime/browser evidence already present in the current branch ancestry, current E2E evidence, and current implementation mechanisms needed to explain observed behavior. It does **not** claim that a fresh browser session was run from this audit context. No currently accessible authenticated preview/runtime was available to this auditor, so visual/craft questions that require a fresh comparative browser run remain explicitly unresolved.
>
> Phase 4 is therefore **not frozen** and Phase 5 adjudication must not treat the unresolved experiments below as settled.

## Evidence posture

Runtime evidence is ranked here as:

- **E1 — direct browser/E2E evidence on current implementation ancestry:** a committed run or incident record states the observed browser behavior and the branch contains the resulting implementation;
- **E2 — current Playwright/runtime contract:** a test exercises the rendered application, but this audit did not re-run it now;
- **E3 — deterministic current-source mechanism:** current source is sufficient to show what the implementation will do, but a fresh browser reproduction is still preferred before final adjudication when interaction/layout is material;
- **E4 — historical visual capture/audit:** useful to assess prior behavior or the quality of the audit mechanism, but not proof of current visual quality.

Current-source inspection is used to explain mechanisms, not to upgrade an unobserved interaction into browser evidence.

## Executive findings

1. **The prior visual gate is not trustworthy as proof for authenticated surfaces.** Its runner permits missing auth and older audit records closed authenticated waves while explicitly capturing signed-out/redirected states.
2. **The executable visual auditor enforces several rules that Phase 3 already found overbroad:** universal 44×44 targets, mandatory transition/animation on every interactive control, 12px minimum text, and exactly one `h1`.
3. **The shipped responsive shell is not the incumbent documented geometry.** It is bottom nav `<768`, 64px rail `768–1023`, and 256px expanded sidebar `>=1024`. Tests prove the implementation choice, not that it is the best choice.
4. **Navigation state is internally inconsistent across viewport classes** for `/messages` and `/notifications`: desktop/rail falls back to `Eu`; mobile BottomNav falls back to `Comunidade`.
5. **The shell can display the wrong locality.** The server resolves the actual current locality, but the header renders literal `Manaus, AM`; a real seeded transfer journey has Rio de Janeiro as current and Manaus as outbound.
6. **The locality switcher pointer journey is empirically working across the three existing E2E viewports**, but its custom `role="tab"` implementation does not implement the canonical tabs keyboard contract.
7. **`/groups` can turn query failure into false emptiness** because two core queries discard their returned `error` values and coerce missing data to `[]`.
8. **`/groups` can surface raw Supabase/Postgres RPC messages through the shared `ErrorState`**, contradicting both reference and incumbent error-language rules.
9. **HeroUI presence is demonstrably not runtime proof.** Checkbox and ListBox incidents both required live-browser investigation; one was fixed by restoring the compound interaction structure, while the other justified a semantic non-HeroUI fallback.
10. **Current composer behavior chooses modal, not inline expansion.** Runtime/source settles what exists, but not which design is superior; this remains a bounded experiment.

## Finding table

| Runtime ID | Surface | Related current rule(s) | Reference rule(s) | Evidence | Classification | Severity | Reproducible? | Adjudication impact |
|---|---|---|---|---|---|---|---|---|
| RUN-001 | visual harness / authenticated routes | CUR-461, CUR-485 | REF-028/029; evidence protocol | `capture.mjs` permits null auth; 2026-08-06 audit closed auth surfaces while explicitly unauthenticated | `SPEC_AND_IMPLEMENTATION_DEFECT` | CRITICAL | yes | Old visual PASS verdicts cannot prove authenticated-screen quality |
| RUN-002 | visual harness / mechanical standards | CUR-077/078, CUR-242/244, CUR-286/290/300/474/475 | REF-020/030/032/039 | current `capture.mjs` implementation | `SPEC_AND_IMPLEMENTATION_DEFECT` | HIGH | yes | Rewrite gate rules before using them as normative enforcement |
| RUN-003 | member shell responsive navigation | CUR-121/122/321/325/326/330/367 | REF-016/019; RVIS-016/017 | current source + `shell-navigation.spec.ts` | `EXPERIMENT_REQUIRED` | MEDIUM | yes | Do not preserve 768/64/256 geometry as final truth without comparison |
| RUN-004 | shell active navigation | CUR-301–331, CUR-468/469 | REF-008/012; RVIS-014 | deterministic AppShell vs BottomNav fallback logic | `IMPLEMENTATION_DEFECT` | HIGH | yes | Active destination must be reconciled across viewport classes |
| RUN-005 | shell locality context | CUR-142/230/301–317 | REF-001/002/009/010; RVIS-014 | server locality context + literal shell copy + transfer E2E evidence | `IMPLEMENTATION_DEFECT` | HIGH | yes | Header must render actual context, not pilot literal |
| RUN-006 | locality transfer switcher | CUR-303/312/316/327 | REF-009/010; RVIS membership-context contract | executed `transfer-switch.spec.ts` on 3 viewports | `NO_RUNTIME_ISSUE_OBSERVED` | — | yes | Current pointer journey is viable for tested transfer scenario only |
| RUN-007 | locality switcher keyboard semantics | CUR-312 | REF-022/024/026/030; RVIS-040 | current custom `role=tab` source; no canonical arrow-key handling | `IMPLEMENTATION_DEFECT` | HIGH | likely | Replace with canonical tabs or use simpler button semantics; fresh keyboard run required |
| RUN-008 | groups loading/error/empty | CUR-343–346, CUR-466/467/479 | REF-028/029/035 | current `groups/page.tsx` discards query errors and coerces data to `[]` | `IMPLEMENTATION_DEFECT` | HIGH | yes | Error cannot be adjudicated as empty-state success |
| RUN-009 | groups action error language | CUR-166/222/346/479 | REF-004/027/028/035 | RPC `error.message` → state → `ErrorState` description | `IMPLEMENTATION_DEFECT` | HIGH | yes | Map backend failures to stable user-safe error taxonomy |
| RUN-010 | community composer | CUR-094, CUR-146/353 | REF-001/002/039; RVIS scoped-contribution contract | current `FeedComposer` opens `CreatePostModal` | `EXPERIMENT_REQUIRED` | MEDIUM | yes | Current modal does not settle modal vs inline design choice |
| RUN-011 | community loading/state architecture | CUR-151/163–167, CUR-342–347 | REF-028/029/034; RVIS-015/045 | current community source distinguishes error/loading/empty/populated | `NO_RUNTIME_ISSUE_OBSERVED` | — | partially | Preserve state distinctions; exact counts/geometry remain experiments |
| RUN-012 | HeroUI Checkbox / community approval | compound-control rules; CUR-242/300 | REF-020/024; RVIS-040 | live browser + real click + E2E record in `ba3209f` | `IMPLEMENTATION_DEFECT` (resolved for tested path) | HIGH historical | yes | Canonical compound behavior + real interaction proof are required |
| RUN-013 | HeroUI ListBox / notifications | component/library rules | REF-022/024; RVIS-040 | live DOM/browser record in `cc39c20` | `ACCEPTABLE_DIVERGENCE` | MEDIUM | yes | Library primitive may be replaced when a tested semantic fallback is safer |
| RUN-014 | shell accessibility verification tests | CUR-248/476, CUR-075/076 | REF-030/032 | current `shell-accessibility-denials.spec.ts` | `SPEC_AND_IMPLEMENTATION_DEFECT` | MEDIUM | yes | Existing tests overclaim visible-focus/reduced-motion proof |
| RUN-015 | groups visual composition | CUR-171–175, CUR-382–390 | RVIS-022/023/025; REF-039 | current source uses vertical bordered row/card hybrid | `EXPERIMENT_REQUIRED` | LOW | yes | Grid/list/hybrid needs current populated visual comparison |

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
**Evidence level:** E1 + E3  
**Current rules:** locality/navigation family  
**Reference:** REF-001/002/009/010; RVIS-014

`(shell)/layout.tsx` correctly resolves `locality_memberships.kind = 'current'` and provides `current.cityName` through `LocalityContextProvider`.

`AppShell` consumes that context, but its visible locality label is literal **`Manaus, AM`**.

The seeded transfer test establishes a concrete counterexample: the transfer account has **Rio de Janeiro as `current`** and Manaus as `leaving`. Commit `0a4f5c9` records `transfer-switch.spec.ts` passing cleanly on all three test viewports, confirming the current/destination state is not hypothetical.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** HIGH  
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
**Evidence level:** E3; fresh keyboard browser confirmation pending  
**Reference:** REF-022/024/026/030; RVIS-040

Current `/localidade` renders:

- `div role="tablist"`;
- two native buttons with `role="tab"` and `aria-selected`;
- no roving `tabIndex`;
- no ArrowLeft/ArrowRight/Home/End handling;
- no `tabpanel` association;
- no HeroUI/React Aria `Tabs` primitive.

The existing E2E clicks the origin tab but does not test the canonical keyboard pattern.

**Classification:** `IMPLEMENTATION_DEFECT`  
**Severity:** HIGH  
**Adjudication impact:** either use the canonical Tabs contract or remove the stronger tab semantics and model this as ordinary segmented buttons. Do not keep ARIA role labels that promise behavior the component does not deliver.

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
**Adjudication impact:** the current divergence removes any argument that one incumbent prescription is “already proven by implementation”. Compare populated alternatives under EXP-003.

---

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

- can the user answer “what am I doing?” and “where/with whom?” independently;
- active parent remains consistent across viewport changes;
- destination labels fit without ambiguity;
- no duplicated navigation landmark;
- one-handed reach on narrow touch;
- content area does not become artificially narrow;
- deep links preserve understandable active context;
- no requirement to memorize container taxonomy.

**Current result:** unresolved. Current E2E proves implementation stability only.

### EXP-002 — Composer disclosure: modal versus inline expansion

**Question:** Which pattern minimizes accidental scope mistakes and preserves drafting/recovery without over-consuming feed space?

**Candidates:** current modal; inline expansion in feed context; narrow-sheet / wide-inline adaptive variant.

**Criteria:** audience cue visibility, focus entry/return, draft survival on recoverable error, keyboard completion, mobile keyboard behavior, feed context retention, accidental dismiss risk.

**Current result:** unresolved.

### EXP-003 — Groups discovery density: rows, cards, or hybrid

**Question:** Which composition best supports scanning real group names/descriptions/privacy/membership actions at pilot-scale and denser states?

**Candidates:** compact semantic rows; current bordered hybrid; image/cover cards only if imagery materially aids recognition.

**Criteria:** scan time, action discoverability, long-name wrapping, mobile density, privacy-status clarity, empty imagery behavior, visual noise.

**Current result:** unresolved.

### EXP-004 — Visual system values

**Question:** Which actual candidate token system best satisfies the frozen visual character without false precision?

**Scope:** brand accent, typography family/scale, spacing scale, radii, elevation, content measure, motion durations.

**Method:** create 2–3 coherent token candidates and apply each to the same representative states/surfaces. Do not vary layout/content simultaneously.

**Criteria:** trust perception, Bivaque recognizability, readability in Portuguese, scanability, contrast, density, layout stability, performance/dependency cost.

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
- the current implementation itself when the question is aesthetic/craft preference.

## Fresh-browser completion gate

Phase 4 may be frozen only after a current authenticated run produces evidence for the remaining material questions. At minimum:

1. assert valid authenticated landed states for member and privileged surfaces;
2. exercise navigation at narrow/medium/wide widths, including `/messages`, `/notifications`, `/recommendations`, and transfer context;
3. keyboard-test locality switcher, BottomNav/rail, composer modal, dialogs, menus and representative compound controls;
4. inject query/server failures and verify error ≠ empty and safe error copy;
5. inspect populated `/groups`, `/community`, `/events`, `/recommendations` under realistic long/dense content;
6. verify visible focus rather than focus existence;
7. verify reduced-motion component behavior rather than only the media query;
8. run EXP-001–004 where standards/product invariants do not settle the choice.

Until those observations exist, disputed visual values and navigation/composer/group composition remain `UNRESOLVED_RUNTIME` and must not receive final `KEEP/DELETE` adjudication merely from model preference.
