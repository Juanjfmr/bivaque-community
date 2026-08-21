# ADJUDICATION — final design-rule verdicts

> **Status: PHASE 5 COMPLETE — ADJUDICATION FROZEN.**
>
> Adjudicated against the frozen Phase 1 reference, frozen 485-rule incumbent ledger, Phase 3 conflict matrix, and Phase 4 runtime evidence frozen against runtime baseline `d9f1a9e858c566e6103094a4aa23b1110527846f` and reconciled in audit commit `2d27434641d237af861f9d999c392ed1deba26a9`.
>
> Phase 5 freezes verdicts, not unresolved design experiments. `EXPERIMENT` and `HUMAN_DECISION` items remain visible through Phase 6 and may not be silently converted into hard rules.

## Method

- Every `CUR-001` through `CUR-485` has exactly one final verdict.
- `CONFLICT_MATRIX.md` is the trace backbone: every coverage range below inherits its unique Phase 3 `REF/RVIS` mapping and conflict outcome.
- Runtime evidence may strengthen, weaken, or reclassify the Phase 3 candidate.
- Runtime implementation is evidence of consequences, not normative authority.
- Exact visual values are not preserved merely because implementation/E2E encodes them.
- Confidence 1–2 is not converted into a hard aesthetic rule.
- `ADD` is reserved for a materially missing requirement with strong reference/runtime support.

## Final verdict summary

| Verdict | Current rules |
|---|---:|
| `KEEP` | 107 |
| `AMEND` | 99 |
| `DELETE` | 8 |
| `EXPERIMENT` | 246 |
| `HUMAN_DECISION` | 25 |
| **Total incumbent** | **485** |

Five reference-only requirements receive `ADD`.

## Complete incumbent coverage ledger

This ledger is authoritative for per-rule verdict coverage. Grouping is presentation compression only; rule identity is preserved.

- `CUR-001–006` → **DELETE**; `CUR-007–011` → **AMEND**; `CUR-012–013` → **KEEP**; `CUR-014–015` → **AMEND**.
- `CUR-016–017` → **KEEP**; `CUR-018–035` → **EXPERIMENT**; `CUR-036–037` → **AMEND**; `CUR-038` → **KEEP**.
- `CUR-039` → **AMEND**; `CUR-040` → **KEEP**; `CUR-041–064` → **EXPERIMENT**; `CUR-065–066` → **AMEND**.
- `CUR-067–074` → **EXPERIMENT**; `CUR-075` → **AMEND**; `CUR-076` → **KEEP**; `CUR-077–078` → **AMEND**.
- `CUR-079–080` → **EXPERIMENT**; `CUR-081` → **AMEND**; `CUR-082` → **KEEP**; `CUR-083–091` → **EXPERIMENT**.
- `CUR-092` → **KEEP**; `CUR-093` → **AMEND**; `CUR-094–101` → **EXPERIMENT**; `CUR-102` → **AMEND**.
- `CUR-103–105` → **EXPERIMENT**; `CUR-106` → **KEEP**; `CUR-107–110` → **EXPERIMENT**; `CUR-111` → **AMEND**.
- `CUR-112–114` → **EXPERIMENT**; `CUR-115` → **AMEND**; `CUR-116` → **KEEP**; `CUR-117–123` → **EXPERIMENT**.
- `CUR-124` → **KEEP**; `CUR-125` → **AMEND**; `CUR-126` → **KEEP**; `CUR-127` → **EXPERIMENT**.
- `CUR-128–129` → **KEEP**; `CUR-130` → **AMEND**; `CUR-131` → **KEEP**; `CUR-132–135` → **EXPERIMENT**.
- `CUR-136–139` → **KEEP**; `CUR-140` → **AMEND**; `CUR-141` → **KEEP**; `CUR-142` → **AMEND**.
- `CUR-143–150` → **EXPERIMENT**; `CUR-151` → **KEEP**; `CUR-152` → **EXPERIMENT**; `CUR-153–154` → **KEEP**.
- `CUR-155` → **AMEND**; `CUR-156` → **EXPERIMENT**; `CUR-157` → **KEEP**; `CUR-158–159` → **EXPERIMENT**.
- `CUR-160` → **AMEND**; `CUR-161–162` → **EXPERIMENT**; `CUR-163` → **AMEND**; `CUR-164–166` → **KEEP**.
- `CUR-167–175` → **EXPERIMENT**; `CUR-176` → **KEEP**; `CUR-177` → **AMEND**; `CUR-178–179` → **KEEP**.
- `CUR-180` → **EXPERIMENT**; `CUR-181` → **AMEND**; `CUR-182` → **KEEP**; `CUR-183–184` → **EXPERIMENT**.
- `CUR-185–187` → **AMEND**; `CUR-188–189` → **EXPERIMENT**; `CUR-190–193` → **KEEP**; `CUR-194–200` → **EXPERIMENT**.
- `CUR-201–204` → **AMEND**; `CUR-205–206` → **EXPERIMENT**; `CUR-207` → **KEEP**; `CUR-208–219` → **HUMAN_DECISION**.
- `CUR-220–222` → **KEEP**; `CUR-223` → **EXPERIMENT**; `CUR-224` → **AMEND**; `CUR-225–226` → **EXPERIMENT**.
- `CUR-227` → **DELETE**; `CUR-228–231` → **EXPERIMENT**; `CUR-232–236` → **KEEP**; `CUR-237` → **AMEND**.
- `CUR-238` → **KEEP**; `CUR-239` → **HUMAN_DECISION**; `CUR-240–241` → **KEEP**; `CUR-242–245` → **AMEND**.
- `CUR-246–247` → **KEEP**; `CUR-248–249` → **AMEND**; `CUR-250–252` → **KEEP**; `CUR-253–257` → **AMEND**.
- `CUR-258` → **DELETE**; `CUR-259–278` → **EXPERIMENT**; `CUR-279` → **AMEND**; `CUR-280` → **EXPERIMENT**.
- `CUR-281` → **AMEND**; `CUR-282–289` → **EXPERIMENT**; `CUR-290–292` → **AMEND**; `CUR-293–295` → **KEEP**.
- `CUR-296–297` → **EXPERIMENT**; `CUR-298–300` → **AMEND**; `CUR-301` → **KEEP**; `CUR-302` → **EXPERIMENT**.
- `CUR-303–308` → **AMEND**; `CUR-309–312` → **EXPERIMENT**; `CUR-313–314` → **AMEND**; `CUR-315` → **EXPERIMENT**.
- `CUR-316–317` → **KEEP**; `CUR-318` → **EXPERIMENT**; `CUR-319` → **HUMAN_DECISION**; `CUR-320` → **AMEND**.
- `CUR-321–331` → **EXPERIMENT**; `CUR-332–337` → **KEEP**; `CUR-338–341` → **EXPERIMENT**; `CUR-342–344` → **AMEND**.
- `CUR-345–346` → **KEEP**; `CUR-347–355` → **EXPERIMENT**; `CUR-356` → **AMEND**; `CUR-357–358` → **EXPERIMENT**.
- `CUR-359` → **AMEND**; `CUR-360–367` → **EXPERIMENT**; `CUR-368` → **AMEND**; `CUR-369–374` → **EXPERIMENT**.
- `CUR-375–376` → **AMEND**; `CUR-377–379` → **EXPERIMENT**; `CUR-380` → **KEEP**; `CUR-381` → **AMEND**.
- `CUR-382` → **KEEP**; `CUR-383–387` → **EXPERIMENT**; `CUR-388–389` → **KEEP**; `CUR-390` → **AMEND**.
- `CUR-391` → **EXPERIMENT**; `CUR-392` → **AMEND**; `CUR-393–394` → **EXPERIMENT**; `CUR-395` → **AMEND**.
- `CUR-396–397` → **EXPERIMENT**; `CUR-398–399` → **AMEND**; `CUR-400–402` → **EXPERIMENT**; `CUR-403` → **KEEP**.
- `CUR-404` → **EXPERIMENT**; `CUR-405–407` → **KEEP**; `CUR-408–409` → **EXPERIMENT**; `CUR-410–411` → **AMEND**.
- `CUR-412` → **KEEP**; `CUR-413–414` → **EXPERIMENT**; `CUR-415` → **KEEP**; `CUR-416` → **AMEND**.
- `CUR-417–426` → **HUMAN_DECISION**; `CUR-427–428` → **AMEND**; `CUR-429–430` → **KEEP**; `CUR-431–432` → **EXPERIMENT**.
- `CUR-433` → **AMEND**; `CUR-434–436` → **EXPERIMENT**; `CUR-437` → **KEEP**; `CUR-438` → **AMEND**.
- `CUR-439` → **EXPERIMENT**; `CUR-440–443` → **KEEP**; `CUR-444` → **AMEND**; `CUR-445` → **KEEP**.
- `CUR-446` → **HUMAN_DECISION**; `CUR-447–449` → **KEEP**; `CUR-450–451` → **EXPERIMENT**; `CUR-452–453` → **KEEP**.
- `CUR-454` → **EXPERIMENT**; `CUR-455–456` → **KEEP**; `CUR-457` → **AMEND**; `CUR-458–460` → **KEEP**.
- `CUR-461` → **AMEND**; `CUR-462–464` → **EXPERIMENT**; `CUR-465–466` → **KEEP**; `CUR-467–469` → **AMEND**.
- `CUR-470–471` → **KEEP**; `CUR-472–475` → **AMEND**; `CUR-476–478` → **KEEP**; `CUR-479` → **AMEND**.
- `CUR-480–484` → **KEEP**; `CUR-485` → **AMEND**.

## Material Decision records

The following Decision IDs group non-KEEP mutations and high-impact KEEP outcomes by the same evidence reason. The exact per-rule verdict remains the coverage ledger above.

| Decision ID | Current rule(s) | Reference / runtime | Verdict | Conf. | Required rewrite implication |
|---|---|---|---|---:|---|
| DEC-001 | CUR-001–006 | REF-007/011; RVIS-003/008/022 | **DELETE** | 5 | Remove competitor-specific normative authority. A borrowed pattern may return only if independently justified. |
| DEC-002 | CUR-007–011, CUR-015 | REF-005; RVIS-001/002 | **AMEND** | 5 | Keep calm/trustworthy/community-operated character; remove source-specific and institutionally authoritative framing. |
| DEC-003 | CUR-012–013, CUR-232–236, CUR-440–443, CUR-480–483 | REF-003/004/005 | **KEEP** | 5 | Preserve controlled access, privacy minimization, factual role truth, and no public rank/OM/address/verification-prestige cues. |
| DEC-004 | CUR-014, CUR-142, CUR-438 | REF-009/010; RVIS-014; RUN-005/016 | **AMEND** | 5 | Replace durable `Manaus` assumptions with actual current membership/scope context. Manaus is rollout context, not UI truth. |
| DEC-005 | CUR-018–035, CUR-041–064, CUR-067–074, CUR-079–080, CUR-083–091, CUR-094–101, CUR-103–105, CUR-107–110, CUR-112–114, CUR-123, CUR-127, CUR-133–135, CUR-259–278, CUR-280, CUR-282–289, CUR-296–297, CUR-377–379, CUR-396–397, CUR-404, CUR-450–451, CUR-454, CUR-462–464 | REF-039; RVIS-005/007/009/031/042; EXP-004 | **EXPERIMENT** | 2 | Exact palette, typography, spacing, radii, elevation, motion, widths, counts and decorative recipes become candidate values, not law. |
| DEC-006 | CUR-036–037, CUR-039, CUR-065–066, CUR-075, CUR-077–078, CUR-081, CUR-093, CUR-102, CUR-111, CUR-115, CUR-242–245, CUR-248–249, CUR-253–257, CUR-279, CUR-281, CUR-290–292, CUR-298–300, CUR-472–475 | REF-020/022/025/027/030/031/032/034/035; RVIS-004/020/028/034/043; RUN-002/014/023 | **AMEND** | 5 | Replace false objective precision and blanket component recipes with actual WCAG/APG/Next contracts; keep accessible outcome, not arbitrary implementation detail. |
| DEC-007 | CUR-130, CUR-140, CUR-155, CUR-160, CUR-163, CUR-177, CUR-181, CUR-185–187, CUR-201–204, CUR-224, CUR-237, CUR-342–344, CUR-356, CUR-359, CUR-368, CUR-381, CUR-390, CUR-392, CUR-395, CUR-398–399, CUR-410–411, CUR-427–428, CUR-433, CUR-444, CUR-457, CUR-467, CUR-479 | REF-001/002/004/014/026/027/028/031/035/038; RVIS-035/038; RUN-008/009 | **AMEND** | 4 | Preserve useful intent but remove absolutes, color-only status, raw-error exposure, destructive truncation and over-fixed component anatomy. |
| DEC-008 | CUR-117–122, CUR-143–150, CUR-152, CUR-156, CUR-158–162, CUR-167–175, CUR-180, CUR-183–184, CUR-188–189, CUR-194–200, CUR-205–206, CUR-223, CUR-225–226, CUR-228–231, CUR-302, CUR-309–312, CUR-315, CUR-318, CUR-321–331, CUR-338–341, CUR-347–355, CUR-357–358, CUR-360–367, CUR-369–374, CUR-383–387, CUR-391, CUR-393–394, CUR-400–402, CUR-408–409, CUR-413–414, CUR-431–432, CUR-434–436, CUR-439 | REF-011/013/016/017/019/021/039; RVIS-008/016/017/019/021/022/023; RUN-003/010/015/020/021; EXP-001/002/003 | **EXPERIMENT** | 2 | Surface composition, responsive geometry, navigation placement, composer disclosure, group/event/recommendation density and optional profile craft require bounded comparative evidence. |
| DEC-009 | CUR-227, CUR-258 | REF-011; audit governance boundary | **DELETE** | 5 | Delete route-by-navigation circularity and agent/document-precedence governance from the user-facing design contract. |
| DEC-010 | CUR-208–219, CUR-319, CUR-417–426 | Phase-1 pilot scope; F3-C10 | **HUMAN_DECISION** | 2 | Private messaging and its primary-navigation placement require explicit product authority before detailed UI rules remain normative. |
| DEC-011 | CUR-239, CUR-446 | Product/privacy policy gap | **HUMAN_DECISION** | 2 | Canonical profile visibility is a product/privacy choice, not derivable from visual evidence. |
| DEC-012 | CUR-301, CUR-303–308, CUR-313–314, CUR-320, CUR-375–376, CUR-416, CUR-468–469 | REF-008/009/011/012; RVIS-014/019; RUN-004/018 | **AMEND** | 5 | Keep a stable mental model, but stop treating four containers as inviolable ontology. Task destination and membership scope are distinct; active conceptual parent must remain consistent across viewport variants. |
| DEC-013 | CUR-302, CUR-309–312, CUR-315, CUR-318, CUR-321–331, CUR-364–374 | REF-011/016/019; RVIS-016/017; RUN-003/004/007; EXP-001 | **EXPERIMENT** | 2 | Exact destination count, Events/Recommendations placement, bottom-nav/rail/sidebar pattern, breakpoints and geometry stay open until candidate comparison. |
| DEC-014 | CUR-461, CUR-485 | REF-018/020/022/030/032; RVIS-041; RUN-001/002/014 | **AMEND** | 5 | Audit claims must match actual checks: authenticated landed-state proof, objective reflow stress, correct standards, and no PASS on unobserved target state. |
| DEC-015 | CUR-076, CUR-082, CUR-092, CUR-106, CUR-116, CUR-129, CUR-138–139, CUR-151, CUR-164–166, CUR-178–179, CUR-190–193, CUR-207, CUR-220–222, CUR-246–247, CUR-250–252, CUR-293–295, CUR-316–317, CUR-332–337, CUR-345–346, CUR-380, CUR-382, CUR-388–389, CUR-403, CUR-405–407, CUR-412, CUR-415, CUR-429–430, CUR-437, CUR-440–443, CUR-449, CUR-458–460, CUR-465–466, CUR-470–471, CUR-476–478, CUR-480–484 | Strong aligned REF/RVIS mappings; RUN-011/020/022/023/024 | **KEEP** | 5 | Preserve the durable trust/state/semantics core. Phase 6 may reword for consolidation but may not weaken these contracts. |

## Reference-only additions

| Decision ID | Reference / runtime | Verdict | Confidence | New normative requirement |
|---|---|---|---:|---|
| DEC-016 | REF-001/002; RUN-005/010/021 | **ADD** | 5 | Before consequential publish/share/moderation commit, expose effective audience/scope; retry/navigation/context change must never silently widen it. |
| DEC-017 | REF-006/007/013 | **ADD** | 5 | Durable knowledge remains independently recoverable through structured discovery/search; recency stream is never the only retrieval path. |
| DEC-018 | REF-022/024; RVIS-040; RUN-007/012/013 | **ADD** | 5 | Native semantics first; HeroUI/React Aria compound controls preserve canonical keyboard/name/role/state behavior. A tested simpler semantic fallback is allowed after reproducible library/composition failure. |
| DEC-019 | REF-023/030 | **ADD** | 5 | Forms use persistent accessible labels with programmatically associated helper/error/required/invalid state; placeholder alone is never the label. |
| DEC-020 | REF-029/035; RUN-008/009 | **ADD** | 5 | Query/render/action failure never masquerades as true empty; expected failures are recoverable UI state and unexpected render failures use an appropriate error boundary/retry path. |

## Runtime consequences of the decisions

These are implementation consequences, not additional normative rules:

- **RUN-004:** Phase 6 must define one route→conceptual-parent contract shared by responsive navigation variants. Current mobile fallback to `Comunidade` for `/messages`/`/notifications` is not acceptable.
- **RUN-005/016:** visible locality/scope labels use the same current context that drives data/publishing authorization.
- **RUN-007/019:** the manual locality `role="tab"` pair either adopts canonical tabs behavior or uses simpler honest button/segmented-control semantics.
- **RUN-008/009:** material queries branch on returned error before null/undefined data is coerced to an empty collection; raw RPC/Postgres strings remain diagnostic only.
- **RUN-014/023:** visible focus requirement remains; tests must inspect the rendered indicator instead of merely proving focus existence.
- **RUN-022:** avatar fallback is acceptable after `d9f1a9e`; residual missing-photo 404 traffic is storage/network debt, not a design-rule blocker.
- **RUN-025:** verify the <768 sidebar hiding mechanism during Phase 6. If it remains exposed in the accessibility tree, remove/hide the duplicate landmark; if `display:none` already removes it, no additional rule is needed.

## Open experiment / human-decision register

| Item | Phase-5 status | Constraint carried forward |
|---|---|---|
| EXP-001 — primary navigation composition | OPEN | Exact pattern/count/geometry remains `EXPERIMENT`; consistency, scope clarity and fit remain required. |
| EXP-002 — composer modal vs inline/adaptive | OPEN | Current modal is viable in isolation, not proven superior. |
| EXP-003 — groups rows/cards/hybrid | OPEN | Current hybrid is evidence, not winner. |
| EXP-004 — visual system candidates | OPEN | Incumbent navy/type/spacing/radius/motion system is one candidate only. |
| Private messaging | HUMAN_DECISION | Do not treat messaging layout/navigation rules as durable product authority until resolved. |
| Profile visibility | HUMAN_DECISION | Do not harden visibility UI/policy until resolved. |

## Rewrite manifest — Phase 6 authorization

| Target document / area | Decision IDs | Operation | Intended effect |
|---|---|---|---|
| `DESIGN_SPEC.md` authority / brand | DEC-001/002/009 | delete/amend | Remove competitor/governance authority and official/institutional implications. |
| `DESIGN_SPEC.md` trust / scope / privacy | DEC-003/004/016/017 | keep/amend/add | Make audience, no-silent-widening, dynamic locality, role truth and durable knowledge explicit. |
| `DESIGN_SPEC.md` visual foundations | DEC-005/006 | experiment/amend | Preserve semantic roles; demote unvalidated exact aesthetics and correct false standards. |
| `DESIGN_SPEC.md` interaction / states / errors | DEC-007/015/018/019/020 | keep/amend/add | Consolidate truthful states, canonical controls, safe errors and accessible forms. |
| `DESIGN_SPEC.md` responsive / navigation | DEC-008/012/013 | amend/experiment | Separate task navigation from scope; keep active-state consistency; leave exact shell solution open. |
| `DESIGN_SPEC.md` messages / profile | DEC-010/011 | human | Keep unresolved product/privacy choices explicitly unresolved. |
| `VISUAL_GUIDE.md` global tokens / motion / density | DEC-005/006/008 | experiment/amend | Convert exact recipe into candidate system; retain semantic/craft constraints. |
| `VISUAL_GUIDE.md` surfaces | DEC-007/008/010/011/015 | keep/amend/experiment/human | Reconcile contradictory surface prescriptions without selecting unresolved craft by taste. |
| `VISUAL_GUIDE.md` shell / navigation | DEC-004/012/013 | amend/experiment | Remove hardcoded locality and fixed ontology/geometry; specify behavioral constraints. |
| `VISUAL_GUIDE.md` rubric / audit | DEC-014/018–020 | amend/add | Make checks authenticated, standards-aligned, semantically correct and runtime-verifiable. |

No mutation outside this manifest is authorized merely as cleanup. A newly discovered normative rule returns to adjudication.

## Phase 6 verification requirements

1. Verify every rewritten `MUST` against applicable product truth, WCAG/APG/framework evidence.
2. Verify no `EXPERIMENT` value is silently promoted into exact pixels/colors/counts.
3. Re-run authenticated navigation at 375/768/1024/1440 including nested `/messages`, `/notifications`, `/recommendations`.
4. Re-run Rio/current-locality shell checks.
5. Keyboard-test locality context controls and representative HeroUI compound controls.
6. Fault-inject at least one material data query and one action failure to prove error ≠ empty and safe error copy.
7. Verify focus visibility and reduced-motion behavior with assertions that inspect the disputed property.
8. Run 320 CSS px-equivalent / zoom/reflow checks.
9. Keep EXP-001–004 and `HUMAN_DECISION` items visible in rewritten documents.

## Freeze declaration

Phase 5 adjudication is frozen after complete verdict coverage of `CUR-001`–`CUR-485`, five `ADD` decisions, and the rewrite manifest above.

Phase 6 is authorized to rewrite `docs/agents/DESIGN_SPEC.md` and `docs/agents/VISUAL_GUIDE.md` **only** through these Decision IDs and the coverage ledger.

The audit program remains open while `EXPERIMENT`, `HUMAN_DECISION`, or post-rewrite verification items remain unresolved.
