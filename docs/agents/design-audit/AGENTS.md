# Design-audit scoped agent instructions

> Applies to `docs/agents/design-audit/**`.

Read `README.md` before doing any work in this directory.

## First determine the phase

Do not infer that every artifact can be edited in every session.

- `REFERENCE_DESIGN_SPEC.md` / `REFERENCE_VISUAL_GUIDE.md` → **Phase 1: blind reference**.
- `RULE_LEDGER.md` → **Phase 2: incumbent extraction**.
- `CONFLICT_MATRIX.md` → **Phase 3: confrontation**.
- `RUNTIME_FINDINGS.md` → **Phase 4: runtime evidence**.
- `ADJUDICATION.md` → **Phase 5/6: verdicts and rewrite manifest**.

If the requested task spans phases, preserve the order and phase gates in `README.md` rather than collapsing them for convenience.

## Phase 1 — hard contamination boundary

A Phase 1 agent must be in a fresh context that has not consumed the incumbent Bivaque design solution.

Before generating either reference artifact, explicitly verify that the current session has **not** read or received content from forbidden local inputs listed in `README.md`, including that content reproduced indirectly inside another file.

**Permission is content-based, not path-based. Transitive contamination counts.**

If contaminated:

- do not generate or edit the reference benchmark;
- report exactly `PHASE_1_CONTEXT_CONTAMINATED`;
- leave existing reference artifacts unchanged;
- require a fresh context/session.

Do not attempt to “mentally ignore” information already seen.

### Phase 1 local access

The local allowlist in `README.md` is **exhaustive**, not illustrative.

Currently permitted local project inputs are only:

- `docs/BIVAQUE.md`;
- root `package.json`;
- `apps/web/package.json`;
- version-matched Next.js docs under `apps/web/node_modules/next/dist/docs/` when available.

Do not read ADRs or `docs/legal/**` during Phase 1. Do not broaden access because an allowed document links to them or because a product constraint appears useful.

Do not search the repository broadly. Broad repository search can reveal forbidden design filenames, code snippets, tokens, screenshots, audit findings, or summaries and contaminate the reference.

Do not read or consume substantive descriptions of:

- incumbent design docs;
- current UI implementation;
- current visual tokens;
- current screenshots/captures;
- `PRODUCT_STATUS.md`;
- historical UI plans/reviews;
- ADRs that reproduce or summarize incumbent design/implementation evidence;
- secondary documents that quote, summarize, compare, or describe forbidden material.

A mere filename or link is not contamination if it conveys no substantive incumbent information, but do not follow it unless the target is explicitly allowlisted.

If an allowed input is discovered to contain substantive embedded incumbent material, stop immediately. The fact that the containing path was allowed does not preserve the session's cleanliness.

If a material product constraint cannot be resolved from the exhaustive allowlist plus current external sources, do **not** inspect more repository files. Report:

`PHASE_1_INPUT_GAP: <minimal description of the missing product constraint>`

This is a protocol gap, not permission for exploratory repository access.

### Phase 1 output discipline

- Produce an independent standard, not a critique of Bivaque's current design.
- Every normative statement is `MUST`, `SHOULD`, `MAY`, or `EXPERIMENT`.
- Every major rule includes reference confidence `1–5`.
- Exact numbers require rationale proportional to their precision.
- Objective standards and product invariants may be `MUST`; aesthetic preference normally may not.
- Do not add dependencies because an external skill/example uses them.
- Do not run Impeccable `init` or `document`, install hooks, or create root design/product context files.
- Once Phase 1 is declared frozen, do not renumber existing `REF-*` or `RVIS-*` IDs.

## Phase 2 — extraction, not judgment

The Phase 2 agent may read incumbent `DESIGN_SPEC.md` and `VISUAL_GUIDE.md`.

Its job is exhaustive extraction into `RULE_LEDGER.md`.

Do not:

- compare against the reference while assigning current-support score;
- repair wording;
- merge away contradictions;
- soften absolutes;
- defend a rule because it looks intentional;
- delete a rule from the ledger because runtime no longer implements it.

Flag absolute wording and false precision for later scrutiny.

## Phase 3 — explicit confrontation

Compare frozen reference rules against extracted incumbent rules.

Do not resolve by source prestige alone:

- local does not automatically win;
- external does not automatically win;
- newer does not automatically win;
- more specific does not automatically win.

Distinguish product context, objective standards, technical constraints, UX evidence, and aesthetic judgment.

Do not issue final verdicts in `CONFLICT_MATRIX.md`.

## Phase 4 — runtime is evidence, not authority

Runtime inspection may now read implementation, screenshots, `PRODUCT_STATUS.md`, tests, browser output, and relevant source.

The current implementation is not the target by definition. Use it to observe consequences and discriminate between competing hypotheses.

Prefer real browser/runtime evidence over static source for interaction claims.

Do not use a screenshot alone to declare keyboard, focus, form, compound-control, or authorization behavior correct.

When standards/product invariants do not settle a weak numerical/design rule, create a bounded experiment instead of letting a model choose by taste.

## Phase 5 — adjudication

Issue only verdicts allowed by `ADJUDICATION.md`.

Every material verdict must be traceable to IDs from prior artifacts.

The adjudicator should receive artifacts/evidence, not the prior executor's long chain of reasoning or self-verdict.

Confidence 1–2 normally means `EXPERIMENT` or `HUMAN_DECISION`, not a new hard rule.

## Phase 6 — mutation gate

Do not edit incumbent `docs/agents/DESIGN_SPEC.md` or `docs/agents/VISUAL_GUIDE.md` from this audit until `ADJUDICATION.md` contains a rewrite manifest mapping the change to adjudicated Decision IDs.

Do not add an unadjudicated rule during cleanup/rewrite.

After rewrite, re-run the objective standards and affected runtime checks required by the decisions.

## Evidence over rhetoric

The audit is deliberately skeptical.

Reject arguments of the form:

- “this is already our design system”;
- “best practice says so” without a current source and applicability check;
- “the model prefers”;
- “it looks more modern”;
- “the component exists”;
- “the screenshot looks fine”;
- “this exact value is standard” without evidence;
- “we have always used it”.

A useful audit record states what would falsify the claim and what evidence was actually obtained.
