# DESIGN_SPEC — Bivaque vNext

> **Status: PHASE 6 vNext — rewritten from the frozen Phase 5.5 adjudication.**
>
> This document is the canonical interaction/design contract for Bivaque. It is intentionally small. Product inventory, auth-provider configuration, route-by-route wireframes, implementation details, audit-harness mechanics, and unvalidated visual recipes do not belong here.
>
> Every normative rule below traces to a Phase 5.5 `KEEP`, `AMEND`, or `RT-ADD-*` decision. Deleted incumbent rules do not regain authority through examples or implementation convenience.

## 0. Interpretation and authority

Normative labels:

- **MUST** — product/trust invariant, objective standard, or interaction contract with strong evidence.
- **SHOULD** — strong default with legitimate context-dependent exceptions.
- **MAY** — optional behavior that does not weaken a stronger rule.
- **EXPERIMENT** — meaningful competing hypotheses remain open; implementation may prototype candidates but must not present one as final design law.
- **HUMAN_DECISION** — product authority is required before the design contract can harden the choice.

Examples are illustrative, not normative. Exact pixels, colors, counts, widths, durations, component anatomy, and route placement are not requirements unless a rule explicitly says otherwise.

`VISUAL_GUIDE.md` translates this contract into visual craft. If a visual treatment conflicts with a `MUST` here, this document wins.

---

## 1. Product character, trust, and identity

### DS-001 — Community-operated character
**SHOULD:** Bivaque feels calm, trustworthy, practical, local, and community-operated. It must not rely on ceremonial, tactical, prestige, or institutionally authoritative cues to create trust.

Trace: `CUR-015 AMEND` · `RT-DEC-001`.

### DS-002 — Audience before consequential action
**MUST:** Before a consequential publish, share, or moderation commit, the interface exposes the effective audience/scope in the same decision context.

Trace: `RT-ADD-001`.

### DS-003 — No silent audience widening
**MUST:** Navigation, retry, draft recovery, context switching, or other state transitions never silently widen a contribution from a narrower audience to a broader one.

Trace: `RT-ADD-001`.

### DS-004 — Durable knowledge remains recoverable
**MUST:** Durable answers, recommendations, guidance, services, and local/event information remain recoverable through structured search/discovery independently of chronological activity.

Trace: `RT-ADD-002`.

### DS-005 — Role and verification truth
**MUST:** Role, eligibility, and verification cues never imply a stronger trust class than the product actually establishes. Public profile UI does not expose verification prestige, military rank, military organization, or address.

Trace: `CUR-232 AMEND`; `CUR-233–236 KEEP`.

### DS-006 — Privileged/provider contexts remain distinct
**MUST:** Operator/community-owner workflows and provider contexts remain visibly and navigationally distinct from ordinary member context when privileges, consequences, or accessible data differ.

Trace: `CUR-336–337 KEEP`; `CUR-182 AMEND`.

### DS-007 — Sensitive verification data is not echoed back
**MUST:** After submission, CPF is not echoed back in ordinary interface copy or confirmation UI.

Trace: `CUR-137 KEEP`.

### DS-008 — Private event location is authorization-gated
**MUST:** Private event location is rendered only to authorized users, with authorization enforced server-side. Unauthorized clients are not sent the private venue and then asked to hide it.

Trace: `CUR-191–192 KEEP`.

---

## 2. Scope and information architecture

### DS-009 — Task navigation and membership scope are different concepts
**MUST:** Primary task navigation answers what the user is doing; membership scope answers where/with whom it is happening. The interface does not force locality/community/group scope to masquerade as an arbitrary list of product features.

Trace: `CUR-301 AMEND`; `RT-ADD-003`.

### DS-010 — Scope is inspectable where it affects content or audience
**MUST:** When active scope changes visible content, authorization, or publishing audience, the current scope is inspectable from the task context and is derived from actual membership state rather than a pilot-city literal.

Trace: `RT-ADD-003`; Phase 4 `RUN-005/016`.

### DS-011 — Conceptual parent remains consistent across responsive variants
**MUST:** The same destination cannot silently change conceptual parent merely because the viewport switches navigation presentation.

Trace: `RT-ADD-003`; Phase 4 `RUN-004/018`.

### DS-012 — Pre-auth stays outside member navigation
**MUST:** Login and onboarding/admission experiences remain outside the authenticated member shell and do not expose member navigation.

Trace: `CUR-449 KEEP`.

### DS-013 — Event information respects active authorized scope
**MUST:** Event/local information is presented in the active authorized locality/community context; the contract does not prescribe that Events must or must not be a top-level destination.

Trace: `CUR-316 AMEND`.

---

## 3. State truth and recovery

### DS-014 — Material states are distinct
**MUST:** When applicable, loading, true empty, denied/unavailable, recoverable failure, pending/optimistic, success, and stale/retry states remain distinguishable in meaning and recovery path.

Trace: `CUR-466 AMEND`; `RT-ADD-006`.

### DS-015 — Failure never masquerades as empty
**MUST:** A failed data query or action is never converted into an empty-state success merely because returned data is null, undefined, or an empty collection.

Trace: `RT-ADD-006`; Phase 4 `RUN-008`.

### DS-016 — Raw backend errors stay diagnostic
**MUST:** User-facing error UI never renders raw Supabase/Postgres/internal error strings. Stable recovery copy is user-facing; raw cause remains diagnostic/logging data.

Trace: `CUR-346 KEEP`; Phase 4 `RUN-009`.

### DS-017 — Optimistic UI reconciles truthfully
**MUST:** On optimistic mutation failure, the visible state reconciles or rolls back clearly instead of leaving the user with false success.

Trace: `CUR-092 KEEP`; `RT-ADD-006`.

### DS-018 — Pending membership state persists
**MUST:** A pending private-group membership request remains visibly pending across refresh/navigation until product state changes.

Trace: `CUR-179 KEEP`.

### DS-019 — No-results preserves query context
**MUST:** Search/discovery no-results state keeps the active query/filter context available for correction or reset.

Trace: `CUR-207 KEEP`.

### DS-020 — Loading boundaries follow user-perceived regions
**SHOULD:** Loading/streaming boundaries preserve stable shell and scope context, correspond to meaningful pending regions, and use fallbacks shaped to the pending content without gratuitous flashes.

Trace: `CUR-115–116 AMEND`; `RT-ADD-010`.

---

## 4. Interaction and component contracts

### DS-021 — Native semantics first; canonical compound behavior
**MUST:** Links navigate, buttons command, and semantic HTML is preferred before ARIA. HeroUI/React Aria compound controls preserve canonical name/role/state/focus/keyboard behavior unless a documented and tested simpler semantic fallback is demonstrably stronger.

Trace: `RT-ADD-004`; Phase 4 `RUN-007/012/013`.

### DS-022 — Accessible form composition
**MUST:** User-input fields have persistent accessible labels. Help/error/required/invalid state is programmatically associated with the control; placeholder text is supplemental and never the only label.

Trace: `RT-ADD-005`.

### DS-023 — Modal focus lifecycle
**MUST:** Modal dialogs contain focus while active, support Escape dismissal when dismissal is allowed, and restore focus to a meaningful trigger/origin when closed.

Trace: `CUR-250–252 KEEP`.

### DS-024 — Accessible names and image alternatives
**MUST:** Interactive controls expose meaningful accessible names, and images provide appropriate alternative text or are explicitly decorative.

Trace: `CUR-246–247 KEEP`.

### DS-025 — Motion never carries meaning alone
**MUST:** State or meaning is not communicated solely through motion. `prefers-reduced-motion` removes or materially reduces non-essential animated travel while preserving necessary state feedback.

Trace: `CUR-076 KEEP`; `CUR-075 AMEND`.

### DS-026 — Pending action retains meaning
**SHOULD:** A pending action remains identifiable as the same action, prevents harmful duplicate activation, and keeps its layout stable enough to avoid accidental target movement. Loading geometry approximates the region it replaces rather than following one universal skeleton recipe.

Trace: `CUR-081–082 AMEND`; `RT-ADD-010`.

### DS-027 — Failure feedback supports recovery
**MUST:** Recoverable failure feedback remains present long enough to understand and act on it, preserves useful entered state where safe, and is privacy-safe. No universal shake/toast treatment is prescribed.

Trace: `CUR-093 AMEND`; `CUR-140 AMEND`; `RT-ADD-006`.

### DS-028 — Membership controls communicate consequence
**MUST:** Join/request/member states communicate the actual membership consequence and pending status; exact labels and control geometry remain product/copy decisions.

Trace: `CUR-178 AMEND`; `CUR-179 KEEP`.

---

## 5. Accessibility and responsive behavior

### DS-029 — Objective accessibility baseline
**MUST:** Production member and governance interfaces meet applicable WCAG 2.2 Level AA criteria. This includes correct text/non-text contrast, non-color state cues, visible focus, keyboard operation, zoom/text resize, reflow, pointer-target requirements and defined exceptions, language/locale correctness, and reduced-motion behavior.

Trace: `RT-ADD-007`.

### DS-030 — Responsive transitions are content-driven
**SHOULD:** Layout/navigation transitions occur when content, labels, controls, readable measure, or interaction complexity require adaptation, not because an inherited device category says so. Exact breakpoints remain experimental unless objective constraints force them.

Trace: `RT-ADD-008`; `CUR-477 AMEND`.

### DS-031 — Reading measure and scan density serve different tasks
**SHOULD:** Long reading regions use a bounded readable measure; scan/discovery/governance surfaces may use more width when hierarchy and comparison improve. Wide space is not filled merely to eliminate empty margin.

Trace: `RT-ADD-008`.

### DS-032 — Discovery exposes decision-critical metadata
**SHOULD:** Discovery/list items expose enough source, scope, freshness, type, and trust/endorsement context for a person to decide whether to open them. Exact card/row anatomy is not normative.

Trace: `CUR-154 AMEND`; `CUR-203 AMEND`; `RT-ADD-009`.

### DS-033 — Selection/unread meaning is not color-only
**MUST:** Selected, unread, warning, error, and other material state meaning uses semantic/state cues that remain understandable without color alone.

Trace: `CUR-224 AMEND`; `RT-ADD-007`.

### DS-034 — Semantic tokens before aesthetic values
**MUST:** Shared visual roles use semantic tokens for surfaces/backgrounds, text hierarchy, borders, actions, focus, selected/disabled state, status, typography, spacing, radii, elevation, and motion where those roles are system-wide. Raw one-off values may exist only when genuinely local and non-semantic; they do not become design-system authority.

Trace: `CUR-016 AMEND`.

### DS-035 — Locale/copy correctness
**MUST:** New Portuguese copy uses correct diacritics and locale-sensitive language/date/number behavior where applicable.

Trace: `CUR-293 KEEP`; `RT-ADD-007`.

---

## 6. Visual system status

### DS-036 — Exact aesthetic system remains an experiment
**EXPERIMENT:** Brand accent, exact palette, font family, typography scale, spacing scale, radii, elevation, motion durations, content widths, and responsive thresholds are selected as coherent systems through comparative validation. The incumbent Navy/system-sans combination is one candidate, not baseline truth.

> **Resolved for palette and type on 2026-08-28 by explicit product authority.**
> `EXP-004` ran three candidates (`docs/agents/design-audit/experiments/EXP-004-2026-08-21-172457/`)
> and deliberately did not name a winner, because its first open question —
> local paper (A) / community platform (B) / operational tool (C) — is a product
> call. The owner answered it in favour of the editorial register, and
> [`ADR-20260828-sistema-visual-editorial`](../decisions/ADR-20260828-sistema-visual-editorial.md)
> records the decision, the two deliberate divergences from candidate A, and the
> contrast evidence. The palette, the two type families, the radius/elevation
> restraint and the ruled-list surface strategy are therefore no longer open.
>
> **Still `EXPERIMENT` under this rule:** the typography and spacing *scales*,
> motion durations, content widths and responsive thresholds. Adopting a
> direction is not the same as validating every value inside it, and the rest of
> §7 is untouched.

Trace: `CUR-018 EXPERIMENT`; `CUR-280 EXPERIMENT`; `EXP-004`; `RT-DEC-002`; `ADR-20260828-sistema-visual-editorial`.

The visual acceptance bar and craft implications are defined in `VISUAL_GUIDE.md`. They constrain quality without selecting the unresolved EXP-004 values.

---

## 7. Open experiments

These remain explicitly unresolved. A Phase 6 implementation may prototype them but may not harden a winner without comparative evidence or explicit product authority.

| Experiment | Question |
|---|---|
| `EXP-001` | Primary task navigation + scope model; destination set; narrow/medium/wide presentation. |
| `EXP-002` | Composer disclosure: modal vs inline vs adaptive. |
| `EXP-003` | Groups discovery: cards vs rows vs hybrid. |
| `EXP-004` | ~~Coherent visual system: palette/type/spacing/radius/elevation/motion.~~ **Palette, type, radius and elevation resolved** by `ADR-20260828-sistema-visual-editorial`; scales, motion durations, widths and thresholds remain open. |
| `EXP-005` | Admission grouping: single surface vs short staged flow. |
| `EXP-006` | Activity sorting: whether `Recentes / Relevantes` improves retrieval/noise. |
| `EXP-007` | Event presentation: date grouping and RSVP model. |
| `EXP-008` | Recommendation category discovery pattern. |
| `EXP-009` | Profile structure and durable URL/back behavior. |
| `EXP-010` | Group discovery IA: `Meus grupos / Descobrir` vs alternatives. |
| `EXP-011` | Notification grouping model. |

---

## 8. Human decisions

These are product questions, not design-system gaps. Do not invent answers during visual implementation.

| Decision | Question |
|---|---|
| `CUR-220 HUMAN_DECISION` | If private messaging survives, what shared-context/eligibility model authorizes a thread? |
| `CUR-239 HUMAN_DECISION` | What is the canonical profile-visibility policy? |
| `CUR-319 HUMAN_DECISION` | If private messaging survives, does it belong in member task IA, and where? |

Detailed speculative messaging layouts remain deleted until these questions are resolved.

---

## 9. Traceability boundary

Phase 6 may not reintroduce deleted incumbent rules as normative details. In particular, the following remain non-authoritative unless selected by an experiment or a future adjudicated change:

- competitor imitation;
- fixed pilot-city UI literals;
- exact card anatomy;
- fixed skeleton counts;
- fixed pixel/card/grid widths;
- exact breakpoints based on device labels;
- fixed radii/shadow tiers/motion distances/durations;
- universal toast/sheet/pull-to-refresh recipes;
- exact navigation destination count;
- route-by-route wireframe law;
- auth-provider/feature inventory;
- audit-harness implementation claims.

If implementation needs one of these values, it is an implementation/prototype choice until separately validated; it does not automatically amend this contract.
