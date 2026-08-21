# RUNTIME_FINDINGS — empirical design evidence

> **Status: EMPTY / Phase 4 artifact.**
>
> Populate only after the independent reference is frozen and the incumbent conflict matrix exists. Runtime evidence is used to discriminate between competing rules, not to retroactively justify whatever the current implementation happens to do.

## Purpose

Confront specification with the real product at the layer where users experience it.

Classify every material finding as one of:

- `SPEC_DEFECT` — implemented behavior follows a bad/weak incumbent rule;
- `IMPLEMENTATION_DEFECT` — rule is defensible but implementation violates it;
- `SPEC_AND_IMPLEMENTATION_DEFECT` — both are wrong;
- `ACCEPTABLE_DIVERGENCE` — implementation differs for a defensible reason;
- `EXPERIMENT_REQUIRED` — runtime shows a real tradeoff but does not settle it;
- `NO_RUNTIME_ISSUE_OBSERVED` — tested behavior supports the rule for the tested case only.

Do not infer universal quality from one screenshot or viewport.

## Evidence hierarchy

Prefer direct evidence:

1. real browser interaction;
2. DOM/semantics/focus inspection;
3. console/network/runtime errors;
4. responsive behavior across relevant viewport classes;
5. screenshots/captures as visual evidence;
6. static source only to explain an observed mechanism.

Static JSX or component existence does not prove interaction quality.

## Required runtime dimensions

For disputed surfaces, inspect as applicable:

- narrow/mobile layout;
- medium/tablet or constrained layout where behavior changes;
- wide/desktop layout;
- keyboard-only operation;
- visible focus and focus return;
- touch-target feasibility;
- loading/streaming;
- true empty;
- denied/unavailable;
- backend/server failure;
- validation failure;
- success/populated state;
- long text/wrapping/overflow;
- reduced motion where motion is material;
- slow/failed network where the flow depends on remote state;
- authorization-sensitive allowed/denied behavior where UI communicates access.

Do not require irrelevant dimensions for every surface; record why omitted when a disputed rule depends on one.

## Finding table

| Runtime ID | Surface | Related current rule(s) | Reference rule(s) | Evidence | Classification | Severity | Reproducible? | Adjudication impact |
|---|---|---|---|---|---|---|---|---|
| RUN-001 | TBD | CUR-TBD | REF/RVIS-TBD | TBD | TBD | TBD | TBD | TBD |

## Detailed runtime record

```text
Runtime ID:
Surface/journey:
Environment/build:
Viewport/input mode:
Preconditions/data state:

Current Rule IDs:
Reference Rule IDs:
Conflict question:

Steps:
Observed behavior:
Expected/reference behavior:

DOM/semantic evidence:
Focus/keyboard evidence:
Console/network evidence:
Screenshot/capture reference:
Data/auth evidence if relevant:

Classification:
Severity:
Reproducibility:
Alternative explanation considered:
Adjudication impact:
```

## Bounded experiments

Use experiments when a weakly supported numerical/visual choice cannot be resolved from standards or product invariants.

Template:

```text
Experiment ID: EXP-001
Question:
Competing rules/values:
Why standards do not settle it:
Candidates:
Target surfaces:
Target viewport/input classes:
Evaluation criteria:
Success/failure signals:
Evidence collected:
Result:
Confidence:
Follow-up needed:
```

Examples of legitimate experiment classes:

- navigation width/density;
- content measure;
- card/list density;
- breakpoint/layout transition threshold;
- hierarchy emphasis;
- disclosure pattern when both are accessible and technically valid.

Do not use experiments to waive objective accessibility/security/framework defects.

## Runtime completion check

Before adjudication, ensure runtime evidence exists for every material conflict whose resolution depends on actual interaction or layout behavior, especially:

- compound controls;
- forms;
- navigation;
- overlays;
- loading/error/empty distinctions;
- responsive transitions;
- focus/keyboard behavior;
- disputed density/spacing/layout decisions;
- any current rule that claims a universal interaction property.
