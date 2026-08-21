# ADJUDICATION — final design-rule verdicts

> **Status: EMPTY / Phase 5 artifact.**
>
> Populate only after the independent reference, incumbent rule ledger, conflict matrix, and required runtime findings exist.

## Purpose

Issue traceable verdicts on incumbent design rules using the strongest available product, standards, specialist, and runtime evidence.

The adjudicator must not treat either the incumbent or the reference as infallible.

## Allowed verdicts

Use exactly one final verdict per material current rule:

- **KEEP** — incumbent rule is sufficiently supported and remains normative;
- **AMEND** — the intent survives but wording, specificity, scope, or implementation contract is wrong;
- **DELETE** — the rule should no longer be normative;
- **EXPERIMENT** — available evidence cannot justify a fixed rule yet;
- **HUMAN_DECISION** — a genuine product/brand tradeoff remains and cannot be derived safely from available evidence.

Reference-only rules that expose a missing incumbent requirement may also receive:

- **ADD** — introduce a new normative rule because the reference/runtime/standard evidence justifies it.

`ADD` must never be used for weak aesthetic preference without explicit human/product rationale.

## Decision discipline

A verdict must cite:

- current Rule ID, if applicable;
- reference Rule ID(s), if applicable;
- conflict outcome;
- relevant Runtime ID(s), if applicable;
- strongest evidence class;
- confidence;
- exact rewrite implication.

Do not write vague conclusions such as “improve spacing” or “make more modern.”

## Adjudication table

| Decision ID | Current Rule | Reference Rule(s) | Runtime | Verdict | Confidence | Reason | Rewrite action |
|---|---|---|---|---|---:|---|---|
| DEC-001 | CUR-TBD | REF/RVIS-TBD | RUN/EXP-TBD | TBD | TBD | TBD | TBD |

## Detailed decision record

```text
Decision ID:
Current Rule ID:
Reference Rule ID(s):
Conflict outcome:
Runtime/Experiment ID(s):

Verdict: KEEP | AMEND | DELETE | EXPERIMENT | HUMAN_DECISION | ADD
Confidence: 1–5

Product evidence:
Objective standards/framework evidence:
UX/design evidence:
Runtime evidence:

Rejected alternative(s):
Why rejected:

Final rule intent:
Required wording/scope change:
Implementation consequence:
Test/audit consequence:
Human follow-up if any:
```

## Confidence

Use the final decision confidence conservatively:

- **5** — objective/product invariant plus direct evidence; alternatives materially falsified;
- **4** — strong convergent evidence with minor contextual uncertainty;
- **3** — defensible decision with real tradeoffs; monitor/validate;
- **2** — weak evidence; normally should be `EXPERIMENT` or `HUMAN_DECISION` rather than a hard rule;
- **1** — insufficient to establish a normative rule.

A confidence-1/2 `KEEP`, `AMEND`, or `ADD` requires explicit justification for why an experiment/human decision is impossible or disproportionate.

## Rewrite manifest

Before editing `docs/agents/DESIGN_SPEC.md` or `docs/agents/VISUAL_GUIDE.md`, produce a concrete rewrite manifest here:

| Target document/section | Decision IDs | Operation | Intended effect |
|---|---|---|---|
| TBD | DEC-TBD | keep/amend/delete/add | TBD |

No design-document mutation is authorized by this audit unless it maps to an adjudicated decision.

## Post-rewrite verification

After Phase 6 rewrite, append verification records:

| Verification ID | Decision IDs | Check | Result | Evidence | Remaining risk |
|---|---|---|---|---|---|
| VER-001 | DEC-TBD | standards/runtime/etc. | TBD | TBD | TBD |

The audit program remains open while material `EXPERIMENT`, `HUMAN_DECISION`, failed verification, or untraceable rewrite items remain unresolved.
