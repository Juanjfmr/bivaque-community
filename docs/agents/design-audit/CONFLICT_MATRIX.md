# CONFLICT_MATRIX — reference versus incumbent
> **Status: PHASE 3 COMPLETE — PRE-RUNTIME SNAPSHOT.**
>
> This artifact compares the frozen Phase 1 reference against the frozen Phase 2 incumbent ledger. No implementation, screenshots, `PRODUCT_STATUS.md`, tests, runtime, or Phase 4 evidence were used. Candidate actions are provisional and are **not final verdicts**.
## Purpose and method
Phase 3 answers only: **how does each incumbent normative rule compare with the independent reference before seeing runtime?**

Rules are grouped below only when every `CUR-*` ID in the contiguous range receives the same comparison outcome for the same evidence reason. Grouping is presentation compression, not rule merging: every one of `CUR-001` through `CUR-485` has exactly one Phase 3 outcome. Coverage was checked for 485/485 IDs with no gaps or overlaps.

The `s=` incumbent support score remains authoritative only as Phase 2 metadata in `RULE_LEDGER.md`; this matrix intentionally does not duplicate it. Phase 3 may challenge the ledger's type/force/support interpretation when stronger reference evidence shows that a purported objective standard is actually a heuristic.
## Outcome summary
| Outcome | Rules |
|---|---:|
| `ALIGNED` | 90 |
| `ALIGNED_BUT_OVERSPECIFIED` | 96 |
| `REFERENCE_STRONGER` | 29 |
| `INCUMBENT_HAS_PRODUCT_CONTEXT` | 12 |
| `DIRECT_CONFLICT` | 21 |
| `NO_REFERENCE_EQUIVALENT` | 66 |
| `EXPERIMENT_REQUIRED` | 159 |
| `INSUFFICIENT_EVIDENCE` | 12 |

## Provisional candidate-action summary
| Candidate action | Rules |
|---|---:|
| `KEEP_CANDIDATE` | 106 |
| `AMEND_CANDIDATE` | 96 |
| `DELETE_CANDIDATE` | 8 |
| `EXPERIMENT_CANDIDATE` | 250 |
| `HUMAN_DECISION_CANDIDATE` | 25 |

These totals are not adjudication. In particular, `EXPERIMENT_CANDIDATE` means the current fixed rule is not justified *yet*; it does not mean the incumbent value is wrong.

## Structural findings before runtime

### F3-S01 — Incumbent precision exceeds evidence
Large clusters of exact colors, spacing, radii, typography, durations, breakpoints, widths, counts, clamps, and animation geometry are compatible with having a coherent system but are not supported as *the* required values by Phase 1. The reference deliberately leaves these as bounded experiments.

### F3-S02 — Product/trust rules mostly survive
Controlled access, role separation, privacy minimization, server-side protection of restricted event location, no raw permission/backend leakage, and privileged-workspace separation are strongly aligned with the reference.

### F3-S03 — Navigation is the largest conceptual conflict
The incumbent's fixed four-container model and universal 'new destinations must fit existing containers' rule conflict with the reference distinction between task navigation and membership scope, and with its refusal to freeze destination count/placement without content-fit evidence.

### F3-S04 — The incumbent contradicts itself on navigation and surfaces
The ledger preserves conflicts such as four containers versus five-destination wireframes, Events not being a tab versus appearing in sidebar/bottom navigation, Recommendations in header versus sidebar, group grid cards versus list rows, login background variants, and composer inline expansion versus modal.

### F3-S05 — Some alleged objective standards are misclassified
Universal 44×44 targets, exactly one h1 per screen, universal no-skipped-heading formulation, and some contrast wording are stronger or broader than the actual independent standards evidence. These need amendment, not blind preservation.

### F3-S06 — Messaging is a product-scope question, not merely UI polish
Detailed private-message rules have no Phase 1 product counterpart because one-to-one chat was not required by the sanitized pilot brief. Their future authority depends on an explicit product decision, not on how polished the current messaging spec is.

### F3-S07 — State/error architecture is a strong incumbent area
Rules separating loading/empty/error, preserving context, retrying, optimistic rollback, avoiding raw backend errors, and keeping pre-auth outside the member shell generally align with the strongest reference evidence.

### F3-S08 — Phase 4 is necessary for enforcement claims and disputed craft
Runtime is needed to decide whether fixed navigation geometry, rail usage, density, composer pattern, responsive transitions, actual accessible component behavior, and claimed visual-audit enforcement produce the intended outcomes.

## Rule-level confrontation matrix
| Current rule(s) | Reference | Outcome | Stronger evidence / comparison | Missing or Phase 4 discriminator | Provisional candidate |
|---|---|---|---|---|---|
| CUR-001–006 | REF-007/011; RVIS-003/008/022 | `REFERENCE_STRONGER` | Reference derives IA/density from Bivaque outcomes rather than copying one competitor. | - | `DELETE_CANDIDATE` |
| CUR-007–011 | RVIS-001/002 | `ALIGNED_BUT_OVERSPECIFIED` | Independent/non-official identity is supported; Nextdoor-specific prohibitions are unnecessarily source-specific. | - | `AMEND_CANDIDATE` |
| CUR-012–013 | REF-003/004 | `ALIGNED` | Controlled/private access is core product truth. | - | `KEEP_CANDIDATE` |
| CUR-014 | REF-009; sanitized pilot scope | `DIRECT_CONFLICT` | Manaus is pilot context, not permanent eligibility/product boundary. | - | `AMEND_CANDIDATE` |
| CUR-015 | RVIS-001/002 | `DIRECT_CONFLICT` | 'institutional' risks the official/ceremonial authority cues the reference rejects. | - | `AMEND_CANDIDATE` |
| CUR-016–017 | REF-037/038; RVIS-006 | `ALIGNED` | Semantic token discipline is strongly supported. | - | `KEEP_CANDIDATE` |
| CUR-018 | RVIS-007; REF-039 | `EXPERIMENT_REQUIRED` | Exact brand palette is intentionally unresolved in Phase 1. | - | `EXPERIMENT_CANDIDATE` |
| CUR-019–035 | REF-037/038/039; RVIS-006/007/009 | `ALIGNED_BUT_OVERSPECIFIED` | Semantic roles align; exact incumbent color values/mixes are not independently justified. | - | `EXPERIMENT_CANDIDATE` |
| CUR-036–037 | REF-031/038/039; RVIS-006/007 | `ALIGNED_BUT_OVERSPECIFIED` | Focus/link semantics are valid; binding both to one unresolved accent hue is stronger than evidence. | - | `AMEND_CANDIDATE` |
| CUR-038 | REF-031; RVIS-034 | `ALIGNED` | Secondary text contrast requirement aligns. | - | `KEEP_CANDIDATE` |
| CUR-039 | REF-031; RVIS-034 | `REFERENCE_STRONGER` | Incumbent wording treats all colors as text contrast; reference distinguishes text/non-text and WCAG exceptions. | - | `AMEND_CANDIDATE` |
| CUR-040 | REF-037/038 | `ALIGNED` | Components consuming semantic tokens aligns. | - | `KEEP_CANDIDATE` |
| CUR-041–046 | RVIS-008/009; REF-039 | `EXPERIMENT_REQUIRED` | Elevation hierarchy and shadow recipe are aesthetic/system choices without objective fixed values. | - | `EXPERIMENT_CANDIDATE` |
| CUR-047–057 | RVIS-009; REF-039 | `EXPERIMENT_REQUIRED` | Exact spacing/radius values are false precision until validated as a coherent candidate scale. | - | `EXPERIMENT_CANDIDATE` |
| CUR-058–064 | RVIS-005/028/029; REF-039 | `EXPERIMENT_REQUIRED` | Exact type scale is unresolved; semantic roles/readability matter more than inherited pixels. | - | `EXPERIMENT_CANDIDATE` |
| CUR-065 | RVIS-029/030; REF-032 | `EXPERIMENT_REQUIRED` | A universal 12px floor is heuristic, not the accessibility baseline. | - | `AMEND_CANDIDATE` |
| CUR-066 | REF-030/032; RVIS-029 | `REFERENCE_STRONGER` | Readable line height is supported, but WCAG requires tolerance of text-spacing overrides rather than a universal default 1.5. | - | `AMEND_CANDIDATE` |
| CUR-067–074 | REF-039; RVIS-011/042/043 | `EXPERIMENT_REQUIRED` | Exact heading line-height, durations and easing curves are not independently warranted. | - | `EXPERIMENT_CANDIDATE` |
| CUR-075 | REF-032; RVIS-043 | `ALIGNED_BUT_OVERSPECIFIED` | Reduced motion is mandatory; zeroing all durations may remove useful/necessary state cues. | - | `AMEND_CANDIDATE` |
| CUR-076 | REF-032; RVIS-042/043 | `ALIGNED` | Meaning must not rely on motion alone. | - | `KEEP_CANDIDATE` |
| CUR-077–078 | RVIS-042/044; REF-039 | `ALIGNED_BUT_OVERSPECIFIED` | Timely visible feedback is valid; a universal <200ms transition and 'no-transition' defect are too rigid. | - | `AMEND_CANDIDATE` |
| CUR-079–080 | REF-039; RVIS-042 | `EXPERIMENT_REQUIRED` | Exact button hover/press motion is craft preference. | - | `EXPERIMENT_CANDIDATE` |
| CUR-081 | REF component summary; RVIS component table | `DIRECT_CONFLICT` | Reference says loading preserves the action label; incumbent crossfades label away to a spinner. | - | `AMEND_CANDIDATE` |
| CUR-082 | REF-034; RVIS-045 | `ALIGNED` | Stable loading geometry is supported. | - | `KEEP_CANDIDATE` |
| CUR-083–091 | REF-016/039; RVIS-016/042 | `EXPERIMENT_REQUIRED` | Bottom-nav and reaction motion specifics depend on a navigation pattern and craft choices not frozen by reference. | - | `EXPERIMENT_CANDIDATE` |
| CUR-092 | REF-028/036; RVIS-044 | `ALIGNED` | Optimistic failure must reconcile/roll back truthfully. | - | `KEEP_CANDIDATE` |
| CUR-093 | REF-027/032; RVIS-042 | `ALIGNED_BUT_OVERSPECIFIED` | Failure feedback is required; fixed shake+toast is not universally appropriate and toast cannot be sole critical recovery. | - | `AMEND_CANDIDATE` |
| CUR-094–101 | REF-039; RVIS-009/042 | `EXPERIMENT_REQUIRED` | Composer/chip/overlay transition geometry and thresholds are weakly evidenced fixed choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-102 | REF-025; RVIS-027/040 | `REFERENCE_STRONGER` | Overlay modality is task/semantic dependent; not every mobile modal should become a bottom sheet. | - | `AMEND_CANDIDATE` |
| CUR-103–105 | REF-019/039; RVIS-009/045 | `EXPERIMENT_REQUIRED` | 768px modal switch, shimmer timing and skeleton surface are candidate implementation details. | - | `EXPERIMENT_CANDIDATE` |
| CUR-106 | REF-034; RVIS-045 | `ALIGNED` | Skeleton geometry should match final content. | - | `KEEP_CANDIDATE` |
| CUR-107–110 | REF-027/039; RVIS-042 | `EXPERIMENT_REQUIRED` | Toast placement, duration and gesture are implementation/craft candidates. | - | `EXPERIMENT_CANDIDATE` |
| CUR-111 | REF-027; canonical component behavior | `NO_REFERENCE_EQUIVALENT` | Esc-to-dismiss for toast is not established as a universal standard; validate canonical HeroUI behavior. | - | `AMEND_CANDIDATE` |
| CUR-112–114 | RVIS-003/042 | `NO_REFERENCE_EQUIVALENT` | Pull-to-refresh is optional interaction design not required by product reference. | - | `EXPERIMENT_CANDIDATE` |
| CUR-115 | REF-034/035 | `DIRECT_CONFLICT` | Reference asks meaningful boundaries, not a loading.tsx skeleton for every route segment. | - | `AMEND_CANDIDATE` |
| CUR-116 | REF-028/034; RVIS-015 | `ALIGNED` | Blank/isolated-spinner route transitions lose useful context. | - | `KEEP_CANDIDATE` |
| CUR-117–120 | REF-019/021/039; RVIS-003/021 | `DIRECT_CONFLICT` | Universal 640px/two-column/320px-rail geometry conflicts with task-driven responsive/density rules. | - | `EXPERIMENT_CANDIDATE` |
| CUR-121–122 | REF-016/019; RVIS-016/017 | `EXPERIMENT_REQUIRED` | Exact bottom-nav/sidebar adaptation and 1024 threshold were intentionally left for runtime comparison. | - | `EXPERIMENT_CANDIDATE` |
| CUR-123 | RVIS-009/012/013 | `EXPERIMENT_REQUIRED` | Exact login surface background is an unresolved visual-system choice. | - | `EXPERIMENT_CANDIDATE` |
| CUR-124 | RVIS-012 | `ALIGNED` | Pre-auth product identity is expected. | - | `KEEP_CANDIDATE` |
| CUR-125 | RVIS-013 | `ALIGNED_BUT_OVERSPECIFIED` | Focused value proposition fits, but exactly one line is arbitrary. | - | `AMEND_CANDIDATE` |
| CUR-126 | Phase-1 access journey | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Exact Google auth provider was intentionally absent from sanitized reference; incumbent may contain current product-provider context. | Confirm exact supported auth paths in later product/runtime evidence. | `KEEP_CANDIDATE` |
| CUR-127 | RVIS §3.1 | `NO_REFERENCE_EQUIVALENT` | Visual 'ou' divider is not a normative reference requirement. | - | `EXPERIMENT_CANDIDATE` |
| CUR-128 | Phase-1 access journey | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Magic-link provider detail is incumbent-specific product context. | Confirm exact supported auth paths. | `KEEP_CANDIDATE` |
| CUR-129 | REF-027/028; RVIS §3.1 | `ALIGNED` | Inline persistent success state is consistent with reference. | - | `KEEP_CANDIDATE` |
| CUR-130 | REF-027 | `ALIGNED_BUT_OVERSPECIFIED` | Inline success is good; absolute ban on alert-style presentation is unnecessary. | - | `AMEND_CANDIDATE` |
| CUR-131 | REF-003/004; RVIS-012 | `ALIGNED` | Pre-auth access gating should be communicated. | - | `KEEP_CANDIDATE` |
| CUR-132 | RVIS §3.1 open experiment | `DIRECT_CONFLICT` | Reference explicitly leaves single-page versus staged admission flow open to evidence. | - | `EXPERIMENT_CANDIDATE` |
| CUR-133–135 | REF-039; RVIS-042 | `EXPERIMENT_REQUIRED` | Progress visualization and exact directional motion are craft choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-136 | RVIS §3.1 | `INCUMBENT_HAS_PRODUCT_CONTEXT` | CPF formatting is locale/domain-specific input behavior absent from generic reference. | Validate usability/autofill/mobile keyboard. | `KEEP_CANDIDATE` |
| CUR-137 | REF-004; privacy principles | `ALIGNED` | Sensitive CPF should not be unnecessarily re-exposed. | - | `KEEP_CANDIDATE` |
| CUR-138–139 | REF-028/034; RVIS §3.1 | `ALIGNED` | Pending verification must show meaningful context, not an unexplained spinner. | - | `KEEP_CANDIDATE` |
| CUR-140 | REF-004/028 | `INSUFFICIENT_EVIDENCE` | 'Specific' failures may improve recovery or leak eligibility; wording is too vague to settle without copy/runtime examples. | Inspect actual denial/error copy and anti-enumeration behavior. | `AMEND_CANDIDATE` |
| CUR-141 | RVIS §3.1 | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Waitlist recovery is a product-specific path absent from sanitized benchmark. | Confirm current admission fallback. | `KEEP_CANDIDATE` |
| CUR-142 | REF-009/010; RVIS-014 | `ALIGNED_BUT_OVERSPECIFIED` | Current locality should be legible; hardcoding Manaus is pilot-specific rather than durable rule. | - | `AMEND_CANDIDATE` |
| CUR-143–147 | REF-010/014; RVIS §3.2/3.3 | `NO_REFERENCE_EQUIVALENT` | Member count/sticky header/avatar/collapsed composer/shortcut set are surface-level choices not fixed by reference. | - | `EXPERIMENT_CANDIDATE` |
| CUR-148–150 | REF-007/013; RVIS §3.2 | `EXPERIMENT_REQUIRED` | Recent/relevant sorting may help noise, but exact control and crossfade require real content evidence. | - | `EXPERIMENT_CANDIDATE` |
| CUR-151 | REF-028/034; RVIS-015 | `ALIGNED` | Changing sort should not blank the stable list context. | - | `KEEP_CANDIDATE` |
| CUR-152 | REF-014; RVIS §3.2 | `NO_REFERENCE_EQUIVALENT` | Avatar is optional identity presentation, not required by reference. | - | `EXPERIMENT_CANDIDATE` |
| CUR-153–154 | REF-014; RVIS §3.2 | `ALIGNED` | Source identity/scope/freshness metadata support informed scanning. | - | `KEEP_CANDIDATE` |
| CUR-155 | RVIS component table | `EXPERIMENT_REQUIRED` | Report/destructive placement should follow consequence/discoverability, not a universal overflow pattern. | - | `AMEND_CANDIDATE` |
| CUR-156 | REF-039; RVIS-032 | `EXPERIMENT_REQUIRED` | Exactly four lines is arbitrary; critical distinguishing content must not be destructively truncated. | - | `EXPERIMENT_CANDIDATE` |
| CUR-157 | RVIS-010 | `ALIGNED` | Media may be optional/task-relevant rather than required decoration. | - | `KEEP_CANDIDATE` |
| CUR-158–159 | RVIS §3.2/3.3 | `NO_REFERENCE_EQUIVALENT` | Reaction/comment-count affordances are product/surface choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-160 | REF-001/002 | `REFERENCE_STRONGER` | A share affordance is incomplete without audience/scope protection before consequential sharing. | - | `AMEND_CANDIDATE` |
| CUR-161–162 | REF-039; RVIS §3.3 | `EXPERIMENT_REQUIRED` | Exactly two previews and inline reply are layout/interactivity candidates. | - | `EXPERIMENT_CANDIDATE` |
| CUR-163 | RVIS-045; REF-039 | `ALIGNED_BUT_OVERSPECIFIED` | Task-shaped skeletons align; exactly three does not. | - | `AMEND_CANDIDATE` |
| CUR-164–166 | REF-004/027/028/029/035; RVIS §3.2 | `ALIGNED` | True empty, retryable error, and no raw backend leakage align strongly. | - | `KEEP_CANDIDATE` |
| CUR-167 | RVIS §3.2 | `NO_REFERENCE_EQUIVALENT` | End-of-feed marker/copy is optional craft. | - | `EXPERIMENT_CANDIDATE` |
| CUR-168–170 | REF-017/019/039; RVIS-017 | `EXPERIMENT_REQUIRED` | Wide-space secondary content may help, but 1024+ rail contents are not reference-fixed. | - | `EXPERIMENT_CANDIDATE` |
| CUR-171–175 | RVIS-022; RVIS §3.7 | `EXPERIMENT_REQUIRED` | Incumbent itself conflicts on grid cards versus rows; reference prefers scanability and minimal surfaces but does not freeze exact presentation. | Compare list vs grid with real group volume/content. | `EXPERIMENT_CANDIDATE` |
| CUR-176 | REF-026 | `ALIGNED` | Peer tabs can represent closely related group views if durable state is URL-aware when needed. | - | `KEEP_CANDIDATE` |
| CUR-177 | RVIS-035 | `REFERENCE_STRONGER` | Lock icon may supplement but cannot be the only meaningful privacy/status cue. | - | `AMEND_CANDIDATE` |
| CUR-178–179 | REF-028; RVIS §3.7/044 | `ALIGNED` | Join/request and persistent pending membership state align. | - | `KEEP_CANDIDATE` |
| CUR-180 | REF-039; RVIS §3.7 | `EXPERIMENT_REQUIRED` | Collapsing cover header is a craft/layout candidate. | - | `EXPERIMENT_CANDIDATE` |
| CUR-181 | REF-026 | `ALIGNED_BUT_OVERSPECIFIED` | Tabs are plausible; URL/back/share semantics still need to be defined. | - | `AMEND_CANDIDATE` |
| CUR-182 | REF-003/015; RVIS-018 | `ALIGNED` | Moderation privileges must remain role-gated. | - | `KEEP_CANDIDATE` |
| CUR-183–184 | RVIS §3.6 open experiments; REF-019 | `EXPERIMENT_REQUIRED` | Date grouping/sticky headers are plausible but reference leaves exact event grouping to content-volume evidence. | - | `EXPERIMENT_CANDIDATE` |
| CUR-185–186 | RVIS §3.6 | `ALIGNED_BUT_OVERSPECIFIED` | Date/title are needed; exact card anatomy remains flexible. | - | `AMEND_CANDIDATE` |
| CUR-187 | REF-004; RVIS §3.6 | `REFERENCE_STRONGER` | Venue can be essential, but private location visibility must obey authorization before rendering. | - | `AMEND_CANDIDATE` |
| CUR-188–189 | RVIS §3.6 | `INSUFFICIENT_EVIDENCE` | Participant avatars and exact RSVP choices need product/privacy and usage evidence. | Check privacy expectations and actual RSVP semantics. | `EXPERIMENT_CANDIDATE` |
| CUR-190–193 | REF-004/028/036; RVIS-044 | `ALIGNED` | Optimistic truth reconciliation and server-side private-location protection align strongly. | - | `KEEP_CANDIDATE` |
| CUR-194–198 | RVIS §3.6; REF-001 | `NO_REFERENCE_EQUIVALENT` | Hero/map/description/participant-list/share composition is not frozen; share additionally needs scope/audience safety. | Validate event detail content needs and participant privacy. | `EXPERIMENT_CANDIDATE` |
| CUR-199–200 | REF-019/039; RVIS §3.5 | `EXPERIMENT_REQUIRED` | Horizontal scroll/snap is a responsive discovery pattern, not a requirement. | - | `EXPERIMENT_CANDIDATE` |
| CUR-201–204 | REF-014; RVIS §3.5 | `ALIGNED_BUT_OVERSPECIFIED` | Identity/type/trust/snippet information aligns; exact card anatomy does not need to be universal. | - | `AMEND_CANDIDATE` |
| CUR-205–206 | REF-013/039; RVIS §3.5 | `NO_REFERENCE_EQUIVALENT` | Helpful-count metric and debounce implementation are not normative reference requirements. | - | `EXPERIMENT_CANDIDATE` |
| CUR-207 | REF-013/028/029; RVIS-023 | `ALIGNED` | No-results must retain query/filter context and remain distinct from failure. | - | `KEEP_CANDIDATE` |
| CUR-208–219 | Phase-1 pilot scope; generic state/component rules | `NO_REFERENCE_EQUIVALENT` | Private messaging was not a required pilot outcome, so detailed pane/bubble/message rules lack a Phase-1 product counterpart. | Decide whether private messaging remains in product scope before investing design authority. | `HUMAN_DECISION_CANDIDATE` |
| CUR-220 | REF-003/004 | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Shared-context gating is a safety/product rule if DMs exist. | Confirm exact messaging authorization model. | `KEEP_CANDIDATE` |
| CUR-221–222 | REF-004/028/029 | `ALIGNED` | Unavailable messaging context should be explanatory and must not expose raw permission errors. | - | `KEEP_CANDIDATE` |
| CUR-223 | REF-039; RVIS §3.2 | `EXPERIMENT_REQUIRED` | Exact notification time grouping is a presentation choice. | - | `EXPERIMENT_CANDIDATE` |
| CUR-224 | REF-031/038; RVIS-035 | `REFERENCE_STRONGER` | Unread state cannot depend on accent background alone; semantic/non-color cue is required. | - | `AMEND_CANDIDATE` |
| CUR-225–226 | REF-039; RVIS-042 | `NO_REFERENCE_EQUIVALENT` | Read-fade timing and 'mark all' control are product/craft choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-227 | REF-011 | `DIRECT_CONFLICT` | A route should not exist merely because incumbent navigation already links to it; navigation must derive from product outcomes. | - | `DELETE_CANDIDATE` |
| CUR-228–231 | REF-014; RVIS §3.7 | `NO_REFERENCE_EQUIVALENT` | Profile avatar/name/locality/member-since composition is not reference-fixed. | - | `EXPERIMENT_CANDIDATE` |
| CUR-232–236 | REF-003/004/005; RVIS-002 | `ALIGNED` | Verification truth and minimization of rank/OM/address/public badge align strongly. | - | `KEEP_CANDIDATE` |
| CUR-237 | REF-026 | `ALIGNED_BUT_OVERSPECIFIED` | Profile tabs may work, but durable route/back/share behavior must be explicit. | - | `AMEND_CANDIDATE` |
| CUR-238 | RVIS §3.7 | `NO_REFERENCE_EQUIVALENT` | Notification preferences are ordinary settings but not a Phase-1 design requirement. | - | `KEEP_CANDIDATE` |
| CUR-239 | privacy principles | `INSUFFICIENT_EVIDENCE` | Profile visibility is a product/privacy decision not settled by sanitized Phase 1. | Resolve intended visibility model before final design verdict. | `HUMAN_DECISION_CANDIDATE` |
| CUR-240 | REF-003; dependent role context | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Family invitation capability follows the dependent role but exact placement is incumbent-specific. | - | `KEEP_CANDIDATE` |
| CUR-241 | RVIS §3.7 | `NO_REFERENCE_EQUIVALENT` | Sign-out is necessary account utility; placement is not reference-fixed. | - | `KEEP_CANDIDATE` |
| CUR-242 | REF-020; RVIS-020 | `REFERENCE_STRONGER` | 44px is strong touch guidance, not WCAG 2.2 AA's universal minimum; reference distinguishes 24px criterion from ~44px comfort. | - | `AMEND_CANDIDATE` |
| CUR-243 | REF-031; RVIS-034 | `REFERENCE_STRONGER` | Contrast is supported but incumbent wording overgeneralizes text thresholds to all color use. | - | `AMEND_CANDIDATE` |
| CUR-244–245 | REF-022/030; RVIS-004/028 | `REFERENCE_STRONGER` | Semantic heading structure is required; exactly one h1 and never-skipped levels are not universal WCAG formulations. | - | `AMEND_CANDIDATE` |
| CUR-246–247 | REF-022/030 | `ALIGNED` | Accessible names and alt handling are baseline semantics. | - | `KEEP_CANDIDATE` |
| CUR-248 | REF-032; RVIS-004 | `ALIGNED_BUT_OVERSPECIFIED` | Visible focus is required; exact token/2px offset is styling detail. | - | `AMEND_CANDIDATE` |
| CUR-249 | REF-032 | `REFERENCE_STRONGER` | Focus indication must remain visible; banning outline:none even when replaced by an equivalent accessible focus style is too absolute. | - | `AMEND_CANDIDATE` |
| CUR-250–252 | REF-025; RVIS-040 | `ALIGNED` | Modal focus trap/dismiss/return lifecycle aligns. | - | `KEEP_CANDIDATE` |
| CUR-253–254 | REF-028/030; RVIS-044 | `ALIGNED_BUT_OVERSPECIFIED` | Async state should be announced where needed, but not every optimistic count/toast requires the same polite live-region mechanism. | - | `AMEND_CANDIDATE` |
| CUR-255–257 | REF-018/019; RVIS-041 | `ALIGNED_BUT_OVERSPECIFIED` | No page overflow is valid; 375/768/1440 are useful regressions but not sufficient/exhaustive responsive standards. | - | `AMEND_CANDIDATE` |
| CUR-258 | audit governance only | `NO_REFERENCE_EQUIVALENT` | Document-precedence governance belongs in agent/harness instructions, not the design contract. | - | `DELETE_CANDIDATE` |
| CUR-259–278 | REF-037/038/039; RVIS-006/007/009 | `ALIGNED_BUT_OVERSPECIFIED` | Semantic surface/status roles align; exact palette/radius/value recipes remain candidate choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-279 | REF-031; RVIS-034 | `REFERENCE_STRONGER` | Same contrast overgeneralization as CUR-039/243. | - | `AMEND_CANDIDATE` |
| CUR-280 | RVIS-005 | `EXPERIMENT_REQUIRED` | System stack is a legitimate candidate, not independently frozen winner. | - | `EXPERIMENT_CANDIDATE` |
| CUR-281 | REF-040; RVIS-005 | `ALIGNED_BUT_OVERSPECIFIED` | Avoid unnecessary font dependency/network cost, but a universal ban on external fetch is implementation policy rather than design truth. | - | `AMEND_CANDIDATE` |
| CUR-282–289 | REF-039; RVIS-004/005/028/029 | `EXPERIMENT_REQUIRED` | Exact heading/body sizes, line-heights and tracking are candidate typography values. | - | `EXPERIMENT_CANDIDATE` |
| CUR-290–292 | REF-022; RVIS-028 | `ALIGNED_BUT_OVERSPECIFIED` | Page-specific semantic title is good; one-h1 and never-'Bivaque' absolutes exceed the reference. | - | `AMEND_CANDIDATE` |
| CUR-293–295 | REF-032; RVIS-033 | `ALIGNED` | Correct Portuguese diacritics/locale text handling align. | - | `KEEP_CANDIDATE` |
| CUR-296–297 | REF-038/039; RVIS-007/009; component table | `EXPERIMENT_REQUIRED` | Primary/secondary action hierarchy is valid; blue hue and universal pill geometry are unresolved. | - | `EXPERIMENT_CANDIDATE` |
| CUR-298–299 | RVIS component table | `EXPERIMENT_REQUIRED` | Destructive action discoverability should be proportionate; universal overflow-only placement is not supported. | - | `AMEND_CANDIDATE` |
| CUR-300 | REF-020; RVIS-020 | `REFERENCE_STRONGER` | Same 44px-as-universal-standard issue as CUR-242. | - | `AMEND_CANDIDATE` |
| CUR-301 | REF-008/011; RVIS-014 | `ALIGNED` | Member navigation should reflect durable product mental models, not feature sprawl. | - | `KEEP_CANDIDATE` |
| CUR-302 | REF-011/016 | `DIRECT_CONFLICT` | Reference explicitly refuses to freeze an exact primary destination count/pattern without content-fit evidence. | - | `EXPERIMENT_CANDIDATE` |
| CUR-303–306 | REF-008/009/011; RVIS-014 | `DIRECT_CONFLICT` | Incumbent containers mix membership scope with task navigation, while reference separates 'what' from 'where/with whom'. | Prototype task-nav + scope-context alternatives with real journeys. | `AMEND_CANDIDATE` |
| CUR-307–308 | REF-011 | `DIRECT_CONFLICT` | A durable IA may add/change destinations when outcomes demand it; forcing every future destination into four containers is circular. | - | `AMEND_CANDIDATE` |
| CUR-309–312 | REF-008/009/011 | `EXPERIMENT_REQUIRED` | Landing Vitrine/provider/invite/transfer under particular containers is an IA hypothesis needing journey evidence. | - | `EXPERIMENT_CANDIDATE` |
| CUR-313–314 | REF-011 | `DIRECT_CONFLICT` | Failure to fit may expose a bad destination or a bad container model; incumbent rule assumes the latter cannot be wrong. | - | `AMEND_CANDIDATE` |
| CUR-315 | REF-011/016; RVIS §3.6 | `EXPERIMENT_REQUIRED` | Whether Events merits primary navigation is intentionally not frozen. | - | `EXPERIMENT_CANDIDATE` |
| CUR-316–317 | REF-009/010 | `ALIGNED` | Event visibility should respect locality/community scope. | - | `KEEP_CANDIDATE` |
| CUR-318 | REF-011; RVIS-019 | `EXPERIMENT_REQUIRED` | Putting recommendations in header is exact shell placement, not reference truth. | - | `EXPERIMENT_CANDIDATE` |
| CUR-319 | Phase-1 pilot scope | `NO_REFERENCE_EQUIVALENT` | Messages were not a required pilot outcome; placement under 'Eu' depends on whether feature survives. | - | `HUMAN_DECISION_CANDIDATE` |
| CUR-320 | REF-011 | `ALIGNED_BUT_OVERSPECIFIED` | Small stable navigation aligns; hard ceiling 5 is heuristic, not product invariant. | - | `AMEND_CANDIDATE` |
| CUR-321 | REF-019/039; RVIS-017 | `EXPERIMENT_REQUIRED` | 224px/1024 sidebar is false precision pending content-fit tests. | - | `EXPERIMENT_CANDIDATE` |
| CUR-322–324 | REF-038; RVIS-037 | `ALIGNED_BUT_OVERSPECIFIED` | Active state must be clear/distinct from scope; exact accent/fill treatment is open. | - | `EXPERIMENT_CANDIDATE` |
| CUR-325–330 | REF-016/019; RVIS-016/017 | `EXPERIMENT_REQUIRED` | 1024 switch, fixed bottom nav/sidebar and exact four-item mobile set require responsive/navigation experiments. | - | `EXPERIMENT_CANDIDATE` |
| CUR-331 | REF-011; RVIS-019 | `EXPERIMENT_REQUIRED` | Recommendations header placement remains IA/shell experiment. | - | `EXPERIMENT_CANDIDATE` |
| CUR-332–334 | RVIS-012/013; REF-003 | `ALIGNED` | Pre-auth should not expose authenticated member navigation. | - | `KEEP_CANDIDATE` |
| CUR-335–337 | REF-003/015; RVIS-018 | `ALIGNED` | Role-specific privileged/provider shells must remain distinct. | - | `KEEP_CANDIDATE` |
| CUR-338–341 | RVIS-019; REF-039 | `EXPERIMENT_REQUIRED` | Exact header left/right placement and dropdown contents are shell craft/product utility choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-342 | RVIS-045; REF-039 | `ALIGNED_BUT_OVERSPECIFIED` | Skeletons should match task geometry; exactly three on every list is over-specified. | - | `AMEND_CANDIDATE` |
| CUR-343 | REF-028/029; RVIS surface guides | `ALIGNED_BUT_OVERSPECIFIED` | True empty state needs explanation/next action where useful; universal icon/title/description/CTA component anatomy is not required. | - | `AMEND_CANDIDATE` |
| CUR-344 | RVIS-008; surface guides | `NO_REFERENCE_EQUIVALENT` | Dashed-box ban is stylistic; the real requirement is truthful/useful emptiness. | - | `AMEND_CANDIDATE` |
| CUR-345–346 | REF-004/027/028/029/035 | `ALIGNED` | Recoverable errors need in-context retry and must not expose raw backend details. | - | `KEEP_CANDIDATE` |
| CUR-347 | RVIS §3.2 | `NO_REFERENCE_EQUIVALENT` | Exact end-of-feed pattern/copy is optional. | - | `EXPERIMENT_CANDIDATE` |
| CUR-348–351 | REF-010/019/039; RVIS-014 | `ALIGNED_BUT_OVERSPECIFIED` | Scope/context header is useful; sticky geometry, exact contents and top-12 are candidate details. | - | `EXPERIMENT_CANDIDATE` |
| CUR-352–354 | RVIS §3.3 | `INSUFFICIENT_EVIDENCE` | Composer trigger/modal/shortcut set conflicts internally and reference leaves exact composition open. | Prototype with real contribution tasks. | `EXPERIMENT_CANDIDATE` |
| CUR-355 | REF-007/013 | `EXPERIMENT_REQUIRED` | Recent/relevant segmented sort requires content evidence. | - | `EXPERIMENT_CANDIDATE` |
| CUR-356 | REF-014; RVIS §3.3 | `ALIGNED_BUT_OVERSPECIFIED` | Identity/scope/freshness metadata align; exact combined anatomy remains flexible. | - | `AMEND_CANDIDATE` |
| CUR-357 | REF-039; RVIS-032 | `EXPERIMENT_REQUIRED` | Clamp 4 is arbitrary and must not hide distinguishing content. | - | `EXPERIMENT_CANDIDATE` |
| CUR-358 | RVIS-010 | `NO_REFERENCE_EQUIVALENT` | Exact media/link/poll reservation is surface-specific. | - | `EXPERIMENT_CANDIDATE` |
| CUR-359 | REF-001/014 | `REFERENCE_STRONGER` | Share must carry audience/scope protection; reaction row existence alone does not. | - | `AMEND_CANDIDATE` |
| CUR-360–362 | REF-039; RVIS-009 | `EXPERIMENT_REQUIRED` | Comment preview count, inline reply and 12–16 gap are candidate craft values. | - | `EXPERIMENT_CANDIDATE` |
| CUR-363 | RVIS §3.2 | `NO_REFERENCE_EQUIVALENT` | Exact end marker copy is optional. | - | `EXPERIMENT_CANDIDATE` |
| CUR-364–367 | REF-016/019/039; RVIS-016/017 | `EXPERIMENT_REQUIRED` | Mobile bottom nav / desktop sidebar / 224px width are precisely the unresolved navigation experiment. | - | `EXPERIMENT_CANDIDATE` |
| CUR-368 | REF-007/010/014; RVIS §3.2/3.3 | `ALIGNED_BUT_OVERSPECIFIED` | Scope + contribution + feed/discovery structure aligns; exact composition/order remains adaptable. | - | `AMEND_CANDIDATE` |
| CUR-369–374 | REF-017/019/021/039; RVIS-017/021 | `EXPERIMENT_REQUIRED` | Feed max-width, rail width/count/content are desktop candidates requiring real-density tests. | - | `EXPERIMENT_CANDIDATE` |
| CUR-375 | REF-011/012; RVIS-014 | `DIRECT_CONFLICT` | Legacy five-destination wireframe conflicts with incumbent four-container rule and independent small/task-derived navigation model. | - | `AMEND_CANDIDATE` |
| CUR-376 | REF-017; RVIS-008/017 | `REFERENCE_STRONGER` | Wide space should improve context/scanability; 'fill empty space' is not itself a valid design objective. | - | `AMEND_CANDIDATE` |
| CUR-377–379 | REF-039; RVIS-028/029 | `EXPERIMENT_REQUIRED` | Exact rail typography values are candidate type tokens. | - | `EXPERIMENT_CANDIDATE` |
| CUR-380 | REF-026 | `ALIGNED` | Meus/Descobrir can be peer views if state semantics remain durable. | - | `KEEP_CANDIDATE` |
| CUR-381 | REF-013; RVIS-023 | `ALIGNED_BUT_OVERSPECIFIED` | Group search aligns; universal pill shape/placement is not fixed. | - | `AMEND_CANDIDATE` |
| CUR-382 | RVIS-022/008 | `ALIGNED` | Reference explicitly prefers list rhythm/separators before gratuitous elevated cards for scan-heavy surfaces. | - | `KEEP_CANDIDATE` |
| CUR-383–387 | REF-039; RVIS §3.7 | `EXPERIMENT_REQUIRED` | Thumbnail size, row text/CTA placement/copy are presentation candidates. | - | `EXPERIMENT_CANDIDATE` |
| CUR-388–389 | REF-028; RVIS-038/044 | `ALIGNED` | Pending membership and understandable disabled member state align. | - | `KEEP_CANDIDATE` |
| CUR-390 | RVIS-035 | `REFERENCE_STRONGER` | Lock can supplement privacy state but must not be the only meaningful cue. | - | `AMEND_CANDIDATE` |
| CUR-391 | REF-039 | `EXPERIMENT_REQUIRED` | Collapsing cover remains craft experiment. | - | `EXPERIMENT_CANDIDATE` |
| CUR-392 | REF-026 | `ALIGNED_BUT_OVERSPECIFIED` | Tabs plausible; durable URL/back behavior must be clarified. | - | `AMEND_CANDIDATE` |
| CUR-393–394 | RVIS §3.6 open experiment | `EXPERIMENT_REQUIRED` | Exact date grouping/sticky headers remain content-volume hypotheses. | - | `EXPERIMENT_CANDIDATE` |
| CUR-395 | REF-032; RVIS-033 | `ALIGNED_BUT_OVERSPECIFIED` | Locale-aware date labels align; exact display examples are not universal. | - | `AMEND_CANDIDATE` |
| CUR-396–397 | REF-039; RVIS §3.6 | `EXPERIMENT_REQUIRED` | 48px date block/11px month are false precision. | - | `EXPERIMENT_CANDIDATE` |
| CUR-398–399 | REF-014; RVIS §3.6 | `ALIGNED_BUT_OVERSPECIFIED` | Title/time/location hierarchy aligns; exact typography/color treatment remains system-dependent. | - | `AMEND_CANDIDATE` |
| CUR-400–402 | RVIS §3.6 | `INSUFFICIENT_EVIDENCE` | Three avatars, RSVP placement and exact options need event privacy/usage evidence. | Validate actual RSVP semantics and attendee disclosure. | `EXPERIMENT_CANDIDATE` |
| CUR-403 | REF-028/036; RVIS-044 | `ALIGNED` | Optimistic RSVP must reconcile truthfully. | - | `KEEP_CANDIDATE` |
| CUR-404 | REF-038/039; RVIS-035 | `ALIGNED_BUT_OVERSPECIFIED` | Active selection semantics align; exact accent-soft is open. | - | `EXPERIMENT_CANDIDATE` |
| CUR-405–407 | REF-004/036 | `ALIGNED` | Private venue must be authorization-enforced server-side, never fetch-then-hide. | - | `KEEP_CANDIDATE` |
| CUR-408–409 | REF-013/019/039; RVIS-023 | `EXPERIMENT_REQUIRED` | Horizontal snap/debounce are implementation/discovery candidates. | - | `EXPERIMENT_CANDIDATE` |
| CUR-410–411 | REF-014; RVIS-010/§3.5 | `ALIGNED_BUT_OVERSPECIFIED` | Category/business identity aligns; exact icon/type style is not mandatory. | - | `AMEND_CANDIDATE` |
| CUR-412 | REF-003/014; RVIS §3.5 | `ALIGNED` | Indication source/trust context helps distinguish provider trust. | - | `KEEP_CANDIDATE` |
| CUR-413–414 | REF-039; RVIS §3.5 | `EXPERIMENT_REQUIRED` | Clamp-2/helpful-count are unvalidated density/social-proof choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-415 | REF-013/028/029; RVIS-023 | `ALIGNED` | No-results preserves query context. | - | `KEEP_CANDIDATE` |
| CUR-416 | REF-011; RVIS-019 | `DIRECT_CONFLICT` | Sidebar recommendation entry conflicts with same incumbent guide and reference leaves primary placement outcome-driven. | - | `AMEND_CANDIDATE` |
| CUR-417–426 | Phase-1 pilot scope | `NO_REFERENCE_EQUIVALENT` | Detailed messaging layout/content lacks a Phase-1 product requirement. | Decide messaging scope before visual optimization. | `HUMAN_DECISION_CANDIDATE` |
| CUR-427–428 | REF-028/036; RVIS-044 | `ALIGNED_BUT_OVERSPECIFIED` | Pending/duplicate prevention aligns; exact 'text only' enablement and tick presentation are product-specific. | - | `AMEND_CANDIDATE` |
| CUR-429–430 | REF-004/028/029 | `ALIGNED` | Unavailable shared context should be explanatory, not raw permission failure. | - | `KEEP_CANDIDATE` |
| CUR-431–432 | REF-039 | `EXPERIMENT_REQUIRED` | Notification grouping and 13px headers are presentation choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-433 | REF-031/038; RVIS-035 | `REFERENCE_STRONGER` | Unread status cannot be encoded solely by accent background. | - | `AMEND_CANDIDATE` |
| CUR-434–435 | REF-039; RVIS-042 | `NO_REFERENCE_EQUIVALENT` | Fade timing and mark-all control are optional surface choices. | - | `EXPERIMENT_CANDIDATE` |
| CUR-436–439 | REF-014/039; RVIS §3.7 | `NO_REFERENCE_EQUIVALENT` | Exact profile avatar/metadata composition is not frozen; hardcoded Manaus should become active-context if retained. | - | `EXPERIMENT_CANDIDATE` |
| CUR-440–443 | REF-003/004/005 | `ALIGNED` | No public verification badge/rank/OM/address strongly matches trust/privacy reference. | - | `KEEP_CANDIDATE` |
| CUR-444 | REF-026 | `ALIGNED_BUT_OVERSPECIFIED` | Profile tabs need durable URL/state semantics if they represent distinct destinations. | - | `AMEND_CANDIDATE` |
| CUR-445 | RVIS §3.7 | `NO_REFERENCE_EQUIVALENT` | Notification preferences are utility, not reference-level design. | - | `KEEP_CANDIDATE` |
| CUR-446 | privacy principles | `INSUFFICIENT_EVIDENCE` | Profile visibility is a product/privacy policy decision absent from sanitized benchmark. | Resolve canonical visibility model. | `HUMAN_DECISION_CANDIDATE` |
| CUR-447 | REF-003; dependent role | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Family invite capability follows dependent role; exact placement remains incumbent-specific. | - | `KEEP_CANDIDATE` |
| CUR-448 | RVIS §3.7 | `NO_REFERENCE_EQUIVALENT` | Sign-out utility is expected but not a visual benchmark rule. | - | `KEEP_CANDIDATE` |
| CUR-449 | RVIS-012/013 | `ALIGNED` | Pre-auth outside member shell aligns. | - | `KEEP_CANDIDATE` |
| CUR-450–451 | REF-039; RVIS-009/013 | `EXPERIMENT_REQUIRED` | max-w-sm and surface-sunken background are candidate visual choices; incumbent itself conflicts on background. | - | `EXPERIMENT_CANDIDATE` |
| CUR-452 | RVIS-012 | `ALIGNED` | Pre-auth brand identity aligns. | - | `KEEP_CANDIDATE` |
| CUR-453 | Phase-1 access journey | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Google provider detail is incumbent product context. | - | `KEEP_CANDIDATE` |
| CUR-454 | RVIS §3.1 | `NO_REFERENCE_EQUIVALENT` | Divider copy/presentation is optional. | - | `EXPERIMENT_CANDIDATE` |
| CUR-455–456 | Phase-1 access journey; RVIS §3.1 | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Magic-link and CPF formatting are domain/provider specifics absent from blind benchmark. | Validate actual supported auth/form behavior. | `KEEP_CANDIDATE` |
| CUR-457 | REF-038/039; RVIS-006/007/036 | `REFERENCE_STRONGER` | Green primary verify CTA collides with semantic/brand roles and incumbent blue rule; reference keeps accent hue open and reserves danger/status semantics. | - | `AMEND_CANDIDATE` |
| CUR-458 | RVIS §3.1 | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Waitlist as secondary path is product-specific recovery. | - | `KEEP_CANDIDATE` |
| CUR-459–460 | REF-004; RVIS-012 | `ALIGNED` | Privacy explanation and CPF non-echo align. | - | `KEEP_CANDIDATE` |
| CUR-461 | REF-018/019; RVIS-041 | `ALIGNED_BUT_OVERSPECIFIED` | 375/768/1440 captures are useful regressions but reference requires 320-equivalent/zoom/content-fit stress beyond those three. | - | `AMEND_CANDIDATE` |
| CUR-462–464 | REF-039; RVIS-009/028 | `EXPERIMENT_REQUIRED` | <1s hierarchy and exact 12–16/16px rhythm are unvalidated precision. | - | `EXPERIMENT_CANDIDATE` |
| CUR-465 | REF-037/039 | `ALIGNED` | Avoiding arbitrary token/value drift aligns with coherent design-system discipline. | - | `KEEP_CANDIDATE` |
| CUR-466 | REF-028/029 | `ALIGNED` | Applicable loading/empty/error/end states must be represented truthfully. | - | `KEEP_CANDIDATE` |
| CUR-467 | RVIS surface guides/008 | `ALIGNED_BUT_OVERSPECIFIED` | States should be designed, but 'not raw boxes' is craft language rather than objective contract. | - | `AMEND_CANDIDATE` |
| CUR-468–469 | REF-016/019; RVIS-016/017 | `EXPERIMENT_REQUIRED` | Correct active state matters only after mobile/desktop navigation pattern is selected. | - | `EXPERIMENT_CANDIDATE` |
| CUR-470 | RVIS-012/013 | `ALIGNED` | Pre-auth without member navigation aligns. | - | `KEEP_CANDIDATE` |
| CUR-471 | RVIS-008/022 | `ALIGNED` | Cohesive scan-oriented lists are strongly consistent with reference. | - | `KEEP_CANDIDATE` |
| CUR-472 | REF-018/019; RVIS-041 | `ALIGNED_BUT_OVERSPECIFIED` | Adaptive responsive behavior aligns; 375↔1440 wording is an example, not exhaustive rule. | - | `AMEND_CANDIDATE` |
| CUR-473 | REF-017; RVIS-008/017 | `REFERENCE_STRONGER` | Desktop should use space purposefully, but forcing a rail/sidebar merely to avoid 'dead margin' can create noise. | - | `AMEND_CANDIDATE` |
| CUR-474 | REF-020; RVIS-020 | `REFERENCE_STRONGER` | 44px is comfort guidance, not universal WCAG AA minimum. | - | `AMEND_CANDIDATE` |
| CUR-475 | REF-022; RVIS-028 | `REFERENCE_STRONGER` | Semantic heading hierarchy matters; a universal exactly-one-h1 rule is not the objective standard. | - | `AMEND_CANDIDATE` |
| CUR-476 | REF-032 | `ALIGNED` | Visible focus aligns. | - | `KEEP_CANDIDATE` |
| CUR-477 | REF-018 | `ALIGNED` | Page-level horizontal overflow should be prevented subject to legitimate 2D exceptions. | - | `KEEP_CANDIDATE` |
| CUR-478 | REF-032; RVIS-033 | `ALIGNED` | Correct locale/diacritics align. | - | `KEEP_CANDIDATE` |
| CUR-479 | REF-004/027/028/035 | `REFERENCE_STRONGER` | 'Friendly errors' is too vague; reference requires truthful cause class, privacy-safe detail and recovery. | - | `AMEND_CANDIDATE` |
| CUR-480–483 | REF-003/004/005 | `ALIGNED` | Privacy/trust exclusions align. | - | `KEEP_CANDIDATE` |
| CUR-484 | REF-037/038; HeroUI component contract | `INCUMBENT_HAS_PRODUCT_CONTEXT` | Token-name separation between overlay surface and modal backdrop is local integration knowledge consistent with semantic-token reference. | - | `KEEP_CANDIDATE` |
| CUR-485 | Phase-4 runtime evidence required | `INSUFFICIENT_EVIDENCE` | Claim that all accessibility gates are enforced by capture.mjs cannot be validated in Phase 3 without reading runtime/tooling source. | Phase 4: inspect capture.mjs capabilities against each claimed gate. | `AMEND_CANDIDATE` |

## Detailed high-impact conflict records

### F3-C01 — Competitor anchoring
- **Current:** `CUR-001–011`
- **Reference:** `REF-007/011; RVIS-001/002/003/008/022`
- **Why:** The incumbent makes Nextdoor a normative design source and then enumerates what to copy/not copy. The reference instead derives interaction architecture from Bivaque's own problem, task density, trust model and information architecture.
- **Still unknown / discriminator:** Whether any specific Nextdoor pattern outperforms reference alternatives on Bivaque content.
- **Provisional direction:** Remove competitor-specific normative authority; individual patterns may survive only if independently justified.

### F3-C02 — Institutional tone
- **Current:** `CUR-015`
- **Reference:** `REF-005; RVIS-001/002`
- **Why:** The incumbent requires a 'sóbrio e institucional' tone. The reference wants calm/trustworthy/practical but explicitly avoids institutionally authoritative, ceremonial or official cues.
- **Still unknown / discriminator:** Brand perception with representative users.
- **Provisional direction:** Amend toward calm, trustworthy, community-operated; test distinct visual identity separately.

### F3-C03 — Exact visual system values
- **Current:** `CUR-018–074; CUR-259–289`
- **Reference:** `REF-037/038/039; RVIS-005/006/007/009/028/029`
- **Why:** Semantic token categories and consistency align, but the independent benchmark does not justify the incumbent navy palette, precise scales, radii, shadow recipes, typography values or motion curves as normative truth.
- **Still unknown / discriminator:** Candidate-system comparison on real content: readability, scanability, contrast, layout stability, brand perception and implementation cost.
- **Provisional direction:** Convert exact values from unquestioned law into candidate design-system experiments until validated.

### F3-C04 — Loading button label
- **Current:** `CUR-081`
- **Reference:** `REF component summary; RVIS component table`
- **Why:** Incumbent crossfades the action label to a spinner. Reference requires loading to preserve the action label while showing pending state.
- **Still unknown / discriminator:** Canonical HeroUI Button behavior and real screen-reader/visual test.
- **Provisional direction:** Amend unless runtime proves an equivalent accessible/persistent action name.

### F3-C05 — Route loading blanket rule
- **Current:** `CUR-115`
- **Reference:** `REF-034/035`
- **Why:** Incumbent requires `loading.tsx` skeletons for every route segment. Reference requires meaningful Suspense/loading boundaries matching user-perceived regions, not mechanical one-per-segment usage.
- **Still unknown / discriminator:** Inspect route boundaries and throttled navigation.
- **Provisional direction:** Replace blanket rule with outcome-based loading contract.

### F3-C06 — Responsive geometry
- **Current:** `CUR-117–122; CUR-321; CUR-325–330; CUR-364–374`
- **Reference:** `REF-016/017/019/021/039; RVIS-016/017/021`
- **Why:** Incumbent freezes 640/1024/224/288–320 widths and mobile-bottom/desktop-sidebar behavior. Reference says transitions should be content-fit driven and explicitly leaves narrow navigation and exact widths as experiments.
- **Still unknown / discriminator:** Viewport sweep, 320-equivalent/zoom, Portuguese labels, navigation fit, content density, wide-screen scanability.
- **Provisional direction:** Run bounded responsive/navigation experiments before keeping any exact geometry.

### F3-C07 — Fixed four-container navigation
- **Current:** `CUR-302–320; CUR-327`
- **Reference:** `REF-008/009/011/016; RVIS-014/016/019`
- **Why:** Incumbent treats four containers as product invariant and makes every future destination fit them. Reference separates task navigation from membership scope and does not freeze exact destination count or placement.
- **Still unknown / discriminator:** Prototype task-navigation plus explicit scope context across core journeys; measure comprehension, scope awareness, target fit and navigation depth.
- **Provisional direction:** Amend the invariant to preserve product scope semantics, not a fixed container count.

### F3-C08 — Navigation contradicts itself
- **Current:** `CUR-315/318/375/416`
- **Reference:** `REF-011/012`
- **Why:** The same incumbent guide says Events is not a tab and Recommendations lives in the header, while wireframes/sidebar rules place both as destinations.
- **Still unknown / discriminator:** No runtime is needed to establish the documentary contradiction; runtime only shows which variant currently exists.
- **Provisional direction:** Resolve in adjudication after IA experiment; do not preserve both.

### F3-C09 — Group list versus grid
- **Current:** `CUR-171–175 vs CUR-382–390`
- **Reference:** `RVIS-008/022; RVIS §3.7`
- **Why:** DESIGN_SPEC prescribes grid cards; VISUAL_GUIDE explicitly says row list, not floating cards. Reference leans toward scan-oriented list rhythm but does not freeze the exact group presentation.
- **Still unknown / discriminator:** Real group count, cover-image availability, membership metadata, narrow/wide scan time.
- **Provisional direction:** Experiment; list has stronger pre-runtime evidence than card grid but is not yet final.

### F3-C10 — Messaging scope
- **Current:** `CUR-208–222; CUR-417–430`
- **Reference:** `Phase-1 sanitized pilot scope`
- **Why:** Private one-to-one chat was not a required Phase 1 pilot outcome, so dozens of detailed message-layout rules have no independent product justification in the benchmark.
- **Still unknown / discriminator:** Explicit product decision: keep/defer/remove private messaging; if kept, verify authorization/shared-context model.
- **Provisional direction:** Human decision before investing further design authority.

### F3-C11 — Accessibility: 44px
- **Current:** `CUR-242/300/474`
- **Reference:** `REF-020; RVIS-020`
- **Why:** Incumbent labels 44×44 as the universal accessibility gate. Reference correctly distinguishes WCAG 2.2 SC 2.5.8's 24×24 CSS-pixel criterion/spacing exceptions from ~44px touch-comfort guidance.
- **Still unknown / discriminator:** Rendered target audit and touch usability for frequent controls.
- **Provisional direction:** Amend standard wording; retain ~44px as strong touch target guidance where layout permits.

### F3-C12 — Accessibility: h1
- **Current:** `CUR-244/290/475`
- **Reference:** `REF-022/030; RVIS-028`
- **Why:** Semantic page/heading structure matters, but exactly one h1 on every 'screen' is not itself the independent WCAG requirement.
- **Still unknown / discriminator:** Accessibility-tree/document-outline review across route/modal/composite contexts.
- **Provisional direction:** Amend to semantic heading hierarchy and meaningful page title/landmarks.

### F3-C13 — Composer pattern
- **Current:** `CUR-094/146/147 vs CUR-353/354`
- **Reference:** `RVIS §3.3; REF-001/002/028`
- **Why:** The incumbent alternates between inline expansion and modal composer and specifies incompatible shortcut sets. Reference only requires safe scoped contribution, draft preservation and audience clarity.
- **Still unknown / discriminator:** Prototype inline versus modal/bottom-sheet at narrow/wide widths; test audience comprehension, viewport consumption, draft recovery and keyboard behavior.
- **Provisional direction:** Experiment; preserve contribution trust invariants regardless of shell.

### F3-C14 — Onboarding CTA color
- **Current:** `CUR-296 vs CUR-457`
- **Reference:** `REF-038/039; RVIS-006/007/036`
- **Why:** Incumbent globally says primary verify CTA uses blue accent but later requires green onboarding CTA. Reference keeps brand accent open and reserves semantic status colors from arbitrary action hierarchy.
- **Still unknown / discriminator:** Palette/action-hierarchy comparison with contrast and semantic-state audit.
- **Provisional direction:** Amend inconsistent color semantics; final hue is an experiment.

### F3-C15 — Enforcement claim
- **Current:** `CUR-485`
- **Reference:** `Phase 4 required`
- **Why:** The design docs claim all listed accessibility gates are enforced by `scripts/visual/capture.mjs`. Phase 3 cannot verify an implementation claim without reading the tool source/runtime.
- **Still unknown / discriminator:** Inspect the script, its rules, fixtures, viewports and actual failure modes.
- **Provisional direction:** Do not carry the claim into vNext unless Phase 4 proves it.

## Reference gaps exposed by the incumbent
The confrontation also identifies areas where the incumbent contains legitimate product/implementation context that the blind reference intentionally did not know. These are **not automatic incumbent wins**; they are inputs for later adjudication:

- exact authentication providers and CPF formatting (`CUR-126`, `CUR-128`, `CUR-136`, `CUR-453`, `CUR-455–456`);
- waitlist recovery (`CUR-141`, `CUR-458`);
- family invitation placement (`CUR-240`, `CUR-447`);
- HeroUI-local overlay/backdrop token naming (`CUR-484`);
- shared-context requirement if private messaging survives (`CUR-220`).

## Phase 4 queue generated by Phase 3
| ID | Area | Current rules | Required Phase 4 evidence |
|---|---|---|---|
| P4-01 | Navigation/scope | CUR-302–331, 364–376 | Compare current runtime with REF-008/010/011/016 and RVIS-014/016/017; capture scope comprehension and actual responsive behavior. |
| P4-02 | Responsive geometry | CUR-117–122, 255–257, 321, 417, 461, 472–474 | Viewport sweep including 320-equivalent/400% zoom; determine where layout actually breaks and whether 1024/224/320 rules help. |
| P4-03 | Group presentation | CUR-171–181, 380–392 | Compare current list/grid behavior with real content density and navigation/membership comprehension. |
| P4-04 | Composer | CUR-094–096, 145–147, 352–361 | Observe current composer, audience cue, draft preservation, keyboard/mobile behavior and internal spec divergence. |
| P4-05 | States/errors | CUR-115–116, 129–141, 151, 163–167, 342–347, 466–467, 479 | Fault-inject loading/empty/error/pending and confirm error never masquerades as empty or leaks sensitive/backend detail. |
| P4-06 | HeroUI compound controls | CUR-189–193, 242–254, 388–390, 401–407, 474–477 | Real keyboard/focus/accessibility-tree tests against current HeroUI v3 behavior. |
| P4-07 | Visual system candidates | CUR-018–074, 259–300, 377–379, 396–404, 450–457, 462–465 | Measure existing palette/type/spacing/motion as incumbent candidate; do not treat it as winner without comparison. |
| P4-08 | Messaging | CUR-208–222, 417–430 | First resolve product scope; runtime evidence is secondary if the feature is not pilot-critical. |
| P4-09 | Audit enforcement | CUR-461, 474–477, 485 | Inspect capture/audit tooling to determine which claimed checks are mechanical, partial, or purely human. |

## Phase 3 quality check
- [x] `CUR-001` through `CUR-485` each have exactly one comparison outcome.
- [x] All Phase 2 support-0–2 clusters are confronted rather than silently inherited.
- [x] Reference `MUST` conflicts/missing coverage are surfaced, especially audience/scope, state truth, semantics, privacy and accessibility.
- [x] Incumbent absolute/fixed numerical rules are explicitly tested against reference confidence and false-precision rules.
- [x] Direct contradictions between `DESIGN_SPEC.md` and `VISUAL_GUIDE.md` remain visible.
- [x] No final `KEEP/AMEND/DELETE/EXPERIMENT/HUMAN_DECISION` verdict is issued; all actions remain `_CANDIDATE`.
- [x] No Phase 4 implementation/runtime evidence was consumed.

**Phase 3 completion condition: satisfied.** The next mutation in this audit program belongs to `RUNTIME_FINDINGS.md`, not to the incumbent design documents or adjudication.
