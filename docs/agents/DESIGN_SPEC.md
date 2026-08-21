# DESIGN_SPEC — Bivaque vNext

> **Status: PHASE 6 vNext — rewritten from the frozen Phase 5.5 adjudication.**
>
> Canonical interaction/design contract. Product inventory, auth-provider configuration, route wireframes, implementation details, audit-harness mechanics, and unvalidated visual recipes do not belong here.
>
> Every settled normative rule (`MUST`/`SHOULD`) traces to a Phase 5.5 `KEEP`, `AMEND`, or `RT-ADD-*` decision. `EXPERIMENT` entries trace to the frozen experiment register and remain explicitly unsettled. Deleted incumbent rules do not regain authority through examples or implementation convenience.

## 0. Interpretation

- **MUST** — product/trust invariant, objective standard, or strongly evidenced interaction contract.
- **SHOULD** — strong default with legitimate context-dependent exceptions.
- **MAY** — optional behavior that does not weaken stronger rules.
- **EXPERIMENT** — competing hypotheses remain open; prototypes may test candidates but cannot harden a winner without the decision gate.
- **HUMAN_DECISION** — product authority is required before design can harden the choice.

Examples are illustrative. Exact pixels, colors, counts, widths, durations, component anatomy, and route placement are not requirements unless explicitly adjudicated. `VISUAL_GUIDE.md` translates this contract into visual craft and cannot weaken a `MUST` here.

## 1. Product character, trust, identity

### DS-001 — Community-operated character
**SHOULD:** Bivaque feels calm, trustworthy, practical, local, and community-operated. Its trust should not depend on ceremonial, tactical, prestige, or institutionally authoritative cues.  
Trace: `CUR-015 AMEND`; `RT-DEC-001`.

### DS-002 — Audience before consequential action
**MUST:** Before consequential publish/share/moderation commit, expose the effective audience/scope in the same decision context.  
Trace: `RT-ADD-001`.

### DS-003 — No silent audience widening
**MUST:** Navigation, retry, draft recovery, context switching, or other state transitions never silently widen a contribution.  
Trace: `RT-ADD-001`.

### DS-004 — Durable knowledge remains recoverable
**MUST:** Durable answers, recommendations, guidance, services, and local/event information remain recoverable through structured search/discovery independently of chronological activity.  
Trace: `RT-ADD-002`.

### DS-005 — Role and verification truth
**MUST:** Role, eligibility, and verification cues never imply stronger trust than the product establishes. Public profile UI does not expose verification prestige, military rank, military organization, or address.  
Trace: `CUR-232 AMEND`; `CUR-233–236 KEEP`.

### DS-006 — Privileged/provider contexts remain distinct
**MUST:** Operator/community-owner workflows and provider contexts remain visibly and navigationally distinct from member context when privileges, consequences, or accessible data differ.  
Trace: `CUR-336–337 KEEP`; `CUR-182 AMEND`.

### DS-007 — Sensitive verification data is not echoed back
**MUST:** After submission, CPF is not echoed back in ordinary interface copy or confirmation UI.  
Trace: `CUR-137 KEEP`.

### DS-008 — Private event location is authorization-gated
**MUST:** Private event location is rendered only to authorized users, with authorization enforced server-side; unauthorized clients are not sent the venue and then asked to hide it.  
Trace: `CUR-191–192 KEEP`.

## 2. Scope and information architecture

### DS-009 — Task navigation and membership scope are distinct
**MUST:** Primary task navigation answers what the user is doing; membership scope answers where/with whom it happens. Scope concepts do not masquerade as an arbitrary feature list.  
Trace: `CUR-301 AMEND`; `RT-ADD-003`.

### DS-010 — Material scope is inspectable and real
**MUST:** When scope changes content, authorization, or publishing audience, it is inspectable from the task context and derived from actual membership state rather than a pilot-city literal.  
Trace: `RT-ADD-003`; `RUN-005/016`.

### DS-011 — Conceptual parent is responsive-invariant
**MUST:** A destination cannot silently change conceptual parent because the viewport changes navigation presentation.  
Trace: `RT-ADD-003`; `RUN-004/018`.

### DS-012 — Pre-auth stays outside member navigation
**MUST:** Login and onboarding/admission remain outside the authenticated member shell and member navigation.  
Trace: `CUR-449 KEEP`.

### DS-013 — Event/local information respects authorized scope
**MUST:** Event/local information is presented in the active authorized locality/community context; this contract does not prescribe whether Events is top-level navigation.  
Trace: `CUR-316 AMEND`.

## 3. State truth and recovery

### DS-014 — Material states are distinct
**MUST:** When applicable, loading, true empty, denied/unavailable, recoverable failure, pending/optimistic, success, and stale/retry remain distinguishable in meaning and recovery path.  
Trace: `CUR-466 AMEND`; `RT-ADD-006`.

### DS-015 — Failure never masquerades as empty
**MUST:** A failed query/action is never converted into empty-state success because data is null, undefined, or empty.  
Trace: `RT-ADD-006`; `RUN-008`.

### DS-016 — Raw backend errors stay diagnostic
**MUST:** User-facing error UI never renders raw Supabase/Postgres/internal strings; raw cause remains diagnostic/logging data.  
Trace: `CUR-346 KEEP`; `RUN-009`.

### DS-017 — Optimistic UI reconciles truthfully
**MUST:** Optimistic mutation failure visibly reconciles or rolls back instead of leaving false success.  
Trace: `CUR-092 KEEP`; `RT-ADD-006`.

### DS-018 — Pending membership persists
**MUST:** A pending private-group membership request remains visibly pending across refresh/navigation until product state changes.  
Trace: `CUR-179 KEEP`.

### DS-019 — No-results preserves query context
**MUST:** Search/discovery no-results retains active query/filter context for correction or reset.  
Trace: `CUR-207 KEEP`.

### DS-020 — Loading boundaries follow perceived regions
**SHOULD:** Loading/streaming preserves stable shell/scope, maps to meaningful pending regions, and uses fallbacks shaped to pending content without gratuitous flashes.  
Trace: `CUR-115–116 AMEND`; `RT-ADD-010`.

## 4. Interaction and component contracts

### DS-021 — Native semantics first; canonical compound behavior
**MUST:** Links navigate, buttons command, and semantic HTML precedes ARIA. HeroUI/React Aria compound controls preserve canonical name/role/state/focus/keyboard behavior unless a documented tested semantic fallback is stronger.  
Trace: `RT-ADD-004`; `RUN-007/012/013`.

### DS-022 — Accessible form composition
**MUST:** Inputs have persistent accessible labels; help/error/required/invalid state is programmatically associated; placeholder alone is never the label.  
Trace: `RT-ADD-005`.

### DS-023 — Modal focus lifecycle
**MUST:** Modal dialogs contain focus while active, support Escape dismissal when dismissal is allowed, and restore focus to a meaningful trigger/origin on close.  
Trace: `CUR-250–252 KEEP`.

### DS-024 — Accessible names and image alternatives
**MUST:** Interactive controls expose meaningful accessible names; images have appropriate alternatives or are explicitly decorative.  
Trace: `CUR-246–247 KEEP`.

### DS-025 — Motion never carries meaning alone
**MUST:** State/meaning is not communicated solely through motion. `prefers-reduced-motion` removes or materially reduces non-essential animated travel while preserving necessary state feedback.  
Trace: `CUR-076 KEEP`; `CUR-075 AMEND`.

### DS-026 — Pending action retains meaning
**SHOULD:** A pending action remains identifiable, prevents harmful duplicate activation, and avoids accidental target movement; fallback geometry approximates the region it replaces rather than following one universal skeleton recipe.  
Trace: `CUR-081–082 AMEND`; `RT-ADD-010`.

### DS-027 — Failure feedback supports recovery
**MUST:** Recoverable failure feedback persists long enough to understand and act on, preserves useful entered state where safe, and remains privacy-safe. No universal shake/toast recipe is prescribed.  
Trace: `CUR-093 AMEND`; `CUR-140 AMEND`; `RT-ADD-006`.

### DS-028 — Membership controls communicate consequence
**MUST:** Join/request/member states communicate actual consequence and pending status; exact labels/geometry remain product/copy decisions.  
Trace: `CUR-178 AMEND`; `CUR-179 KEEP`.

## 5. Accessibility and responsive behavior

### DS-029 — Objective accessibility baseline
**MUST:** Production member and governance interfaces meet applicable WCAG 2.2 Level AA criteria, including where applicable text/non-text contrast, non-color cues, visible focus, keyboard operation, text resize, reflow, pointer-target requirements and exceptions, and correct language identification. The additional reduced-motion contract is `DS-025`; it is not represented here as a WCAG 2.2 AA requirement.  
Trace: `RT-ADD-007`.

### DS-030 — Responsive transitions are content-driven
**SHOULD:** Layout/navigation transitions occur when content, labels, controls, readable measure, or interaction complexity require adaptation rather than inherited device categories. Exact breakpoints remain experimental unless objective constraints force them.  
Trace: `RT-ADD-008`; `CUR-477 AMEND`.

### DS-031 — Reading measure and scan density serve different tasks
**SHOULD:** Long reading uses bounded readable measure; scan/discovery/governance surfaces may widen when hierarchy/comparison improves. Wide space is not filled merely to eliminate margin.  
Trace: `RT-ADD-008`.

### DS-032 — Discovery exposes decision-critical metadata
**SHOULD:** Discovery/list items expose enough source, scope, freshness, type, and trust/endorsement context to decide whether to open them; exact card/row anatomy is not normative.  
Trace: `CUR-154 AMEND`; `CUR-203 AMEND`; `RT-ADD-009`.

### DS-033 — Material state is not color-only
**MUST:** Selected, unread, warning, error, and other material state meaning remains understandable without color alone.  
Trace: `CUR-224 AMEND`; `RT-ADD-007`.

### DS-034 — Semantic tokens before aesthetic values
**MUST:** Shared visual roles use semantic tokens for system-wide surfaces/backgrounds, text hierarchy, borders, actions, focus, selected/disabled state, status, typography, spacing, radii, elevation, and motion. Genuinely local non-semantic values do not become system authority.  
Trace: `CUR-016 AMEND`.

### DS-035 — Locale/copy correctness
**MUST:** New Portuguese copy uses correct diacritics and locale-sensitive language/date/number behavior where applicable.  
Trace: `CUR-293 KEEP`; `RT-ADD-007`.

## 6. Visual system status

### DS-036 — Exact aesthetic system remains an experiment
**EXPERIMENT:** Brand accent, exact palette, font family, typography scale, spacing scale, radii, elevation, motion durations, content widths, and responsive thresholds are selected as coherent systems through comparative validation. Incumbent Navy/system-sans is one candidate, not baseline truth.  
Trace: `CUR-018 EXPERIMENT`; `CUR-280 EXPERIMENT`; `EXP-004`; `RT-DEC-002`.

The visual acceptance bar is defined in `VISUAL_GUIDE.md`; it constrains quality without selecting EXP-004 values.

## 7. Open experiments

| Experiment | Question |
|---|---|
| `EXP-001` | Primary task navigation + scope model; destination set; narrow/medium/wide presentation. |
| `EXP-002` | Composer disclosure: modal vs inline vs adaptive. |
| `EXP-003` | Group discovery: cards vs rows vs hybrid. |
| `EXP-004` | Coherent visual system: palette/type/spacing/radius/elevation/motion. |
| `EXP-005` | Admission grouping: single surface vs short staged flow. |
| `EXP-006` | Whether `Recentes / Relevantes` improves activity retrieval/noise. |
| `EXP-007` | Event date grouping and RSVP model. |
| `EXP-008` | Recommendation-category discovery. |
| `EXP-009` | Profile structure and durable URL/back behavior. |
| `EXP-010` | `Meus grupos / Descobrir` vs alternative group-discovery IA. |
| `EXP-011` | Notification grouping model. |

## 8. Human decisions

| Decision | Question |
|---|---|
| `CUR-220` | If private messaging survives, what shared-context/eligibility model authorizes a thread? |
| `CUR-239` | What is the canonical profile-visibility policy? |
| `CUR-319` | If private messaging survives, does it belong in member task IA, and where? |

Detailed speculative messaging layouts remain deleted until these are resolved.

## 9. Traceability boundary

Deleted incumbent details do not reappear as law unless selected by an experiment or future adjudication. This includes competitor imitation, pilot-city literals, exact card anatomy, skeleton counts, fixed widths/breakpoints/radii/shadows/motion values, universal toast/sheet/pull-to-refresh recipes, exact navigation counts, route wireframes, auth-provider/feature inventory, and audit-harness claims.

Implementation may temporarily use such values as prototype choices; code presence does not amend this contract.