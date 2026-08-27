# Agent harness — execution protocol

> **DRAFT.** This document defines how coding agents should operate in this repository. It does not define product behavior, subsystem implementation, or roadmap priority.

## Purpose

The harness exists to make agent work:

- scoped;
- reproducible;
- observable;
- reviewable;
- falsifiable;
- stoppable when evidence is insufficient.

It must reduce agent error and coordination cost. It must not become a second product-management system.

## Core principle

**Minimize permanent context. Maximize executable feedback.**

Do not solve every recurring failure by adding another paragraph to the root prompt. If a rule can be enforced by a test, linter, script, type, migration assertion, runtime probe, or CI gate, prefer the executable guardrail.

Documentation should explain what cannot be inferred or enforced mechanically.

## Instruction hierarchy

Agents should consume context from general to local:

```text
root AGENTS.md
  ↓
nearest scoped AGENTS.md
  ↓
product/source-of-truth docs relevant to the task
  ↓
current plan / execution contract
  ↓
exact code + runtime evidence
```

Do not preload every document in the repository for every task.

Current scoped instruction files:

- `apps/web/AGENTS.md` — Next/runtime/UI rules and selected frontend skills;
- `supabase/AGENTS.md` — Bivaque-local Supabase rules layered on official Supabase agent skills;
- this file — harness/execution behavior.

## Context loading

Load only the context needed to make the current decision correctly.

Examples:

- product behavior change → `docs/BIVAQUE.md` + relevant implemented state;
- existing implementation reality → `docs/PRODUCT_STATUS.md` + exact source;
- R3/security decision → applicable ADR + `docs/decisions/RISK_MATRIX.md`;
- frontend implementation → nearest `apps/web/AGENTS.md` + selected skills;
- Supabase work → `supabase/AGENTS.md` + official Supabase skills;
- executing an existing wave/plan → relevant plan + `docs/superpowers/plans/README.md`.

Do not read historical maps or old plans as current truth unless the task is specifically auditing history.

## Default roles

For non-trivial work, separate these responsibilities conceptually:

```text
planner / investigator
        ↓
execution contract
        ↓
executor
        ↓
deterministic gates
        ↓
independent evaluator
        ↓
runtime evidence when required
```

One model may perform more than one role for low-risk work, but executor output is not independent evidence that the executor is correct.

### Planner / investigator

Responsible for:

- understanding current state before proposing mutation;
- reproducing the problem or gathering direct evidence when possible;
- identifying the smallest coherent change;
- locating trust boundaries and blast radius;
- defining how success will be proved;
- searching for sibling occurrences when a bug represents a failure class.

A detailed plan based on an unverified premise is still a bad plan.

### Executor

Responsible for:

- implementing only the agreed scope;
- shipping implementation and its proof together;
- preserving unrelated behavior;
- running relevant targeted checks during iteration;
- stopping when the contract is wrong, impossible, or requires a human decision.

The executor must not silently expand the task to redesign architecture, product behavior, or tooling.

### Evaluator

Responsible for trying to falsify completion.

Prefer:

- deterministic tests;
- direct API/database assertions;
- Playwright/browser interaction;
- inspection of the actual diff;
- clean-state reproduction;
- positive and negative authorization evidence.

Do not approve because code looks plausible or because the executor reports that tests passed.

## Task sizing

Prefer tasks that can be understood and verified as one coherent unit.

Split when a task contains multiple independently reviewable behaviors, especially across trust boundaries.

Do not split a mechanical change into artificial microtasks when all edits implement one invariant and share one proof.

A task is too large when the evaluator cannot state a compact, falsifiable acceptance contract for it.

## Execution contract

Before implementing a non-trivial task, establish a compact contract:

```text
Goal
Current evidence
Scope
Out of scope
Expected behavior
Acceptance criteria
Required proof
Dependencies / human gates
```

The contract is not an essay or a new roadmap. It exists to remove ambiguity that would otherwise force the executor to make product, security, or architecture decisions while coding.

## Evidence hierarchy

Use the cheapest evidence that directly proves the property, but do not stop below the layer where the bug can still exist.

Typical progression:

1. static/structural guardrail;
2. unit test;
3. integration/API/database test;
4. build/runtime startup;
5. E2E/browser interaction;
6. human verification for irreducibly subjective or externally controlled gates.

**Existence is not evidence. Runtime behavior is evidence.**

Examples of insufficient proof by themselves:

- “the RPC exists in generated types”;
- “the component exists in JSX”;
- “the migration created the capability”;
- “there is an E2E file”;
- “the plan checkbox is checked”;
- “the executor says the flow works”.

## Investigation before mutation

For bugs and unexpected behavior:

1. reproduce or gather direct evidence;
2. identify the mechanism, not only the symptom;
3. search for sibling occurrences of the same failure class;
4. determine the smallest layer that should own the fix;
5. decide whether recurrence prevention belongs in code, test, guardrail, or documentation;
6. then mutate.

Recent Bivaque failures make this rule important: a bug found in one RPC, E2E fixture, HeroUI control, or notification path may expose a systematic class, not an isolated typo.

## Clean-state attribution

Before blaming a diff for a failing gate:

- check known repository traps;
- verify the database is in the correct seed/reset state;
- distinguish environment/tooling failure from product failure;
- reproduce from a clean baseline when practical;
- inspect whether another process contaminated local state.

Do not “fix” pre-existing unrelated failures inside the task unless they block proving the task and the scope expansion is explicitly recorded.

## Repository discovery

Use the indexed code graph for structural discovery when available, then read exact source before editing.

Current project identifier:

```text
bivaque-community
```

Use graph operations for architecture, symbol discovery, callers/callees, snippets, and blast radius.

The graph is an index, not ground truth. When coverage is partial or a security-sensitive conclusion depends on completeness, verify against exact source/search.

Do not use Graphify for this repository unless the repository configuration is explicitly changed; the existing project graph is `codebase-memory-mcp`.

## Plans

Executable plans live under `docs/superpowers/plans/`.

Before executing an existing plan:

- read `docs/superpowers/plans/README.md`;
- confirm the plan still matches current HEAD;
- reconcile file/line assumptions changed by later work;
- preserve explicit human gates;
- stop if a todo is wrong or impossible instead of improvising across a trust boundary.

A plan is a contract for execution, not proof that its assumptions remain true forever.

## Standard execution loop

For one task:

```text
1. inspect current state
2. establish/reconfirm execution contract
3. reproduce or baseline when relevant
4. implement smallest coherent change
5. run targeted proof
6. run required deterministic gates
7. inspect diff/blast radius
8. independent evaluation for non-trivial/risky work
9. runtime/E2E proof when the property crosses layers
10. record only evidence actually obtained
```

## Gates

Use repository-pinned commands. Do not replace them with remembered equivalents.

Fast edit loop:

```sh
npx pnpm@11.18.0 gate --fast
```

Required root gate before declaring general code work complete:

```sh
npx pnpm@11.18.0 gate
```

Additional build, database, E2E, and visual checks depend on the touched surface and its scoped instructions.

A green root gate does not prove an interaction-dependent user flow.

## Human-only boundaries

An agent must stop rather than silently decide when work requires a human-only gate recorded by the repository, including:

- R3 decisions lacking required approval/verdict;
- production-destructive operations;
- `--linked` database operations;
- secret rotation/account ownership/DNS/CNPJ/provider setup controlled externally;
- incident closure signatures or other explicitly human attestations;
- product decisions not derivable from existing canon.

A missing human gate is not a reason to fabricate completion evidence.

## Failure and retry policy

Do not loop indefinitely.

When an approach fails repeatedly:

1. stop retrying the same mechanism;
2. inspect the actual error/log/state;
3. reconsider the hypothesis;
4. consult current upstream docs/skills when the dependency is fast-moving;
5. escalate with the smallest unresolved question and evidence gathered.

Iteration budgets implemented by repository tooling take precedence where present.

## External skills

External skills are loaded **on demand**, not globally.

Rules:

- prefer official or maintainer-owned skills;
- use curated indexes for discovery, not as normative authority;
- do not load overlapping skills without a concrete reason;
- local product/security constraints override generic best practices;
- when upstream guidance conflicts with a pinned local version, verify compatibility before changing the dependency;
- record whether the skill used was installed/pinned or fetched from current upstream when reproducibility matters.

Subsystem-specific external skill selection belongs in the nearest scoped `AGENTS.md`, not here.

## Executor ≠ evaluator

For security-sensitive, authorization-sensitive, migration-heavy, or cross-layer tasks, independent evaluation is the default.

The evaluator receives:

- the execution contract;
- the resulting diff;
- test/gate evidence;
- access to reproduce relevant behavior.

The evaluator should not inherit the executor's conclusion as a premise.

## Guardrail promotion

When a recurring failure class is discovered, ask:

> Can this be prevented mechanically next time?

Prefer promotion in this order:

1. type/schema constraint;
2. structural/scope test;
3. focused unit/integration test;
4. runtime probe/gate;
5. scoped documentation;
6. root instruction only when truly cross-cutting and not mechanically enforceable.

The root `AGENTS.md` should not become an incident archive.

## Documentation update rule

Update documentation when the change alters a documented contract or state.

Do not create a new status/roadmap document when an existing source of truth already owns that information.

`docs/PRODUCT_STATUS.md` should record only verified implementation state. Capability existence without a closed user cycle is not “done”.

## Completion report

A useful agent completion report states:

- what changed;
- what property was proved;
- exact tests/gates actually run;
- runtime evidence actually obtained;
- anything still unverified;
- human/external blocker if one remains.

Do not report commands as passing if they were not run.

## Questions to settle before this becomes final

1. Which task classes should formally require a separate evaluator model rather than merely recommend one?
2. Should execution contracts be files, issue/task metadata, or ephemeral harness state?
3. Which external skills should be pinned by SHA/version versus intentionally tracking current upstream?
4. Should the harness automatically record the skill versions/SHAs loaded for each task?
5. Which current root `AGENTS.md` incident narratives can now be deleted because executable guardrails already cover them?
6. Should `tests/e2e/AGENTS.md` become a fourth scoped instruction file, or is Playwright guidance in `apps/web/AGENTS.md` enough for now?
