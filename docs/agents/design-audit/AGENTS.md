# Design-audit scoped agent instructions

> Applies to `docs/agents/design-audit/**`.

Read `README.md` before doing any work in this directory.

## First determine the phase

- `REFERENCE_DESIGN_SPEC.md` / `REFERENCE_VISUAL_GUIDE.md` → **Phase 1: blind reference**.
- `RULE_LEDGER.md` → **Phase 2: incumbent extraction**.
- `CONFLICT_MATRIX.md` → **Phase 3: confrontation**.
- `RUNTIME_FINDINGS.md` → **Phase 4: runtime evidence**.
- `ADJUDICATION.md` → **Phase 5/6: verdicts and rewrite manifest**.

Do not collapse phases for convenience.

# Phase 1 — hard contamination boundary

A Phase 1 agent must be in a fresh context that has not consumed the incumbent Bivaque design solution.

**Permission is content-based, not path-based. Transitive contamination counts.**

Before generating either reference artifact, verify that the session has not read, received, summarized, or inferred substantive incumbent material through any source.

If contaminated:

- do not generate/edit the reference benchmark;
- leave existing `REFERENCE_*` artifacts unchanged;
- report exactly `PHASE_1_CONTEXT_CONTAMINATED`;
- require a fresh context/session.

Do not attempt to mentally ignore information already consumed.

## Phase 1 local access is exhaustive

The only repository resources that may be read are:

### Protocol and sanitized product input

- `docs/agents/design-audit/AGENTS.md`;
- `docs/agents/design-audit/README.md`;
- `docs/agents/design-audit/PHASE1_PRODUCT_CONTEXT.md`;
- `docs/agents/design-audit/REFERENCE_DESIGN_SPEC.md` as target/template;
- `docs/agents/design-audit/REFERENCE_VISUAL_GUIDE.md` as target/template.

### Dependency envelope

- root `package.json`;
- `apps/web/package.json`;
- version-matched Next.js docs under `apps/web/node_modules/next/dist/docs/` when available.

No other local repository file is permitted in Phase 1.

In particular, **do not read `docs/BIVAQUE.md` in Phase 1**. It is general canon but mixes durable product truth with current-state/implementation material and is therefore not a safe blind-design input. `PHASE1_PRODUCT_CONTEXT.md` exists specifically to replace it for this phase.

Also do not read root `AGENTS.md`, `apps/web/AGENTS.md`, or any scoped `AGENTS.md` outside this directory. This file is the only local agent-instruction file permitted for Phase 1.

## No exploratory repository access

Do not:

- search the repository broadly;
- list the repository tree for context discovery;
- inspect implementation/routes/components/tokens;
- inspect ADRs, legal docs, plans, tests, screenshots, snapshots, status docs, or history;
- follow local cross-references outside the allowlist;
- inspect git history/diffs to infer the current design;
- open another file because an allowed file mentions it.

Cross-references are not permission.

## Forbidden incumbent material

Do not consume substantive descriptions of:

- current UI implementation;
- incumbent `DESIGN_SPEC.md` / `VISUAL_GUIDE.md`;
- current routes/navigation/shells/wrappers;
- current visual tokens, breakpoints, geometry, typography, themes, or responsive rules;
- current screenshots/captures;
- current product status;
- current/historical visual audits or redesign findings;
- implementation incidents that reveal current UI behavior;
- migration/database history unless already converted into a solution-independent product invariant in the sanitized brief;
- secondary files quoting, summarizing, comparing, or describing any of the above.

If a nominally allowed file unexpectedly contains substantive incumbent material, stop immediately and report `PHASE_1_CONTEXT_CONTAMINATED`.

## Missing product truth

If a material product constraint cannot be resolved from `PHASE1_PRODUCT_CONTEXT.md`, allowed package manifests, installed framework docs, and external authoritative sources, do not broaden repository access.

Report exactly:

`PHASE_1_INPUT_GAP: <minimal description of the missing product constraint>`

The gap must be resolved by updating the sanitized input outside the blind Phase 1 session, then restarting Phase 1 in a fresh context.

## Phase 1 output discipline

- Produce an independent standard, not a critique of Bivaque's current design.
- Use multiple evidence classes; one design skill is not the benchmark.
- Every normative statement is `MUST`, `SHOULD`, `MAY`, or `EXPERIMENT`.
- Every major rule includes reference confidence `1–5`.
- Exact numerical values require evidence proportional to their precision.
- Objective standards and product invariants may justify `MUST`; aesthetic preference normally does not.
- Distinguish product invariant, design decision, implementation guidance, and objective standard.
- Do not add dependencies because an external example uses them.
- Use installed/version-matched Next.js docs for framework facts.
- Verify HeroUI behavior from current maintainer documentation for the installed version.
- Do not run Impeccable `init` or `document`, install hooks, or create root product/design context files.
- Once Phase 1 is declared frozen, do not renumber existing `REF-*` or `RVIS-*` IDs.

# Phase 2 — extraction, not judgment

The Phase 2 agent may read incumbent `docs/agents/DESIGN_SPEC.md` and `docs/agents/VISUAL_GUIDE.md`.

Its job is exhaustive extraction into `RULE_LEDGER.md`.

Do not:

- compare against the reference while assigning current-support score;
- repair wording;
- merge away contradictions;
- soften absolutes;
- defend a rule because it appears intentional;
- delete a rule because runtime no longer implements it.

Flag absolute wording and false precision for later scrutiny.

# Phase 3 — explicit confrontation

Compare frozen reference rules against extracted incumbent rules.

Do not resolve by source prestige alone:

- local does not automatically win;
- external does not automatically win;
- newer does not automatically win;
- more specific does not automatically win.

Distinguish product context, objective standards, technical constraints, UX evidence, and aesthetic judgment.

Do not issue final verdicts in `CONFLICT_MATRIX.md`.

# Phase 4 — runtime is evidence, not authority

Runtime inspection may now read implementation, screenshots, `PRODUCT_STATUS.md`, tests, browser output, and relevant source.

The current implementation is not the target by definition. Use it to observe consequences and discriminate between competing hypotheses.

Prefer real browser/runtime evidence over static source for interaction claims.

Do not use a screenshot alone to declare keyboard, focus, form, compound-control, or authorization behavior correct.

When standards/product invariants do not settle a weak numerical/design rule, create a bounded experiment instead of letting a model choose by taste.

# Phase 5 — adjudication

Issue only verdicts allowed by `ADJUDICATION.md`.

Every material verdict must be traceable to IDs from prior artifacts.

The adjudicator receives artifacts/evidence, not the prior executor's long reasoning or self-verdict.

Confidence 1–2 normally means `EXPERIMENT` or `HUMAN_DECISION`, not a new hard rule.

# Phase 6 — mutation gate

Do not edit incumbent `docs/agents/DESIGN_SPEC.md` or `docs/agents/VISUAL_GUIDE.md` until `ADJUDICATION.md` contains a rewrite manifest mapping each change to adjudicated Decision IDs.

Do not add an unadjudicated rule during rewrite/cleanup.

After rewrite, re-run objective standards and affected runtime/browser checks required by the decisions.

# Evidence over rhetoric

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