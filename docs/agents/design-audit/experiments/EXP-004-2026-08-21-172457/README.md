# EXP-004 — visual system comparison (2026-08-21)

> **Status: exploratory experiment. NOT design law. NOT production code.**
>
> This experiment exists to compare 2–3 coherent visual directions for the
> Bivaque Community product, as required by `DESIGN_SPEC.md` §6 (`DS-036`,
> `EXP-004`) and `VISUAL_GUIDE.md` §12. It does not adjudicate a winner.
> Adjudication is a human decision gated by `ADJUDICATION.md` and the
> Phase 5.5+ process; this folder only produces comparable visual evidence.

## Authority and traceability

| Reference | Authority for |
|---|---|
| `docs/agents/DESIGN_SPEC.md` (frozen Phase 6) | Product invariants, trust, scope, semantics, accessibility, state truth. |
| `docs/agents/VISUAL_GUIDE.md` (frozen Phase 6) | Visual craft bar; `EXP-004` quality requirement; non-normative heuristics. |
| `docs/agents/design-audit/PHASE6_REVIEW.md` | Confirms the design contract is frozen; `EXP-004` is explicitly unresolved. |
| `docs/agents/design-audit/AGENTS.md` | Phase model; this folder is `EXPERIMENT` work, not a Phase 2/3/4 mutation. |

`EXP-004` is open. None of the artifacts here change the contract. The
candidates are evaluated against the same contract; none of them are the
"incumbent" just because they exist.

## What is NOT mutated by this experiment

- `docs/agents/DESIGN_SPEC.md` — untouched.
- `docs/agents/VISUAL_GUIDE.md` — untouched.
- `docs/agents/design-audit/ADJUDICATION.md` — untouched.
- `apps/web/app/**`, `apps/web/app/components/bivaque/**`, `apps/web/app/globals.css` — untouched.
- `packages/tokens/**` — untouched.

All visual evidence in this folder is built from inline CSS custom
properties inside standalone HTML files. No build, no compile, no token
package, no Next.js surface.

## Candidate set

Three coherent directions were produced. Each one applies the same
representative content (header, locality, composer entry, three post
cards, empty state, error state, skeleton, segmented tabs, mobile bottom
nav, wide right rail) and varies the visual system along multiple
dimensions together — type personality, surface strategy, accent family,
density rhythm, radius/elevation restraint, and motion character.

| Candidate | Direction | Why it earns a seat |
|---|---|---|
| **A — Civic Editorial** | Serif display + grotesk UI, warm-neutral paper, single restrained accent (oxidised teal). Editorial hierarchy, low elevation, low motion, generous measure. | Anchors "calm, credible, community-operated" (DS-001, VG-001) through editorial calm, not decorative authority. |
| **B — Community Modern** | Humanist sans + monospace metadata, warm off-white, layered surfaces with subtle elevation, deliberate terracotta accent. | Demonstrates a contemporary community-app grammar that is recognisable without becoming gamified or ceremonial. |
| **C — Quiet Civic** | Neutral grotesk + tabular monospace, cool slate surfaces, slate-blue accent for actions only, compact density on discovery surfaces. | Demonstrates a high-readability, low-emotion visual system optimised for scan and decision, useful contrast to A and B. |

The three directions differ on **type personality**, **surface strategy**,
**accent family**, **density rhythm**, **radius/elevation restraint**, and
**motion character**. They are not three swatches of the same system —
each is a defensible reading of the Bivaque contract.

## Evaluation matrix

Each candidate is scored against the criteria listed in `VISUAL_GUIDE.md`
§12 (EXP-004 quality requirement). The matrix lives in `comparison.md`.

| Criterion | Source |
|---|---|
| Readability | `VG-013`, `DS-031`, `DS-035` |
| Scanability | `VG-007`, `VG-013`, `DS-032` |
| Trust perception | `DS-001`, `DS-005`, `VG-001`, `VG-003` |
| Distinctiveness | `VG-002` |
| Content resilience | `DS-014`–`DS-019`, `VG-022`–`VG-023` |
| Responsive composition | `DS-011`, `DS-030`, `VG-020`–`VG-021` |
| Accessibility (WCAG 2.2 AA objective baseline) | `DS-029`, `DS-021`, `DS-025`, `DS-033`, `VG-016`, `VG-025` |
| Implementation / dependency cost | Phase 6 deletion-resurrection check |

Scoring is descriptive + evidence-based. The matrix ends with the
honest tradeoff ledger — each candidate loses something. A winner is
**not** declared here.

## Screenshots

`screenshots/<candidate>-<viewport>.png` for each candidate ×
{375, 768, 1440}. Capture script: `scripts/capture.mjs` (or as
documented inline in each candidate folder).

## Constraints honoured

1. Each candidate uses the **same representative content** (no
   simultaneous content/layout changes during comparison).
2. All candidates satisfy `DS-021`, `DS-029`, `DS-033`, `DS-035` to the
   extent a static rendering can show them; the matrix records any
   residual exposure (e.g., focus lifecycle, modal keyboard behaviour,
   reduced-motion behaviour) that needs a runtime probe.
3. WCAG 2.2 AA contrast is verified for the key text/background pairs
   of each candidate and reported in the candidate `notes.md`.
4. No Nextdoor, military rank/OM/insignia/seal cues.
5. Portuguese diacritics are preserved in copy.
6. Realistic long names and Brazilian city/PT-BR copy are used
   consistently.

## How to read this experiment

1. Open `candidate-A/index.html`, `candidate-B/index.html`,
   `candidate-C/index.html` directly in a browser at 375 / 768 / 1440.
2. Read each candidate's `notes.md` for the deliberate choices and
   the deliberate non-choices.
3. Read `comparison.md` for the side-by-side matrix and the tradeoff
   ledger.
4. Use the screenshots in `screenshots/` as reference during the human
   adjudication conversation.

## Non-goals

- This experiment does not select a winner.
- This experiment does not propose tokens for `packages/tokens/**`.
- This experiment does not propose route or component anatomy.
- This experiment does not reintroduce deleted incumbent prescriptions
  (Navy, exact system fonts, exact pixel scales, fixed card anatomy,
  universal pills/rails, route wireframes).
