# ADJUDICATION — final design-rule verdicts

> **Status: PHASE 5.5 COMPLETE — ADVERSARIAL ADJUDICATION FROZEN.**
>
> This revision supersedes the Phase 5 verdict set committed at `6a4f22e5fe88edddcd4cb51c917a8fd990b1184a`.
> Phase 1–4 evidence remains frozen and unchanged. The Phase 5.5 review attacks only the adjudication layer.
>
> Runtime evidence remains anchored to Phase 4's frozen baseline at
> `d9f1a9e858c566e6103094a4aa23b1110527846f`, reconciled in
> `2d27434641d237af861f9d999c392ed1deba26a9`.

## Why Phase 5.5 exists

The first adjudication asked too often whether an incumbent idea was *valid*. This pass asks the stricter question:

> **Does this incumbent statement deserve to survive as an independent normative rule in `DESIGN_SPEC.md` or `VISUAL_GUIDE.md`?**

A rule no longer survives merely because it is true, harmless, implemented, or repeated. `KEEP` is deliberately difficult to earn.

## Adversarial survival tests

Every incumbent rule was re-tested against seven gates:

1. **Normative necessity** — if the rule disappears, does the design contract become materially unsafe or underspecified?
2. **Document fit** — is this design/interaction authority, rather than product inventory, auth configuration, feature specification, implementation detail, audit governance, or storage/security plumbing?
3. **Canonicality** — is it the one rule that should express the concept, rather than a duplicate or second-source restatement?
4. **Abstraction** — does it specify an outcome/contract at the right level instead of freezing incidental JSX, route, token, width, count, timing, or component anatomy?
5. **Survival wording** — could the current wording and scope remain materially unchanged? If not, it is not `KEEP`.
6. **Experiment-worthiness** — is the incumbent choice a meaningful candidate worth comparative testing? Micro-values do not earn `EXPERIMENT` merely because evidence is weak.
7. **Replacement test** — where a stronger frozen reference rule makes the incumbent formulation unnecessary, prefer `DELETE + consolidated reference-backed rule` over preserving weak genealogy through `AMEND`.

`DELETE` therefore means **the incumbent statement does not survive as an independent design rule**. It does not necessarily mean the feature is removed. A deleted rule may be:
- consolidated into a stronger vNext rule;
- moved to product/feature/engineering/security documentation;
- retained only as historical/current-candidate evidence;
- discarded as duplicate, stale, contradictory, or unjustified micro-prescription.

## Before / after

| Verdict | Phase 5 | Phase 5.5 | Delta |
|---|---:|---:|---:|
| `KEEP` | 107 | 21 | -86 |
| `AMEND` | 99 | 24 | -75 |
| `DELETE` | 8 | 423 | +415 |
| `EXPERIMENT` | 246 | 14 | -232 |
| `HUMAN_DECISION` | 25 | 3 | -22 |
| **Total incumbent** | **485** | **485** | **0** |

The large `DELETE` count is intentional. Phase 5.5 treats duplication, wrong-document rules and micro-prescriptions as design debt rather than as material that vNext must preserve.

## Authoritative incumbent coverage ledger

Every `CUR-001` through `CUR-485` appears exactly once below. This ledger supersedes the Phase 5 coverage ledger.

- `CUR-001–014` → **DELETE**; `CUR-015–016` → **AMEND**; `CUR-017` → **DELETE**.
- `CUR-018` → **EXPERIMENT**; `CUR-019–074` → **DELETE**; `CUR-075` → **AMEND**.
- `CUR-076` → **KEEP**; `CUR-077–080` → **DELETE**; `CUR-081–082` → **AMEND**.
- `CUR-083–091` → **DELETE**; `CUR-092` → **KEEP**; `CUR-093` → **AMEND**.
- `CUR-094–101` → **DELETE**; `CUR-102` → **AMEND**; `CUR-103–114` → **DELETE**.
- `CUR-115–116` → **AMEND**; `CUR-117–123` → **DELETE**; `CUR-124` → **AMEND**.
- `CUR-125–130` → **DELETE**; `CUR-131` → **AMEND**; `CUR-132` → **EXPERIMENT**.
- `CUR-133–136` → **DELETE**; `CUR-137` → **KEEP**; `CUR-138` → **AMEND**.
- `CUR-139` → **DELETE**; `CUR-140` → **AMEND**; `CUR-141–147` → **DELETE**.
- `CUR-148` → **EXPERIMENT**; `CUR-149–153` → **DELETE**; `CUR-154` → **AMEND**.
- `CUR-155–170` → **DELETE**; `CUR-171` → **EXPERIMENT**; `CUR-172–177` → **DELETE**.
- `CUR-178` → **AMEND**; `CUR-179` → **KEEP**; `CUR-180–181` → **DELETE**.
- `CUR-182` → **AMEND**; `CUR-183` → **EXPERIMENT**; `CUR-184–188` → **DELETE**.
- `CUR-189` → **EXPERIMENT**; `CUR-190` → **DELETE**; `CUR-191–192` → **KEEP**.
- `CUR-193–198` → **DELETE**; `CUR-199` → **EXPERIMENT**; `CUR-200–202` → **DELETE**.
- `CUR-203` → **AMEND**; `CUR-204–206` → **DELETE**; `CUR-207` → **KEEP**.
- `CUR-208–219` → **DELETE**; `CUR-220` → **HUMAN_DECISION**; `CUR-221–223` → **DELETE**.
- `CUR-224` → **AMEND**; `CUR-225–231` → **DELETE**; `CUR-232` → **AMEND**.
- `CUR-233–236` → **KEEP**; `CUR-237` → **EXPERIMENT**; `CUR-238` → **DELETE**.
- `CUR-239` → **HUMAN_DECISION**; `CUR-240–245` → **DELETE**; `CUR-246–247` → **KEEP**.
- `CUR-248–249` → **DELETE**; `CUR-250–252` → **KEEP**; `CUR-253–279` → **DELETE**.
- `CUR-280` → **EXPERIMENT**; `CUR-281–292` → **DELETE**; `CUR-293` → **KEEP**.
- `CUR-294–300` → **DELETE**; `CUR-301` → **AMEND**; `CUR-302` → **EXPERIMENT**.
- `CUR-303–315` → **DELETE**; `CUR-316` → **AMEND**; `CUR-317–318` → **DELETE**.
- `CUR-319` → **HUMAN_DECISION**; `CUR-320–335` → **DELETE**; `CUR-336–337` → **KEEP**.
- `CUR-338–345` → **DELETE**; `CUR-346` → **KEEP**; `CUR-347–352` → **DELETE**.
- `CUR-353` → **EXPERIMENT**; `CUR-354–379` → **DELETE**; `CUR-380` → **EXPERIMENT**.
- `CUR-381` → **DELETE**; `CUR-382` → **EXPERIMENT**; `CUR-383–430` → **DELETE**.
- `CUR-431` → **EXPERIMENT**; `CUR-432–448` → **DELETE**; `CUR-449` → **KEEP**.
- `CUR-450–458` → **DELETE**; `CUR-459` → **AMEND**; `CUR-460–465` → **DELETE**.
- `CUR-466` → **AMEND**; `CUR-467–476` → **DELETE**; `CUR-477` → **AMEND**.
- `CUR-478–485` → **DELETE**.

## `KEEP` survivors — exact incumbent rules that earned survival

Only these 21 rules remain `KEEP`:

| Current rules | Why they survive unchanged |
|---|---|
| `CUR-076` | Meaning cannot depend on motion alone; correct normative level and scope. |
| `CUR-092` | Optimistic failure visibly reconciles/rolls back; direct state-truth requirement. |
| `CUR-137` | CPF is not echoed after submission; concrete privacy UX constraint. |
| `CUR-179` | Pending private-group membership request persists; truthful durable state. |
| `CUR-191–192` | Private event location is authorization-gated and enforced server-side; direct trust boundary. |
| `CUR-207` | No-results retains the active query; preserves recovery/search context. |
| `CUR-233–236` | Profile does not expose public verification prestige, rank, OM, or address; direct privacy/trust constraints. |
| `CUR-246–247` | Controls have accessible names and images carry `alt`; objective semantics. |
| `CUR-250–252` | Modal focus trap, Escape dismissal and focus return match the required modal interaction contract. |
| `CUR-293` | New Portuguese copy uses correct diacritics; concrete locale/copy correctness. |
| `CUR-336–337` | Privileged/provider shells remain distinct from member navigation; role truth changes access context. |
| `CUR-346` | Raw Supabase/Postgres error strings never reach user-facing error UI. |
| `CUR-449` | Login/onboarding remain outside the authenticated member shell and member navigation. |

A `KEEP` may be relocated within the rewritten document for consolidation, but Phase 6 may not weaken its normative intent.

## `AMEND` survivors — concepts worth keeping, incumbent wording not good enough

| Current rules | Final intent after amendment |
|---|---|
| `CUR-015` | Replace “institutional” authority framing with calm, trustworthy, practical, community-operated and explicitly non-official character. |
| `CUR-016` | Keep semantic-token discipline, but specify semantic roles and sanctioned exceptions rather than “everything visual reads tokens”. |
| `CUR-075` | Reduced-motion removes/materially reduces non-essential motion while preserving necessary state feedback. |
| `CUR-081–082` | Pending buttons retain action meaning; skeleton/fallback geometry approximates the final region without requiring one exact recipe. |
| `CUR-093` | Failure feedback remains persistent enough for recovery; no universal shake/toast recipe. |
| `CUR-102` | Modal/sheet choice follows task, viewport and modality semantics; mobile does not automatically imply draggable bottom sheet. |
| `CUR-115–116` | Use meaningful loading/Suspense boundaries and preserve stable shell/context; no blanket `loading.tsx`-per-segment rule. |
| `CUR-124` | Pre-auth exposes product identity; wordmark is one implementation, not the invariant itself. |
| `CUR-131` | Access gating/verification context is communicated at the decision point, not necessarily in one footer slot. |
| `CUR-138` | Verification pending state explains what is happening and what follows; presentation is not fixed to one progress widget. |
| `CUR-140` | Failures are actionable and privacy-safe; “specific” never means leaking eligibility or internal cause detail. |
| `CUR-154` | Feed/discovery items expose decision-critical source/scope/freshness metadata; exact “locality + relative time” anatomy is not universal. |
| `CUR-178` | Membership CTA/state communicates the actual join/request consequence; exact label is product-copy dependent. |
| `CUR-182` | Moderation/governance actions are privilege-gated and appear in a clearly privileged context; authorization is not a cosmetic hide/show contract. |
| `CUR-203` | Recommendation/service discovery exposes meaningful source/endorsement context without fixing one card sentence. |
| `CUR-224` | Unread/selection state uses semantic plus non-color cues; `--accent-soft` is only a candidate treatment. |
| `CUR-232` | Role/verification truth is exposed only when task-relevant and never upgraded into prestige or stronger verification claims. |
| `CUR-301` | Primary navigation reflects user tasks/outcomes while membership scope remains a separate concept. |
| `CUR-316` | Event information respects the active/authorized locality/community scope without hard-coding its top-level navigation placement. |
| `CUR-459` | Privacy/data-minimization explanation appears where the person decides to submit sensitive verification data. |
| `CUR-466` | Material loading/empty/denied/error/pending/success/stale states are distinguishable when applicable; no checklist of decorative components. |
| `CUR-477` | Page-level horizontal overflow is prevented subject to legitimate two-dimensional-content exceptions and WCAG reflow requirements. |

## `EXPERIMENT` survivors — only meaningful competing hypotheses

The following 14 incumbent rules are retained only as explicit candidates. All other weakly evidenced micro-values were deleted rather than promoted into hundreds of pseudo-experiments.

| Current rule | Experiment represented |
|---|---|
| `CUR-018` | Incumbent Navy Professional visual direction as one EXP-004 candidate, not the winner. |
| `CUR-132` | Short staged admission vs single-page/other grouping. |
| `CUR-148` | “Recentes / Relevantes” as a candidate activity-sorting model. |
| `CUR-171` | Group discovery using card/grid composition. |
| `CUR-183` | Event grouping by date. |
| `CUR-189` | Three-state RSVP control (“Vou / Talvez / Não vou”). |
| `CUR-199` | Horizontally scrollable category discovery for recommendations. |
| `CUR-237` | Profile sections as Publicações / Eventos / Configurações tabs. |
| `CUR-280` | System sans stack as one typography candidate. |
| `CUR-302` | Fixed four-container navigation model as one EXP-001 candidate. |
| `CUR-353` | Modal composer as one EXP-002 candidate. |
| `CUR-380` | “Meus grupos / Descobrir” peer-view model. |
| `CUR-382` | Row/list group discovery as the competing EXP-003 candidate to `CUR-171`. |
| `CUR-431` | Today/week/older notification grouping. |

Exact token values, radii, spacings, breakpoints, widths, animation distances/durations, skeleton counts, clamp counts and similar micro-prescriptions remain recoverable from the frozen ledger/runtime baseline but are **not** individual vNext experiments. EXP-004 compares coherent systems, not 200 isolated knobs.

## `HUMAN_DECISION` survivors

Only three current rules genuinely depend on unresolved product authority:

| Current rule | Human question |
|---|---|
| `CUR-220` | If private messaging survives, what shared-context/eligibility model authorizes a thread? |
| `CUR-239` | What is the canonical profile-visibility policy? |
| `CUR-319` | If private messaging survives, does it belong in the member task IA at all, and where? |

All other detailed messaging rules (`CUR-208–219`, `CUR-221–222`, `CUR-417–430`) are deleted as premature UI specification. A single product decision should not keep 20+ speculative layout rules alive.

## Major deletion classes

### RT-DEL-001 — competitor/source authority
`CUR-001–011` are deleted. “Do/don't copy Nextdoor” is not design authority. Patterns may return only on Bivaque-specific evidence.

### RT-DEL-002 — raw product/feature inventory in design docs
Examples include `CUR-012–014`, `CUR-126`, `CUR-128`, `CUR-136`, `CUR-141`, `CUR-238`, `CUR-240–241`, `CUR-445`, `CUR-447–448`, `CUR-453`, `CUR-455–456`, `CUR-458`.
These facts/configurations belong in product/auth/feature contracts when still true. The design contract keeps only the UX/trust consequence.

### RT-DEL-003 — false precision and micro-prescription
Most exact colors, font sizes, gaps, radii, elevations, widths, breakpoints, counts, durations, animation distances, skeleton counts and clamps are deleted as independent rules. Their *system-level* choice remains EXP-004.

### RT-DEL-004 — duplicated normative copies
When DESIGN_SPEC and VISUAL_GUIDE repeat the same rule, only a canonical rule survives. Examples include the duplicated profile-privacy set, event privacy rules, query-preserving no-results rule, group pending-state rules, auth-provider inventory, pre-auth navigation and copy/accent rubrics.

### RT-DEL-005 — surface anatomy that should be outcome-driven
“Card shows X at left, Y at right, three avatars, 48px thumbnail, two comment previews...” is not retained as law unless the element is required for trust/task comprehension. Phase 6 specifies information hierarchy and proof criteria, not frozen wireframe anatomy.

### RT-DEL-006 — implementation/harness governance in the wrong document
`CUR-149`, `CUR-206`, `CUR-258`, `CUR-281`, `CUR-409`, `CUR-461`, `CUR-484`, `CUR-485` and similar implementation/audit mechanics do not belong as user-facing design authority. Relevant checks move to engineering/audit contracts.

### RT-DEL-007 — documentary contradictions and stale geometry
The fixed four-container derivatives, legacy five-destination wireframes, conflicting Recommendations/Event placements, and hardcoded desktop geometry are deleted unless a single rule remains as an explicit candidate under EXP-001.

## Consolidated vNext additions

These are the only new canonical rules introduced by Phase 5.5. `CUR-015` and `CUR-016` carry the corrected brand and semantic-token contracts through `AMEND`; they are not duplicated here as `ADD`.

| Decision ID | Reference / runtime | Verdict | Confidence | New canonical rule |
|---|---|---|---:|---|
| `RT-ADD-001` | REF-001/002; RUN-005/010/021 | **ADD** | 5 | Consequential publish/share/moderation exposes effective audience/scope before commit; navigation/retry/context changes never silently widen it. |
| `RT-ADD-002` | REF-006/007/013 | **ADD** | 5 | Durable knowledge is independently recoverable through structured search/discovery; chronological activity is never the only retrieval path. |
| `RT-ADD-003` | REF-008/009/010/011/012; RUN-004/005/018 | **ADD** | 5 | Task navigation and membership scope are distinct. Scope is inspectable where material, and the same route cannot silently change conceptual parent across viewport variants. |
| `RT-ADD-004` | REF-022/024/026; RVIS-040; RUN-007/012/013 | **ADD** | 5 | Native semantics come first; HeroUI/React Aria compound controls preserve canonical name/role/state/focus/keyboard behavior unless a documented, tested semantic fallback is stronger. |
| `RT-ADD-005` | REF-023/030 | **ADD** | 5 | Forms use persistent accessible labels and programmatically associated help/error/required/invalid state; placeholder alone is never the label. |
| `RT-ADD-006` | REF-027/028/029/035/036; RUN-008/009/011 | **ADD** | 5 | Material states are truthful and distinguishable; failure never masquerades as empty, expected failures remain recoverable UI state, and performance/optimism never hides failed or stale trust-relevant state. |
| `RT-ADD-007` | REF-018/020/030/031/032; RVIS-020/034/041/043; RUN-002/014/023 | **ADD** | 5 | Production UI uses WCAG 2.2 AA as the objective baseline, including correct reflow, pointer-target criterion/exceptions, contrast/non-color cues, visible focus, zoom/text resize, locale and reduced-motion behavior. |
| `RT-ADD-008` | REF-017/019/021; RVIS-003/017/021/041 | **ADD** | 4 | Responsive transitions and content widths are content-fit/task-driven; long reading measure is bounded while scan/governance surfaces may widen when hierarchy remains clear. Exact thresholds remain experimental. |
| `RT-ADD-009` | REF-014; RVIS-003/022/023 | **ADD** | 4 | Discovery/list items expose enough source, scope, freshness, type and trust metadata to decide whether to open them; exact card/row anatomy is not normative. |
| `RT-ADD-010` | REF-034; RVIS-015/045; RUN-011 | **ADD** | 4 | Loading/streaming boundaries correspond to user-perceived regions, preserve stable shell/context and use fallbacks shaped to the pending region without gratuitous skeleton flashes. |

## Adversarial decision records

| Decision ID | Incumbent family | Verdict effect | Reason |
|---|---|---|---|
| `RT-DEC-001` | `CUR-001–015` | delete most; amend `CUR-015` | Product/competitor authority was being mistaken for design authority. |
| `RT-DEC-002` | visual tokens/type/spacing/motion micro-rules | delete most; keep only `CUR-018`/`CUR-280` as system candidates | EXP-004 evaluates coherent candidate systems, not independent pixel/duration laws. |
| `RT-DEC-003` | component/state micro-recipes | delete duplicates/microdetails; amend behaviorally meaningful rules | Keep interaction outcome and recovery semantics, not decorative recipe. |
| `RT-DEC-004` | access/onboarding | move provider/config inventory out; keep/amend privacy/task consequences | Google, magic-link, CPF formatting and waitlist inventory are not design-system rules. |
| `RT-DEC-005` | feed/groups/events/recommendations/profile anatomy | delete most exact anatomy; preserve trust metadata, privacy and meaningful experiments | vNext should define information hierarchy and proof criteria, not old wireframes. |
| `RT-DEC-006` | messaging | delete detailed UI; retain only three product-level human questions | Feature/product authority must precede chat layout authority. |
| `RT-DEC-007` | accessibility gates | delete false/duplicated formulations; add corrected WCAG/APG baseline | Objective standards deserve one accurate canonical contract. |
| `RT-DEC-008` | navigation | delete fixed descendants/geometry; amend `CUR-301`; keep `CUR-302` only as candidate | The old ontology cannot bootstrap its own correctness. |
| `RT-DEC-009` | duplicate VISUAL_GUIDE rules | delete when they merely repeat DESIGN_SPEC or a new canonical rule | Repetition is not additional evidence and should not create two authorities. |
| `RT-DEC-010` | rubric/harness rules | delete from design contract | Audit mechanics belong to executable audit/harness documentation, not user-facing design law. |

## Open experiment register after red team

| Experiment | Current-rule candidates retained | What remains open |
|---|---|---|
| EXP-001 primary navigation | `CUR-302` + runtime current shell | task-nav/scope model, destination set, narrow/medium/wide presentation |
| EXP-002 composer | `CUR-353` + runtime modal evidence | modal vs inline vs adaptive |
| EXP-003 groups | `CUR-171` vs `CUR-382` | cards vs rows vs hybrid under realistic content |
| EXP-004 visual system | `CUR-018`, `CUR-280` + frozen runtime screenshots/tokens | coherent palette/type/spacing/radius/elevation/motion candidates |
| EXP-005 admission grouping | `CUR-132` | single surface vs short staged flow |
| EXP-006 activity sorting | `CUR-148` | whether Recentes/Relevantes improves retrieval/noise |
| EXP-007 event presentation | `CUR-183`, `CUR-189` | date grouping and RSVP model |
| EXP-008 recommendation discovery | `CUR-199` | horizontal category discovery vs alternatives |
| EXP-009 profile structure | `CUR-237` | tabs/sections and durable URL/back behavior |
| EXP-010 group discovery IA | `CUR-380` | Meus grupos/Descobrir peer views vs alternative entry model |
| EXP-011 notification grouping | `CUR-431` | time buckets vs other information grouping |

## Phase 6 rewrite manifest — superseding authorization

Phase 6 must treat this manifest and the Phase 5.5 coverage ledger as authoritative. The Phase 5 manifest at `6a4f22e` is historical only.

| Target | Decision IDs | Operation | Intended effect |
|---|---|---|---|
| `DESIGN_SPEC.md` product/design boundary | RT-DEC-001/004/006/010 | delete/move | Remove competitor authority, feature inventory, speculative messaging UI and audit plumbing from design law. |
| `DESIGN_SPEC.md` trust/scope/roles | CUR-015 AMEND; RT-ADD-001/002/003; KEEP survivors; RT-DEC-005 | consolidate/add | Keep only design consequences of product truth: audience, scope, recoverability, privacy, role separation. |
| `DESIGN_SPEC.md` components/forms/states | RT-ADD-004/005/006/010; KEEP/AMEND survivors | consolidate/add | One canonical interaction/state contract instead of repeated per-surface recipes. |
| `DESIGN_SPEC.md` accessibility | RT-ADD-007; `CUR-246–247`, `CUR-250–252` | replace/consolidate | Correct WCAG/APG baseline; eliminate false 44px/h1/viewport claims and duplicate rubrics. |
| `DESIGN_SPEC.md` visual foundations | `CUR-016` AMEND; RT-ADD-008; EXP-004 | consolidate/experiment | Semantic system is normative; exact aesthetic values are candidate evidence only. |
| `DESIGN_SPEC.md` navigation | `CUR-301` AMEND; RT-ADD-003/008; EXP-001 | replace/experiment | Separate task from scope, require consistency, leave destination count/geometry unresolved. |
| `VISUAL_GUIDE.md` | RT-DEC-002/003/005/009; CUR-016 AMEND; RT-ADD-008/009/010 | rewrite from outcomes | Replace duplicate wireframe law with visual hierarchy, density, metadata and surface-behavior guidance. |
| audit/rubric material | RT-DEC-010; RT-ADD-007 | remove from design docs / move to executable audit contract | Design docs state standards; harness proves them. Do not claim enforcement that tooling does not perform. |
| unresolved product choices | `CUR-220`, `CUR-239`, `CUR-319` | keep visible as human decision | No silent feature/policy decision during rewrite. |
| experiments | EXP-001–011 | keep visible, non-normative | No candidate may be promoted by the Phase 6 writer without comparative evidence or explicit human decision. |

## Phase 6 mutation rule

A Phase 6 writer may:
- preserve the 21 `KEEP` rules;
- rewrite the 24 `AMEND` rules to the final intents above;
- remove the 423 `DELETE` rules from normative design authority;
- list the 14 current-rule experiments only as candidates/open questions;
- keep the 3 human decisions unresolved;
- introduce only the 10 `RT-ADD-*` canonical rules above.

A deleted incumbent detail may **not** reappear as a hard rule merely because it is convenient during rewrite. If a deleted pixel/count/layout/token is needed for a prototype, it belongs to an experiment implementation, not to the normative vNext contract.

## Post-rewrite verification requirements

1. Trace every normative vNext rule to `KEEP`, `AMEND`, or `RT-ADD-*`.
2. Verify no `DELETE` rule silently returns as law.
3. Verify no experiment candidate is presented as the selected final system.
4. Re-run objective WCAG/APG checks against the rewritten contract and affected runtime.
5. Re-run authenticated navigation/scope/locality checks from Phase 4.
6. Fault-inject at least one material query and action failure to prove error ≠ empty and safe error handling.
7. Keyboard-test locality context controls and representative compound controls.
8. Verify 320 CSS-px-equivalent/zoom/reflow, focus, contrast and reduced-motion behavior.
9. Keep human decisions and EXP-001–011 visibly unresolved until their respective decision gates are completed.

## Freeze declaration

Phase 5.5 adversarial adjudication is frozen after complete 485/485 coverage.

The first Phase 5 verdict set remains available in Git history at
`6a4f22e5fe88edddcd4cb51c917a8fd990b1184a`, but it no longer authorizes Phase 6 mutations where it conflicts with this document.

**Phase 6 is authorized only against this Phase 5.5 ledger, its `RT-DEC-*` records, and `RT-ADD-*` rules.**
