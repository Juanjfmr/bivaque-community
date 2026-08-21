# REFERENCE_DESIGN_SPEC — independent benchmark

> **Status: NOT YET GENERATED.**
>
> This file must be produced in a fresh context under the contamination rules in `README.md`. Do not fill it from a context that has read `docs/agents/DESIGN_SPEC.md`, `docs/agents/VISUAL_GUIDE.md`, current UI source, or current screenshots.

## Generation contract

The generator receives product truth + stack constraints + current standards/specialist sources, but not the incumbent design solution.

The output must answer:

> If Bivaque were designed today, what interaction/design standard would best satisfy the product, user, accessibility, engineering, and platform constraints?

Do not compare against the current Bivaque design. Do not preserve a choice merely because it may already exist.

## Required structure

### 1. Product interaction principles

Define the smallest set of durable principles that follow from Bivaque's actual product problem and trust model.

For each principle record:

- statement;
- type;
- `MUST | SHOULD | MAY | EXPERIMENT`;
- rationale;
- evidence/source class;
- reference confidence `1–5`;
- validation/falsification method.

### 2. Information architecture

Specify:

- top-level mental model;
- locality/community/group relationship;
- navigation model and limits;
- discovery/search model;
- content hierarchy;
- progressive disclosure;
- role-specific surfaces;
- mobile/desktop implications.

Do not hard-code a number of destinations or containers unless product evidence justifies it.

### 3. Core journeys

Cover at minimum the current product-significant journeys described in `docs/BIVAQUE.md`, including controlled access, locality/community participation, content consumption/creation, discovery, moderation/reporting where applicable, and service-provider/vitrine boundaries where applicable.

For each journey define:

- user goal;
- entry conditions;
- primary path;
- failure/recovery path;
- trust/privacy requirements;
- state feedback;
- accessibility implications;
- proof criteria.

### 4. Responsive strategy

Define behavior from constraints and content needs rather than inheriting incumbent breakpoints.

Record:

- mobile-first priorities;
- transition points that should be content/layout-driven;
- navigation adaptation;
- readable content width;
- density rules;
- touch vs pointer behavior;
- overflow behavior;
- orientation/viewport stress cases.

Exact breakpoints require rationale; otherwise specify criteria/ranges and mark `EXPERIMENT` where appropriate.

### 5. Component interaction contract

Define interaction semantics for the component classes Bivaque needs, using canonical HeroUI behavior where appropriate and current standards where HeroUI does not decide the product behavior.

Cover at minimum:

- buttons/actions;
- text inputs/forms;
- checkbox/radio/selection controls;
- select/listbox/menu;
- dialogs/sheets/popovers;
- tabs/segmented navigation if justified;
- cards/list rows;
- feedback/toast/inline status;
- empty/loading/error states.

Do not invent wrapper behavior that conflicts with the installed HeroUI contract without explicit rationale.

### 6. State model

Specify how the UI distinguishes:

- initial/loading;
- partial/streaming;
- true empty;
- denied/not available;
- recoverable failure;
- destructive failure;
- optimistic/pending action;
- success;
- stale/retry states where relevant.

A backend/query failure must never masquerade as a legitimate empty state.

### 7. Accessibility and input model

Specify objective requirements for:

- semantic structure;
- heading hierarchy;
- keyboard;
- focus order/visibility/return;
- labels/descriptions/errors;
- touch target behavior;
- contrast/non-color cues;
- reduced motion;
- screen-reader state announcements;
- text zoom/reflow;
- locale-aware content.

### 8. Performance-visible UX

Define user-visible performance rules for:

- route transitions;
- streaming/suspense;
- loading feedback;
- image/media behavior;
- client/server boundaries;
- interaction latency;
- avoiding unnecessary JS/client state when it degrades experience.

Framework guidance must match the installed Next.js version.

### 9. Design token model

Define which semantic token categories are necessary without inheriting incumbent values.

At minimum evaluate:

- surface/background hierarchy;
- text hierarchy;
- action/accent semantics;
- success/warning/danger/info;
- border/focus;
- spacing;
- radii;
- elevation;
- typography;
- motion.

Distinguish semantic necessity from aesthetic value choice.

### 10. Normative rule table

End with an auditable table:

| Ref ID | Rule | Type | Strength | Confidence | Evidence class | Validation |
|---|---|---|---|---:|---|---|
| REF-001 | ... | ... | MUST | 5 | ... | ... |

IDs are stable within the frozen reference. Once Phase 2 starts, do not renumber existing reference rules.

## Quality bar

Reject these failure modes:

- copying familiar SaaS patterns without product rationale;
- treating aesthetic preference as `MUST`;
- false precision;
- generic accessibility claims without interaction consequences;
- framework advice from model memory instead of version-matched docs;
- adding dependencies because an external example uses them;
- redesigning product truth instead of the interface around it;
- mentioning or anticipating incumbent design choices.
