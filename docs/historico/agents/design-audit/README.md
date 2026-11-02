# Bivaque design audit — adversarial protocol

> **Status: ACTIVE PROTOCOL / no design verdicts yet.**
>
> This directory exists to test whether Bivaque's current design rules deserve to remain rules. It does not assume that `DESIGN_SPEC.md`, `VISUAL_GUIDE.md`, current screenshots, or current implementation are good because they already exist.

## Objective

Produce an independent, evidence-backed reference design standard for Bivaque, then confront the incumbent design contract against that reference, runtime evidence, and specialized external review.

The audit answers two separate questions in this order:

1. **If Bivaque were designed today from sanitized product truth, stack constraints, current standards, and current specialist knowledge — without seeing the incumbent design solution — what should the design/interaction standard be?**
2. **Which incumbent rules survive comparison with that independent standard and runtime evidence?**

Core rule:

**Blind to the incumbent solution, not blind to the product.**

## Phase model

```text
Phase 1 — independent benchmark
  PHASE1_PRODUCT_CONTEXT + stack + external evidence
  -> REFERENCE_DESIGN_SPEC
  -> REFERENCE_VISUAL_GUIDE

Phase 2 — incumbent extraction
  DESIGN_SPEC + VISUAL_GUIDE
  -> RULE_LEDGER

Phase 3 — confrontation
  frozen reference + incumbent ledger
  -> CONFLICT_MATRIX

Phase 4 — runtime confrontation
  implementation + browser/screens + runtime evidence
  -> RUNTIME_FINDINGS

Phase 5 — adjudication
  all evidence
  -> ADJUDICATION

Phase 6 — rewrite
  adjudicated decisions only
  -> DESIGN_SPEC / VISUAL_GUIDE vNext
```

Do not collapse phases for convenience.

# Phase 1 — non-negotiable contamination boundary

Phase 1 must run in a fresh agent context/session that has not consumed the incumbent Bivaque design solution.

**Permission is content-based, not path-based. Transitive contamination counts.**

A nominally permitted file is not safe merely because of its filename or location. If it embeds, quotes, summarizes, reproduces, or substantively describes forbidden incumbent material, consuming that material contaminates Phase 1 exactly as reading the original source would.

Cross-references are not permission. Never follow a local reference unless the target is explicitly present in the exhaustive allowlist below.

## Why `docs/BIVAQUE.md` is not allowed

`docs/BIVAQUE.md` is the general product canon, but it mixes durable product truth with implementation/history/current-state material. It is therefore **not a safe blind-design input**.

Phase 1 must not read it directly.

Product truth required for the benchmark is supplied instead through the reviewed, sanitized artifact:

- `docs/agents/design-audit/PHASE1_PRODUCT_CONTEXT.md`

That file intentionally contains only solution-independent product problem, roles, capabilities, trust/privacy invariants, pilot scope, and technical envelope.

## Exhaustive local allowlist for Phase 1

A Phase 1 agent may read only these repository resources:

### Protocol/control

- `docs/agents/design-audit/AGENTS.md`;
- `docs/agents/design-audit/README.md`;
- `docs/agents/design-audit/PHASE1_PRODUCT_CONTEXT.md`;
- `docs/agents/design-audit/REFERENCE_DESIGN_SPEC.md` as the target/template;
- `docs/agents/design-audit/REFERENCE_VISUAL_GUIDE.md` as the target/template.

### Dependency envelope

- root `package.json`;
- `apps/web/package.json`;
- version-matched Next.js documentation from `apps/web/node_modules/next/dist/docs/` when available.

### External sources

The agent may use:

- current authoritative web standards;
- current maintainer documentation for the dependency versions established by the allowed package manifests;
- approved external skills and their current upstream source;
- current primary/authoritative research needed to justify design standards.

**No other repository file is implicitly allowed.**

Do not read the root `AGENTS.md` or any other scoped `AGENTS.md` during Phase 1. Repository-wide/scoped instructions may contain incumbent design, incident, implementation, or tooling context. For Phase 1, this directory's `AGENTS.md` is the only local agent-instruction file allowed.

## Explicitly forbidden local inputs in Phase 1

Do not read, search, inspect, infer from, or receive substantive content from:

- `docs/BIVAQUE.md`;
- `docs/PRODUCT_STATUS.md`;
- `docs/agents/DESIGN_SPEC.md`;
- `docs/agents/VISUAL_GUIDE.md`;
- root `AGENTS.md`;
- `apps/web/AGENTS.md`;
- any other scoped `AGENTS.md` outside this directory;
- any ADR;
- `docs/legal/**`;
- implementation under `apps/web/app/**` or equivalent rendered source;
- `packages/tokens/**` or current visual tokens;
- `.visual/**`;
- screenshots/captures/snapshots of the current product;
- tests when they reveal current UI structure/behavior;
- `docs/superpowers/**` historical plans/specs;
- old visual reviews, design critiques, redesign proposals, audit findings, or incident descriptions;
- this directory's Phase 2+ artifacts if they have been populated with incumbent evidence;
- excerpts, summaries, diffs, screenshots, or secondary descriptions derived from any forbidden source.

Examples of transitive contamination:

- a product document describing current `globals.css`, themes, wrappers, breakpoints, current routes, or rendered shell;
- an ADR quoting `VISUAL_GUIDE.md`;
- a note describing `bottom-nav.tsx` or another current UI component;
- an audit comparing incumbent spec with current code;
- a secondary document reproducing incumbent visual tokens, geometry, navigation, or screenshot findings;
- a supposedly generic instruction file carrying project-specific implementation incidents.

A mere filename or link is not itself contamination if no substantive incumbent information is conveyed. Do not follow it.

## No broad repository discovery in Phase 1

Do not:

- run broad code search;
- list the repository tree for exploration;
- inspect neighboring files to understand context;
- search for routes/components/tokens;
- inspect git history/diffs for design information;
- open referenced local documents outside the allowlist.

The absence of information is a deliberate part of the protocol.

## Input-gap behavior

If a material product constraint cannot be resolved from `PHASE1_PRODUCT_CONTEXT.md`, allowed package manifests, version-matched framework docs, and current external sources, stop that line of work and report exactly:

`PHASE_1_INPUT_GAP: <minimal description of the missing product constraint>`

Do not infer the answer from repository structure. Do not broaden access. Do not manufacture product truth.

The gap must be resolved by updating the sanitized Phase 1 input in a contaminated/non-blind preparation context and then restarting Phase 1 in a fresh session.

## Contamination behavior

If the Phase 1 agent consumes any forbidden or transitively forbidden incumbent material:

- stop immediately;
- do not generate, continue, repair, or salvage either reference artifact;
- do not claim that the information can be mentally ignored;
- leave `REFERENCE_*` unchanged;
- report exactly:

`PHASE_1_CONTEXT_CONTAMINATED`

A fresh context/session is required after the protocol/input is corrected.

# Required external lenses for Phase 1

The benchmark must not be generated by one generic design skill. Use multiple independent evidence classes and record the source/version/ref where practical.

## Product / information architecture

Evaluate from `PHASE1_PRODUCT_CONTEXT.md`:

- jobs and primary user outcomes;
- information architecture;
- locality/community/group mental model;
- discoverability and navigation depth;
- progressive disclosure;
- cognitive load;
- trust/privacy consequences of presentation;
- error prevention and recoverability.

The lens starts from product truth, not an incumbent navigation model.

## Web standards / accessibility

Use current authoritative guidance, including WCAG/WAI where applicable and current Vercel web-interface review guidance.

Evaluate at minimum:

- semantics;
- keyboard/focus;
- forms and errors;
- touch targets;
- contrast/non-color cues;
- responsive behavior;
- motion/reduced motion;
- navigation/state/deep-linking;
- typography/readability;
- i18n/locale behavior.

Objective defects are not aesthetic preferences.

## Next.js / React / component engineering

Use version-matched installed Next.js docs as framework authority. Use React/component guidance only for questions it actually owns.

Evaluate at minimum:

- server/client boundaries that affect UX;
- loading/streaming/error behavior;
- performance-visible interaction tradeoffs;
- component composition/API clarity;
- unnecessary client state/dependencies;
- browser-verifiable interaction behavior.

External examples do not authorize new dependencies.

## HeroUI

Treat the installed HeroUI version as the implementation foundation, not as proof that any incumbent wrapper or usage is correct.

For component classes used in the reference, verify current canonical HeroUI behavior and accessibility for compound controls, forms, overlays, selection, focus, and keyboard interaction before inventing local behavior.

## Visual / UX craft

Use at least one independent craft lens, such as current upstream guidance from:

- `addyosmani/agent-skills` → `frontend-ui-engineering`;
- `pbakaus/impeccable` → `impeccable` for critique/audit/distill/harden/adapt/polish-style reasoning where appropriate.

During Phase 1 do not run Impeccable `init` or `document`, install hooks, or create competing root product/design context files.

A craft lens may propose a visual system. It may not redefine product truth.

# Phase 1 output contract

Phase 1 produces exactly two primary artifacts:

- `REFERENCE_DESIGN_SPEC.md`;
- `REFERENCE_VISUAL_GUIDE.md`.

The reference must not mention, compare with, or anticipate incumbent Bivaque design choices.

Every normative statement must carry one strength label:

- **MUST** — objective requirement or extremely strong product/standards constraint;
- **SHOULD** — strong default with legitimate exceptions;
- **MAY** — optional implementation/design choice;
- **EXPERIMENT** — evidence is insufficient to prescribe a fixed solution; compare alternatives in runtime.

Avoid false precision. Exact pixels, breakpoints, radii, counts, durations, typography values, or geometry require rationale proportional to their specificity. Prefer behavioral criteria/ranges when stronger evidence does not justify one exact value.

Each major rule/recommendation should record:

- statement;
- type: `product-invariant | design-decision | implementation-guidance | objective-standard`;
- strength: `MUST | SHOULD | MAY | EXPERIMENT`;
- rationale;
- evidence/source class;
- reference confidence `1–5`;
- falsification/validation method where practical.

## Reference confidence

- **5** — objective standard, framework contract, accessibility/security requirement, or direct product invariant;
- **4** — strong established practice supported by multiple credible sources;
- **3** — contextual best practice with meaningful tradeoffs;
- **2** — heuristic/design judgment;
- **1** — aesthetic preference or weakly supported opinion.

A confidence-1/2 rule should rarely be `MUST`.

When both reference artifacts are complete, record the external source set and declare the Phase 1 reference frozen before beginning Phase 2. Once frozen, do not renumber existing `REF-*` or `RVIS-*` IDs.

# Phase 2 — incumbent rule extraction

Only after the Phase 1 reference is frozen may a separate auditor read:

- `docs/agents/DESIGN_SPEC.md`;
- `docs/agents/VISUAL_GUIDE.md`.

Extract every normative rule into `RULE_LEDGER.md`. Do not improve, defend, reinterpret, merge, or reconcile rules during extraction.

Flag absolute wording automatically for scrutiny:

`always`, `never`, `must`, `exactly`, `only`, `every`, `cannot`, plus Portuguese equivalents such as `sempre`, `nunca`, `deve`, `exatamente`, `somente`, `todo`, `não pode`.

Absolute wording requires proportionally strong evidence.

Classify each incumbent rule as:

- `product-invariant`;
- `design-decision`;
- `implementation-guidance`;
- `objective-standard`.

Do not grant higher support merely because a rule is highly specific.

## Current-rule support score

- **5** — invariant/objective requirement plus strong evidence and runtime confirmation;
- **4** — strong explicit rationale and supporting evidence;
- **3** — reasonable contextual decision but materially unvalidated;
- **2** — historical convention or weak rationale;
- **1** — arbitrary/unexplained choice;
- **0** — contradicted by stronger evidence or current product truth.

# Phase 3 — confrontation

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

Do not resolve a conflict by source prestige, age, specificity, or local status alone. Record why the evidence differs.

# Phase 4 — runtime confrontation

Only now inspect actual implementation, screenshots, browser behavior, tests, and `PRODUCT_STATUS.md` as needed.

Populate `RUNTIME_FINDINGS.md` and distinguish:

- spec defect;
- implementation defect;
- both;
- acceptable divergence;
- unresolved experiment/user-evidence question.

Test at the real interaction layer. Static JSX is not proof that a compound control works.

Where a numerical/design choice has weak support, prefer a bounded comparison over model taste.

# Phase 5 — adjudication

Populate `ADJUDICATION.md` using only these verdict classes:

- **KEEP**;
- **AMEND**;
- **DELETE**;
- **EXPERIMENT**;
- **HUMAN_DECISION**;
- **ADD** when the reference identifies a materially missing rule supported strongly enough to become normative.

The adjudicator receives the frozen reference, rule ledger, conflict matrix, and runtime findings. Neither incumbent nor reference is infallible.

# Phase 6 — rewrite

Only after adjudication may the audit mutate:

- `docs/agents/DESIGN_SPEC.md`;
- `docs/agents/VISUAL_GUIDE.md`.

Every mutation must map to an adjudicated Decision ID. Do not add a normative rule merely because the synthesizer prefers it.

After rewrite:

1. re-run objective-standards review;
2. re-run affected runtime/browser verification;
3. keep unresolved `EXPERIMENT` and `HUMAN_DECISION` items visible;
4. then finalize `apps/web/AGENTS.md` against the rewritten design contract.

# Separation of roles

Minimum separation:

- Phase 1 reference generator — fresh context, blind to incumbent;
- Phase 2 incumbent extractor — sees incumbent, does not adjudicate;
- specialist challengers — UX/craft/standards/engineering lenses;
- runtime evaluator — skeptical, browser/evidence oriented;
- adjudicator/synthesizer — receives artifacts/evidence, not prior agents' long reasoning or self-verdicts.

Different models are useful when practical, but **separate context and independent evidence are mandatory wherever the role claims independence**.

# Completion condition

The audit is complete only when:

- the independent reference is frozen and uncontaminated;
- incumbent normative rules are exhaustively extracted;
- every material rule has a comparison outcome;
- runtime evidence covers disputed interaction behavior;
- every material rule has an adjudicated verdict;
- rewritten design documents are traceable to those verdicts;
- objective standards checks and affected runtime flows pass;
- unresolved experiments/human decisions remain visible rather than being guessed.