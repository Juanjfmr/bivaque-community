# PHASE 6 REVIEW — adversarial contract, traceability, and runtime conformance

> **Status: PHASE 6B COMPLETE / PHASE 6C COMPLETE / PHASE 6D CONFORMANCE BASELINE COMPLETE.**
>
> **Design contract status: FROZEN FOR IMPLEMENTATION. Runtime conformance: OPEN / CURRENT IMPLEMENTATION NON-CONFORMING.**
>
> This review does not reopen Phase 1–5.5. It reviews the Phase 6 rewrite against the frozen Phase 5.5 authority and maps the resulting contract onto the frozen authenticated runtime evidence.

## Scope

Reviewed:

- `docs/agents/DESIGN_SPEC.md`
- `docs/agents/VISUAL_GUIDE.md`
- `docs/agents/design-audit/ADJUDICATION.md`
- `docs/agents/design-audit/RUNTIME_FINDINGS.md`
- Phase 6 rewrite history through the current branch tip

No application, test, migration, seed, or harness file was modified by this review.

## Evidence-reuse condition for Phase 6D

The authenticated Phase 4 runtime baseline is `d9f1a9e858c566e6103094a4aa23b1110527846f`.

A Git comparison from that baseline to the post-6B/6C contract tip showed changes only in:

- `docs/agents/DESIGN_SPEC.md`
- `docs/agents/VISUAL_GUIDE.md`
- `docs/agents/design-audit/ADJUDICATION.md`
- `docs/agents/design-audit/RUNTIME_FINDINGS.md`

No application/runtime source changed. Therefore E5/E6 browser observations remain evidence about the exact currently implemented UI. Phase 6D may reuse those observations without pretending a new browser execution occurred. A fresh browser run becomes mandatory after implementation remediation changes runtime source.

---

# Phase 6B — adversarial spec review

## Result

**PASS after corrections.**

The review attacked:

- contradictory normative strengths;
- objective-standard overclaim;
- unadjudicated visual rules;
- hidden false precision;
- duplicated authority;
- experiment leakage;
- craft language that could be mistaken for implementation law.

## Findings and corrections

### P6B-001 — nested normative-strength conflict

`DS-001` was labeled `SHOULD` but contained an internal “must not” construction.

**Correction:** the rule now carries one consistent `SHOULD` strength. Trust character remains a strong default, not a disguised absolute.

### P6B-002 — reduced motion was incorrectly bundled into WCAG 2.2 AA

The first Phase 6 rewrite described reduced-motion behavior inside the WCAG 2.2 AA baseline.

Authoritative standards check:

- WCAG 2.2 SC 2.5.8 Target Size (Minimum) is Level AA and uses a 24×24 CSS-pixel minimum with defined spacing/equivalent/inline/user-agent/essential exceptions.
- WCAG 2.2 SC 2.3.3 Animation from Interactions is Level AAA; `prefers-reduced-motion` is a recognized technique for preventing non-essential interaction-triggered motion.

**Correction:** `DS-029` now states only applicable WCAG 2.2 AA requirements. Bivaque's stronger reduced-motion contract remains independently normative in `DS-025` / `VG-025` and is explicitly not represented as an AA requirement.

### P6B-003 — AAA craft guidance was masquerading as new design law

The first `VISUAL_GUIDE` rewrite assigned `MUST`/`SHOULD` strength to several craft projections that were useful but not independently authorized by Phase 5.5.

Examples included:

- “identity survives removal of logo”;
- “pages are composed, not stacked”;
- “cards are not the default unit of thought”;
- elevation/craft prescriptions;
- broad hierarchy and density statements.

These are valuable quality lenses, but Phase 5.5 did not authorize them as new canonical product rules.

**Correction:** the Visual Guide now distinguishes:

- `MUST` / `SHOULD` — settled normative design authority;
- `EXPERIMENT` — frozen unresolved choice;
- `CRAFT HEURISTIC` — non-normative quality lens that may block the internal `AAA-ready` label but cannot create product behavior, fixed geometry, tokens, routes, or component anatomy.

This preserves the extreme craft bar without bypassing adjudication.

### P6B-004 — experiment trace authority clarified

Experiments were previously described using the same trace requirement as settled rules even though Phase 5.5 intentionally preserved them as unresolved candidates.

**Correction:** settled `MUST`/`SHOULD` rules trace to `KEEP`, `AMEND`, or `RT-ADD-*`; `EXPERIMENT` entries trace to the frozen Phase 5.5 experiment register and remain unsettled.

### P6B-005 — APG interaction contracts remain correctly represented

Current WAI-ARIA APG review confirms:

- modal dialogs contain the tab sequence, move focus inside on open, support Escape, and normally return focus to the invoking/logical element on close;
- actual tabs require a tablist/tab/tabpanel relationship, selected state, and arrow-key behavior for horizontal tabs.

This supports the contract in `DS-021` and `DS-023` and confirms that Phase 4 `RUN-007` is a real runtime violation rather than a stylistic disagreement.

## 6B conclusion

No new exact palette, font, breakpoint, radius, shadow, duration, card anatomy, route placement, skeleton count, or navigation count was introduced as settled authority.

The internal AAA bar remains intentionally demanding, but craft judgment is no longer confused with objective standard or product law.

---

# Phase 6C — traceability audit

## Result

**PASS.**

### DESIGN_SPEC coverage

`DESIGN_SPEC.md` contains:

- `DS-001` through `DS-035`: settled `MUST`/`SHOULD` rules;
- `DS-036`: explicit visual-system `EXPERIMENT`.

Every settled rule traces to at least one Phase 5.5 `KEEP`, `AMEND`, or `RT-ADD-*` authority. `DS-036` traces to retained experiment candidates and `EXP-004`.

No settled DS rule depends solely on:

- a `DELETE` incumbent rule;
- implementation existence;
- old screenshot authority;
- competitor analogy;
- model preference;
- unadjudicated exact values.

### VISUAL_GUIDE coverage

Settled normative visual rules are:

- `VG-001`
- `VG-003`
- `VG-008`
- `VG-013`
- `VG-015`
- `VG-016`
- `VG-018`
- `VG-019`
- `VG-020`
- `VG-021`
- `VG-022`
- `VG-023`
- `VG-025`

Explicit visual experiments are:

- `VG-014`
- `VG-017`

The remaining `VG-*` craft statements are explicitly `CRAFT HEURISTIC`, not independent normative authority.

### Deleted-rule resurrection check

The following incumbent classes remain absent as settled design law:

- Nextdoor/competitor authority;
- `Manaus, AM` as durable literal;
- exact Navy token values;
- fixed system font as winner;
- universal 44px target rule;
- exact one-h1-per-screen rule;
- `w-56`, 64/224/256/320-style shell geometry as final truth;
- fixed card anatomy;
- exact skeleton/comment/avatar counts;
- fixed clamp counts;
- universal bottom-sheet/toast/pull-to-refresh recipes;
- exact four-container ontology;
- route-by-route wireframe law;
- auth-provider inventory;
- audit-harness implementation claims.

These may exist in code or experimental candidates; that does not restore normative authority.

### 6C conclusion

**Traceability gate passes.** The contract is small enough to audit and strong enough to constrain implementation without recreating the 485-rule incumbent system.

---

# Phase 6D — runtime conformance baseline

## Status model

- `PASS-EVIDENCED` — direct E5/E6 browser evidence supports the current implementation for the disputed property.
- `FAIL-EVIDENCED` — direct E5/E6 browser evidence demonstrates a current violation.
- `FAIL-SOURCE` — deterministic current-source evidence demonstrates a violation; no induced browser failure was run.
- `PARTIAL` — some required behavior was observed but not the entire contract.
- `NOT_OBSERVED` — existing evidence is insufficient; never interpreted as PASS.
- `EXPERIMENT` — no conformance winner exists yet.

## Per-rule conformance map

| Rule | Current status | Evidence / reason |
|---|---|---|
| `DS-001` | `NOT_OBSERVED` | Phase 4 did not establish product-wide character quality. |
| `DS-002` | `PARTIAL` | `RUN-010/021`: community composer exposes audience copy before commit; other consequential actions were not covered. |
| `DS-003` | `NOT_OBSERVED` | No retry/draft/context-switch widening probe. |
| `DS-004` | `NOT_OBSERVED` | Durable-recovery journey was not tested end-to-end. |
| `DS-005` | `NOT_OBSERVED` | No sufficiently broad profile/role-truth browser proof. |
| `DS-006` | `NOT_OBSERVED` | Privileged/provider shell distinction not covered sufficiently for a PASS. |
| `DS-007` | `NOT_OBSERVED` | CPF post-submit echo behavior was not re-probed in E5/E6. |
| `DS-008` | `NOT_OBSERVED` | `RUN-024` proves group-locality RLS, not private-event venue authorization. |
| `DS-009` | `FAIL-EVIDENCED` | Current shell uses locality/community/group concepts as primary destination containers; `RUN-003/004/018` documents the incumbent model. `EXP-001` remains the replacement decision gate. |
| `DS-010` | `FAIL-EVIDENCED` | `RUN-005/016`: Rio-current accounts display literal `Manaus, AM` in the shell. |
| `DS-011` | `FAIL-EVIDENCED` | `RUN-004/018`: nested routes select different conceptual parents across mobile vs rail/sidebar. |
| `DS-012` | `NOT_OBSERVED` | Existing implementation may conform, but no fresh Phase 4 landed-state proof is promoted to PASS here. |
| `DS-013` | `NOT_OBSERVED` | Event/local scope presentation not sufficiently covered. |
| `DS-014` | `FAIL-SOURCE` | `RUN-008`: `/groups` can collapse query failure into empty semantics. |
| `DS-015` | `FAIL-SOURCE` | `RUN-008`: failed queries can become false empty. |
| `DS-016` | `FAIL-SOURCE` | `RUN-009`: raw RPC/Supabase message can reach shared error description. |
| `DS-017` | `NOT_OBSERVED` | No current optimistic-failure browser probe covering the contract. |
| `DS-018` | `NOT_OBSERVED` | Pending membership persistence not re-probed. |
| `DS-019` | `NOT_OBSERVED` | Query-preserving no-results was not re-probed. |
| `DS-020` | `PARTIAL` | `RUN-011` supports community state/loading separation; not product-wide. |
| `DS-021` | `FAIL-EVIDENCED` | `RUN-007`: manual locality `role=tab` pair lacks canonical tab keyboard/relationship contract. Historical HeroUI incidents reinforce the real-interaction requirement. |
| `DS-022` | `NOT_OBSERVED` | No broad form-label/help/error association audit. |
| `DS-023` | `PARTIAL` | `RUN-010/021`: focus enters composer dialog and Escape closes; complete focus-return/lifecycle coverage was not established. |
| `DS-024` | `PARTIAL` | Representative accessible names exist in probes; no product-wide image/name audit supports full PASS. |
| `DS-025` | `NOT_OBSERVED` | Phase 4 explicitly did not verify component reduced-motion behavior. |
| `DS-026` | `NOT_OBSERVED` | Pending-action stability/duplicate activation not sufficiently covered. |
| `DS-027` | `FAIL-SOURCE` | `RUN-009` demonstrates unsafe/raw failure copy path; broader recovery behavior remains unverified. |
| `DS-028` | `NOT_OBSERVED` | Membership consequence/pending control behavior not sufficiently re-probed. |
| `DS-029` | `FAIL-EVIDENCED` | A single keyboard failure (`RUN-007`) prevents current WCAG-AA conformance claim; 320/reflow and broader target checks also remain incomplete. |
| `DS-030` | `EXPERIMENT` | Current 768/1024 regime is observed, not validated as the content-driven winner; `EXP-001`. |
| `DS-031` | `NOT_OBSERVED` | Reading/scan measure quality not established across representative dense content. |
| `DS-032` | `NOT_OBSERVED` | Decision-critical metadata coverage not audited broadly enough. |
| `DS-033` | `NOT_OBSERVED` | Product-wide non-color state-cue audit not performed. |
| `DS-034` | `NOT_OBSERVED` | Semantic-token conformance was not established product-wide by runtime evidence. |
| `DS-035` | `FAIL-EVIDENCED` | `RUN-024` records user-visible `Pagina nao encontrada` / `O endereco...` copy without required Portuguese diacritics. Reconfirm during remediation run. |
| `DS-036` | `EXPERIMENT` | `EXP-004` intentionally unresolved. |

## Runtime blockers created by the vNext contract

The highest-priority current implementation gaps are:

1. **Scope/locality truth** — `DS-010` / `VG-019` vs `RUN-005/016`.
2. **Responsive navigation consistency** — `DS-011` vs `RUN-004/018`.
3. **Canonical control semantics** — `DS-021` vs `RUN-007`.
4. **Error ≠ empty** — `DS-014/015` vs `RUN-008`.
5. **Safe error copy** — `DS-016/027` vs `RUN-009`.
6. **Objective accessibility conformance** — `DS-029` cannot pass while the locality control fails keyboard semantics; 320/reflow and broader objective checks also need execution.
7. **Locale/copy correctness** — `DS-035` requires remediation/recheck of currently unaccented visible Portuguese copy.

## Observed behavior that should not be regressed

- `RUN-010/021`: composer modal currently exposes audience copy, accepts focus, and closes on Escape.
- `RUN-011`: community distinguishes populated/loading/error/empty architecture better than the groups failure path.
- `RUN-023`: visible focus ring is real on the representative tested controls; the old test merely overclaimed how it proved that fact.
- `RUN-024`: group locality authorization is enforced server-side without leaking the Manaus-only group to a Rio member.
- `RUN-022`: avatar fallback now renders initials after missing-image failure; residual 404 traffic is network/storage debt, not visual-regression evidence.

## AAA-readiness verdict for current runtime

**NOT ELIGIBLE FOR `AAA-ready`.**

Reason:

- `EXP-004` has not compared coherent visual candidates;
- `EXP-001–003` remain unresolved;
- current runtime has known trust/navigation/semantic/state failures;
- the Phase 4 capture set is useful incumbent evidence but was never a proof that the current visual system wins the new AAA craft gate.

This is not a negative verdict on the new contract. It is the expected result of applying a stronger contract to an implementation that predates it.

---

# Objective standards re-check

Re-checked on 2026-08-21 against current W3C material:

- WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA: 24×24 CSS px minimum with defined exceptions/spacing model; this confirms deletion of the old universal 44×44-as-WCAG claim.
- WCAG 2.2 SC 2.3.3 Animation from Interactions, Level AAA: interaction-triggered non-essential motion can be disabled; `prefers-reduced-motion` is a recognized technique. Bivaque intentionally keeps a stronger product requirement while correctly labeling the objective AA baseline.
- WAI-ARIA APG Dialog (Modal): focus enters/stays within the modal tab sequence, Escape closes, and focus normally returns to the invoking/logical element.
- WAI-ARIA APG Tabs: tab/tablist/tabpanel relationships plus selected state and arrow-key behavior are part of the canonical pattern; this validates `RUN-007` as an implementation defect.

---

# Freeze / next gate

## Contract

**`DESIGN_SPEC.md` and `VISUAL_GUIDE.md` are frozen as the Phase 6 vNext design contract after 6B/6C.**

Freeze means:

- no deleted incumbent rule may be restored by implementation convenience;
- craft heuristics do not become hidden product law;
- experiments stay unresolved until their decision gate;
- human decisions stay unresolved until explicit product authority.

## Runtime

**The audit program is not implementation-complete.** Phase 6D has produced the conformance baseline and identified current violations; it cannot truthfully declare current runtime conforming.

After remediation changes application source, run a fresh authenticated browser pass covering at minimum:

- Rio/current-locality shell truth;
- nested navigation parent consistency across narrow/medium/wide variants;
- locality control keyboard semantics;
- induced query failure proving error ≠ empty;
- induced action/RPC failure proving safe error copy;
- modal complete focus lifecycle;
- 320 CSS-px-equivalent/reflow, text resize, target-size rules/exceptions, visible focus, non-color cues;
- reduced-motion behavior as the separate Bivaque contract;
- corrected Portuguese copy;
- no regression of server-side locality authorization.

`EXP-001–011` and the three `HUMAN_DECISION` items remain open by design.