# CONFLICT_MATRIX — reference versus incumbent

> **Status: EMPTY / Phase 3 artifact.**
>
> Populate only after the independent reference is frozen and `RULE_LEDGER.md` is complete.

## Purpose

Compare each incumbent rule against the independent reference without treating either side as infallible.

The comparison must separate:

- product-context advantage;
- objective external evidence;
- implementation convenience;
- aesthetic preference;
- historical inertia.

## Allowed comparison outcomes

Use one primary outcome:

- `ALIGNED` — materially the same rule and rationale;
- `ALIGNED_BUT_OVERSPECIFIED` — incumbent intent is compatible but wording/value is more rigid than evidence supports;
- `REFERENCE_STRONGER` — reference has materially stronger evidence for a different or broader rule;
- `INCUMBENT_HAS_PRODUCT_CONTEXT` — incumbent differs for a product-specific reason the reference did not or could not fully capture;
- `DIRECT_CONFLICT` — both prescribe incompatible behavior;
- `NO_REFERENCE_EQUIVALENT` — incumbent has no meaningful reference counterpart;
- `EXPERIMENT_REQUIRED` — neither side has enough evidence for a fixed rule;
- `INSUFFICIENT_EVIDENCE` — comparison cannot yet be made responsibly.

## Evidence discipline

For every comparison:

- cite/reference the incumbent Rule ID;
- cite/reference the relevant `REF-*` / `RVIS-*` rule when one exists;
- record the evidence class, not just the conclusion;
- distinguish objective standards from design heuristics;
- do not resolve a conflict because one source is newer;
- do not resolve a conflict because one source is local;
- do not convert an incumbent product invariant into a visual preference;
- do not convert an aesthetic preference into an objective standard.

## Matrix

| Current Rule | Current support | Reference Rule | Ref confidence | Outcome | Stronger evidence | Missing evidence | Runtime question | Candidate action |
|---|---:|---|---:|---|---|---|---|---|
| CUR-001 | TBD | REF/RVIS-TBD | TBD | TBD | TBD | TBD | TBD | TBD |

Candidate action is provisional only:

- `KEEP_CANDIDATE`;
- `AMEND_CANDIDATE`;
- `DELETE_CANDIDATE`;
- `EXPERIMENT_CANDIDATE`;
- `HUMAN_DECISION_CANDIDATE`.

Final verdict belongs in `ADJUDICATION.md` after runtime evidence.

## Detailed conflict record

```text
Current Rule ID:
Reference Rule ID(s):
Comparison outcome:

Current claim:
Reference claim:

Product-context difference:
Objective standards evidence:
Framework/component evidence:
UX/design evidence:
Aesthetic/brand evidence:

Current-support score:
Reference-confidence score:

Why they align/conflict:
What is still unknown:
What runtime evidence would discriminate:
Provisional candidate action:
```

## Conflict quality check

Before Phase 4, ensure the matrix explicitly identifies:

- every current rule with support 0–2;
- every reference `MUST` that the incumbent violates or does not address;
- every incumbent absolute rule with reference confidence below 4;
- every fixed number/value where both sides rely mainly on heuristic judgment;
- every accessibility/semantic/interaction conflict;
- every place where the incumbent has legitimate product context absent from generic external guidance;
- every direct conflict between `DESIGN_SPEC.md` and `VISUAL_GUIDE.md` themselves.
