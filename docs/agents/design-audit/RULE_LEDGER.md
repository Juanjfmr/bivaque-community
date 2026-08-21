# RULE_LEDGER — incumbent normative extraction

> **Status: EMPTY / Phase 2 artifact.**
>
> Populate only after `REFERENCE_DESIGN_SPEC.md` and `REFERENCE_VISUAL_GUIDE.md` are frozen. This ledger extracts incumbent rules from `docs/agents/DESIGN_SPEC.md` and `docs/agents/VISUAL_GUIDE.md` without defending or improving them.

## Extraction rules

- Extract every materially normative statement.
- Preserve the incumbent wording as faithfully as practical.
- Split compound rules when parts can receive different evidence/verdicts.
- Do not merge separate rules because they sound similar.
- Do not upgrade a suggestion into a requirement.
- Do not downgrade `must/never/exactly` language during extraction.
- Record conflicts between incumbent rules without resolving them here.
- Record exact source section/line where possible.
- Numerical specificity is not evidence.

## Rule types

Use exactly one primary type:

- `product-invariant` — changing it changes product meaning, trust, privacy, authorization, or an explicit product model;
- `design-decision` — intentional but contestable UX/visual choice;
- `implementation-guidance` — technical/how-to direction;
- `objective-standard` — accessibility, semantic, framework, or other externally testable requirement.

If classification is genuinely ambiguous, choose the closest type and explain in `Notes`; do not create hybrid categories.

## Absolute-language flag

Set `Absolute? = YES` when the incumbent wording uses or clearly implies:

- always / never / must / exactly / only / every / cannot;
- sempre / nunca / deve / exatamente / somente / todo / não pode;
- fixed numerical ceilings/floors stated as universal requirements.

Absolute rules require proportionally stronger evidence in later phases.

## Current-support score

Score the incumbent rule **before** comparing it to the independent reference:

- **5** — product/objective invariant with strong rationale and direct evidence;
- **4** — strong explicit rationale and credible supporting evidence;
- **3** — reasonable contextual decision, materially unvalidated;
- **2** — historical convention or weak rationale;
- **1** — arbitrary/unexplained choice;
- **0** — contradicted by current product truth or objective evidence already available from its own source context.

Do not use the frozen reference to set this score; comparison belongs in `CONFLICT_MATRIX.md`.

## Ledger

| Rule ID | Source | Incumbent statement | Type | Absolute? | Current support 0–5 | Claimed rationale | Internal conflict | Notes |
|---|---|---|---|---|---:|---|---|---|
| CUR-001 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Detailed record template

Use this expanded form when a rule needs context that does not fit the table:

```text
Rule ID:
Source file/section/line:
Exact or faithful statement:
Type:
Absolute language:
Scope:
Claimed rationale in source:
Dependencies/assumptions:
Current-support score:
Known incumbent conflicts:
Notes:
```

## Extraction completeness check

Before Phase 3 begins, verify that the ledger covers at minimum all incumbent rules concerning:

- product/reference identity claims;
- navigation and shell structure;
- information hierarchy;
- responsive breakpoints/layout transitions;
- token/color system;
- typography;
- spacing/density;
- radius/elevation;
- motion;
- component/library/wrapper behavior;
- forms/controls;
- loading/empty/error/success states;
- accessibility/contrast/touch/focus;
- cards/feed/list behavior;
- modal/overlay behavior;
- mobile/desktop differences;
- copy/labels;
- per-surface wireframe or behavior requirements;
- any `never`, `must`, `exactly`, fixed-count, or fixed-size rule.

Phase 2 is not complete while material normative prose remains unrepresented simply because it was embedded in examples, tables, wireframes, captions, or commentary.
