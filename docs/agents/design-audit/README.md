# Bivaque design audit — adversarial protocol

> **Status: ACTIVE PROTOCOL / no design verdicts yet.**
>
> This directory exists to test whether Bivaque's current design rules deserve to remain rules. It does not assume that `DESIGN_SPEC.md`, `VISUAL_GUIDE.md`, current screenshots, or current implementation are good because they already exist.

## Objective

Produce an independent, evidence-backed reference design standard for Bivaque, then confront the incumbent design contract against that reference, runtime evidence, and specialized external review.

The audit answers two separate questions in this order:

1. **If Bivaque were designed today from product truth, stack constraints, current standards, and current specialist knowledge — without seeing the incumbent design solution — what should the design/interaction standard be?**
2. **Which incumbent rules survive comparison with that independent standard and runtime evidence?**

Core rule:

**Blind to the incumbent solution, not blind to the product.**

## Non-negotiable contamination boundary

Phase 1 must run in a fresh agent context/session that has not read the incumbent design solution.

**Permission is content-based, not path-based. Transitive contamination counts.**

A nominally allowed document is not safe merely because its path is on an allowlist. If it embeds, quotes, summarizes, reproduces, or substantively describes forbidden incumbent material, consuming that content contaminates Phase 1 exactly as reading the original forbidden source would.

Cross-references are not permission. An allowed file may mention another file; do not follow that reference unless the target itself is explicitly allowlisted below.

### Exhaustive local allowlist for Phase 1

The reference-design agent may read **only** these local project inputs:

- `docs/BIVAQUE.md`;
- root `package.json`;
- `apps/web/package.json`;
- version-matched Next.js docs from `apps/web/node_modules/next/dist/docs/` when available.

It may also use current external standards, maintainer documentation for the installed dependency versions, and approved external skills listed below.

**No other repository file is implicitly allowed.** In particular, Phase 1 may not open ADRs, legal documents, plans, status documents, tests, implementation files, tokens, screenshots, or other project documentation merely because a useful product constraint might exist there.

If a material product constraint cannot be resolved from the exhaustive allowlist plus current external sources, do not broaden repository access. Stop that line of work and report:

`PHASE_1_INPUT_GAP: <minimal description of the missing product constraint>`

The gap must be resolved by changing the protocol/allowlist or by providing a separately reviewed sanitized input in a future revision. The Phase 1 agent must not manufacture the missing constraint and must not inspect additional local files to discover it.

### Forbidden local inputs in Phase 1

The reference-design agent must **not** read, search, inspect, infer from, or receive substantive content from:

- `docs/agents/DESIGN_SPEC.md`;
- `docs/agents/VISUAL_GUIDE.md`;
- any ADR, including design/navigation/shell ADRs, unless a future protocol revision explicitly allowlists a reviewed sanitized artifact instead;
- `docs/legal/**`;
- this directory's later-phase incumbent findings;
- `.visual/` or any current product screenshots/captures;
- current UI implementation under `apps/web/app/**` or equivalent rendered source;
- `packages/tokens/**` or current visual tokens;
- `docs/PRODUCT_STATUS.md`;
- historical UI plans/specs under `docs/superpowers/**`;
- old visual reviews, design critiques, or prior redesign proposals;
- current Playwright screenshots or snapshot artifacts;
- descriptions, excerpts, summaries, diffs, audit findings, or screenshots derived from any forbidden source, even when embedded inside another document.

Examples of **transitive contamination** include:

- an ADR quoting `VISUAL_GUIDE.md`;
- a product note describing the current `bottom-nav.tsx` implementation;
- an audit summary comparing incumbent visual rules with current code;
- a copied screenshot or textual description of the current rendered shell;
- a secondary document reproducing current tokens, breakpoints, navigation layout, component geometry, or incumbent visual findings.

A mere filename/link/reference to a forbidden source does not itself contaminate the session if no substantive incumbent content is conveyed, but the agent must not follow it.

If the fresh agent has already consumed any forbidden or transitively forbidden input, its Phase 1 output is contaminated. Do not salvage it as the reference benchmark; start Phase 1 again in a clean context and report exactly:

`PHASE_1_CONTEXT_CONTAMINATED`

## Required external lenses for Phase 1

Do not let one generic design skill become the benchmark. Build the reference from multiple independent lenses and record the source/version/ref used when practical.

### Product / information architecture

Evaluate:

- jobs and primary user outcomes;
- information architecture;
- locality/community/group mental model;
- navigation depth and discoverability;
- progressive disclosure;
- cognitive load;
- trust and privacy implications of presentation;
- error prevention and recoverability.

This lens starts from product truth, not the incumbent navigation or visual system.

### Web standards / accessibility

Use current authoritative guidance, including WCAG/WAI where applicable and Vercel's current `web-design-guidelines` review rules.

Evaluate at minimum:

- semantics;
- keyboard/focus;
- forms and errors;
- touch targets;
- contrast and non-color cues;
- responsive behavior;
- motion/reduced motion;
- navigation/state/deep-linking;
- typography/readability;
- i18n/locale behavior.

Objective defects are not aesthetic preferences.

### Next.js / React / component engineering

Use version-matched installed Next.js docs as framework authority. Use `vercel-react-best-practices` and component guidance only for questions they actually own.

Evaluate at minimum:

- server/client boundaries that affect UX;
- loading/streaming/error behavior;
- performance-visible interaction tradeoffs;
- component composition and API clarity;
- avoiding unnecessary client state/dependencies;
- browser-verifiable interaction behavior.

External examples do not authorize new dependencies.

### HeroUI

Treat the installed HeroUI version as the implementation foundation, not as proof that local wrappers are correct.

For components used in the reference design, verify canonical HeroUI behavior and accessibility for compound controls, forms, overlays, selection, focus, and keyboard interaction before inventing local behavior.

### Visual / UX craft

Use at least one independent craft lens such as:

- `addyosmani/agent-skills` → `frontend-ui-engineering`;
- `pbakaus/impeccable` → `impeccable` using critique/audit/distill/harden/adapt/polish-style analysis as appropriate.

During Phase 1 do **not** run Impeccable `init` or `document`, install hooks, or create a competing root `PRODUCT.md`/`DESIGN.md`.

The craft lens may propose a visual system; it may not redefine product truth.

## Phase 1 output contract — independent reference

Phase 1 produces exactly two primary artifacts:

- `REFERENCE_DESIGN_SPEC.md`;
- `REFERENCE_VISUAL_GUIDE.md`.

The reference must not mention or compare against incumbent Bivaque design choices because it has not seen them.

Every normative statement must carry one strength label:

- **MUST** — objective requirement or extremely strong product/standards constraint;
- **SHOULD** — strong default with legitimate exceptions;
- **MAY** — optional implementation/design choice;
- **EXPERIMENT** — evidence is insufficient to prescribe a fixed solution; compare alternatives in runtime.

Avoid false precision. Exact pixels, breakpoints, radii, counts, durations, or typography values require a rationale proportional to their specificity. When a range or runtime criterion is more defensible than one number, specify the range/criterion.

Each major rule/recommendation should record:

- statement;
- type: `product-invariant | design-decision | implementation-guidance | objective-standard`;
- strength: `MUST | SHOULD | MAY | EXPERIMENT`;
- rationale;
- evidence/source class;
- reference confidence `1–5`;
- falsification/validation method where practical.

### Reference confidence

- **5** — objective standard, framework contract, accessibility/security requirement, or direct product invariant;
- **4** — strong established practice supported by multiple credible sources;
- **3** — contextual best practice with meaningful tradeoffs;
- **2** — heuristic/design judgment;
- **1** — aesthetic preference or weakly supported opinion.

A confidence-1/2 rule should rarely be a `MUST`.

## Phase 2 — incumbent rule extraction

Only after both reference artifacts are frozen may a separate auditor read:

- `docs/agents/DESIGN_SPEC.md`;
- `docs/agents/VISUAL_GUIDE.md`.

Extract every normative rule into `RULE_LEDGER.md`. Do not improve, defend, reinterpret, or merge rules during extraction.

Flag absolute language automatically for scrutiny:

`always`, `never`, `must`, `exactly`, `only`, `every`, `cannot`, and Portuguese equivalents such as `sempre`, `nunca`, `deve`, `exatamente`, `somente`, `todo`, `não pode`.

Absolute wording requires proportionally strong evidence.

For each incumbent rule classify:

- `product-invariant` — changes product meaning/trust/privacy/authorized behavior;
- `design-decision` — intentional but contestable UX/visual choice;
- `implementation-guidance` — technical/how-to rule;
- `objective-standard` — accessibility/framework/semantic requirement.

Do not grant higher support merely because a rule is very specific.

### Current-rule support score

- **5** — invariant/objective requirement plus strong evidence and runtime confirmation;
- **4** — strong explicit rationale and supporting evidence;
- **3** — reasonable contextual decision but materially unvalidated;
- **2** — historical convention or weak rationale;
- **1** — arbitrary/unexplained choice;
- **0** — contradicted by stronger evidence or current product truth.

## Phase 3 — confrontation

Populate `CONFLICT_MATRIX.md` by comparing each incumbent rule with the frozen reference.

Required comparison outcomes:

- `ALIGNED`;
- `ALIGNED_BUT_OVERSPECIFIED`;
- `REFERENCE_STRONGER`;
- `INCUMBENT_HAS_PRODUCT_CONTEXT`;
- `DIRECT_CONFLICT`;
- `NO_REFERENCE_EQUIVALENT`;
- `EXPERIMENT_REQUIRED`;
- `INSUFFICIENT_EVIDENCE`.

Do not resolve a conflict merely by picking the newer document or the external source. Record why the evidence differs.

## Phase 4 — runtime confrontation

Only now inspect the actual product implementation, screenshots, browser behavior, and `PRODUCT_STATUS.md` as needed.

Populate `RUNTIME_FINDINGS.md` with evidence that distinguishes:

- spec defect;
- implementation defect;
- both;
- acceptable divergence;
- behavior that cannot be judged without an experiment/user evidence.

Test at the real interaction layer. Static JSX is not evidence that a compound control works.

Where a numerical/design choice has weak support, prefer bounded comparison over model opinion. Example structure:

```text
Question: desktop navigation width
Candidates: A / B / C
Target viewports: defined by product/device evidence
Criteria: scanability, content width, hierarchy, overflow, interaction cost
Result: runtime evidence
```

## Phase 5 — adjudication

Populate `ADJUDICATION.md`. Allowed verdicts:

- **KEEP** — incumbent rule is sufficiently supported and remains normative;
- **AMEND** — intent survives but wording/specificity/scope is wrong;
- **DELETE** — rule should no longer be normative;
- **EXPERIMENT** — evidence cannot justify a fixed rule yet;
- **HUMAN_DECISION** — genuine product/brand tradeoff not derivable from available evidence.

The adjudicator receives the frozen reference, rule ledger, conflict matrix, and runtime findings. It must not treat either the incumbent or the reference as infallible.

## Phase 6 — rewrite

Only after adjudication may the audit mutate:

- `docs/agents/DESIGN_SPEC.md`;
- `docs/agents/VISUAL_GUIDE.md`.

The rewrite must be traceable to adjudicated rules. Do not add a new normative rule merely because the synthesizer likes it.

After rewrite:

1. re-run objective standards audit;
2. re-run runtime/browser verification for affected flows;
3. record unresolved `EXPERIMENT` and `HUMAN_DECISION` items explicitly;
4. then finalize `apps/web/AGENTS.md` against the new design contract.

## Separation of roles

For this audit, independence matters more than convenience.

Minimum separation:

- Phase 1 reference generator: fresh context, blind to incumbent design;
- Phase 2 incumbent extractor: may read current docs, does not adjudicate;
- specialist challengers: UX/craft/standards/engineering lenses;
- runtime evaluator: skeptical, browser/evidence oriented;
- adjudicator/synthesizer: receives artifacts, not the prior agents' long reasoning/self-verdicts.

Different models are useful when practical, but **separate context and independent evidence are mandatory** where the role claims independence.

## Completion condition for the audit program

The design audit is not complete when a model says the UI is good. It is complete when:

- the independent reference is frozen and uncontaminated;
- incumbent normative rules are exhaustively extracted;
- every material rule has a comparison outcome;
- runtime evidence covers disputed interaction behavior;
- each material rule has an adjudicated verdict;
- the rewritten design documents are traceable to those verdicts;
- objective standards checks and affected runtime flows pass;
- unresolved experiments/human decisions remain visible rather than being silently guessed.
