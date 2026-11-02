# REFERENCE_DESIGN_SPEC — independent benchmark

> **Status: PHASE 1 FROZEN.**
>
> Generated from the Phase 1 allowlist only. No incumbent Bivaque design, implementation, screenshots, routes, tokens, audits, history, or forbidden local material were consumed.
>
> **Normative interpretation:** only statements explicitly labeled `MUST`, `SHOULD`, `MAY`, or `EXPERIMENT` are normative. Unlabeled prose is rationale, context, or evidence description.

## Scope and evidence posture

This reference answers a blind-design question: what interaction and design standard best serves the sanitized Bivaque product truth within the authorized stack.

Local evidence used:
- `docs/agents/design-audit/AGENTS.md`;
- `docs/agents/design-audit/README.md`;
- `docs/agents/design-audit/PHASE1_PRODUCT_CONTEXT.md`;
- `package.json`;
- `apps/web/package.json`;
- the two Phase 1 target templates.

Dependency envelope established from the allowlisted manifests/context:
- Next.js `16.3.x`;
- React `19`;
- HeroUI v3 (`@heroui/react` / `@heroui/styles` `^3.2.3`);
- Tailwind CSS 4;
- Supabase-backed authentication/data services.

No new dependency is authorized by this reference.

## 1. Product interaction principles

### REF-001 — Audience before action
- **Statement — MUST:** Every consequential publish/share/moderation action exposes the effective audience or scope before commit.
- **Type:** `product-invariant`
- **Rationale:** Restricted locality/community/group boundaries are trust boundaries, not decorative metadata.
- **Evidence/source class:** sanitized product invariant; privacy-by-default.
- **Reference confidence:** 5
- **Validation/falsification:** For each publishing flow, a tester can identify the resulting audience before activation without opening a secondary help surface.

### REF-002 — No silent scope widening
- **Statement — MUST:** Navigation, drafting, reposting, retrying, or changing membership context never silently broadens a contribution from a narrower scope to a broader scope.
- **Type:** `product-invariant`
- **Rationale:** Accidental disclosure is a material product failure.
- **Evidence/source class:** sanitized product invariant.
- **Reference confidence:** 5
- **Validation/falsification:** Instrument scope transitions and verify that widening requires an explicit user choice with an updated audience cue.

### REF-003 — Role truth remains visible
- **Statement — MUST:** Member, dependent, civil service provider, operator, and community-owner capabilities remain distinguishable wherever that distinction changes access or trust.
- **Type:** `product-invariant`
- **Rationale:** A provider profile is not member verification; dependent eligibility is not member verification; governance capability is not ordinary membership.
- **Evidence/source class:** sanitized product roles/trust invariants.
- **Reference confidence:** 5
- **Validation/falsification:** Role-based test accounts never receive labels or access cues that imply a stronger verification class than the product truth supports.

### REF-004 — Privacy-preserving failure language
- **Statement — MUST:** Access, admission, verification, and restricted-content failure states reveal no more eligibility or membership information than the user needs to recover or understand unavailability.
- **Type:** `product-invariant`
- **Rationale:** Detailed denial reasons can disclose sensitive status.
- **Evidence/source class:** sanitized product privacy/trust invariant.
- **Reference confidence:** 5
- **Validation/falsification:** Attempt unauthorized access with multiple roles and verify that messages do not disclose another person's eligibility, membership, or hidden content existence unnecessarily.

### REF-005 — Community-operated, not official
- **Statement — MUST:** Identity, copy, iconography, trust cues, and governance language do not imply official ownership, endorsement, or institutional authority by the Brazilian Armed Forces.
- **Type:** `product-invariant`
- **Rationale:** The product is community-operated and explicitly non-official.
- **Evidence/source class:** sanitized product proposition.
- **Reference confidence:** 5
- **Validation/falsification:** Brand and onboarding review finds no seal-like, rank-like, institutional, or wording cues that a reasonable user could interpret as official channel ownership.

### REF-006 — Durable knowledge is a first-class outcome
- **Statement — MUST:** Durable answers, recommendations, guidance, services, and event/local information remain findable independently of recency in a conversational stream.
- **Type:** `product-invariant`
- **Rationale:** The core problem is loss of useful information inside noisy transient conversation.
- **Evidence/source class:** sanitized product problem/outcomes.
- **Reference confidence:** 5
- **Validation/falsification:** A user can recover an older useful item through search, filtering, structured discovery, or a durable collection without scrolling chronologically to its original posting moment.

### REF-007 — “What matters now” is not one undifferentiated feed
- **Statement — SHOULD:** The default member overview separates current activity from durable/reference material by information purpose, even when both appear on one surface.
- **Type:** `design-decision`
- **Rationale:** One homogeneous stream recreates the product problem.
- **Evidence/source class:** product problem; information-architecture reasoning.
- **Reference confidence:** 4
- **Validation/falsification:** Usability tests measure whether users can distinguish time-sensitive activity from durable knowledge and recover both without excessive scanning.

## 2. Information architecture

### Top-level mental model

**REF-008 — SHOULD:** Global task navigation and membership scope are two distinct concepts: navigation answers “what am I doing?”, while scope answers “where/with whom am I doing it?”.  
Type: `design-decision` · Confidence: 4 · Evidence: product scope model + IA reasoning · Validation: users can predict both destination and audience after switching either control.

**REF-009 — MUST:** The locality → community → group relationship remains legible as additive containment/context, never as a replacement hierarchy where entering a narrower scope erases broader membership.  
Type: `product-invariant` · Confidence: 5 · Evidence: sanitized community model · Validation: membership/context UI correctly communicates simultaneous broader and narrower belonging.

**REF-010 — SHOULD:** The authenticated member shell provides a persistent way to inspect or change the active scope when scope affects visible content or publishing audience.  
Type: `design-decision` · Confidence: 4 · Evidence: trust invariant + error prevention · Validation: users can answer “which scope am I viewing?” and “where will this publish?” from any scoped task.

### Navigation model

**REF-011 — SHOULD:** Primary navigation exposes a small, stable set of task-level destinations derived from product outcomes; the exact destination count and mobile/desktop placement remain content-fit decisions rather than a fixed number.  
Type: `design-decision` · Confidence: 3 · Evidence: cognitive-load/craft guidance + product outcomes · Validation: label comprehension, target fit, navigation depth, and task completion across narrow/wide viewports.

**REF-012 — MUST:** Repeated navigation mechanisms preserve relative order and consistent identification within the same page variation unless the user initiates the change.  
Type: `objective-standard` · Confidence: 5 · Evidence: WCAG 2.2 SC 3.2.3 / 3.2.4 · Validation: keyboard/visual regression across representative routes and viewport modes.

**REF-013 — SHOULD:** Search/discovery supports at least scope-aware query, content-type discrimination, and recovery of durable material; filters that materially define a view are represented in the URL when feasible so refresh/back/share preserve context.  
Type: `design-decision` + `implementation-guidance` · Confidence: 4 · Evidence: product outcome + Vercel Web Interface Guidelines + Next.js navigation model · Validation: refresh/back/share and cross-scope search tests.

### Content hierarchy and progressive disclosure

**REF-014 — SHOULD:** List/discovery surfaces show enough source, scope, freshness, and type metadata to support a decision to open an item, while secondary detail remains progressively disclosed.  
Type: `design-decision` · Confidence: 4 · Evidence: product trust model + craft/scanability guidance · Validation: users can distinguish item type and scope before opening; dense-state scan test.

**REF-015 — MUST:** Member-facing and operator/governance workflows are separated in navigation and visual context when privileges, consequences, or data exposure differ.  
Type: `product-invariant` · Confidence: 5 · Evidence: sanitized “govern safely” outcome · Validation: member accounts cannot enter governance-only task surfaces; authorized users receive clear workspace context.

### Mobile / desktop implications

**REF-016 — EXPERIMENT:** The exact narrow-screen primary-navigation pattern (for example, compact persistent navigation versus menu-first navigation) is selected by runtime comparison of destination fit, scope visibility, one-handed reachability, keyboard behavior, and deep-link clarity rather than by convention.  
Type: `design-decision` · Confidence: 2 · Evidence: product constraints + responsive craft lens · Validation: bounded prototype comparison on representative narrow devices.

**REF-017 — SHOULD:** Wide layouts use additional horizontal space to improve simultaneous context and scanability, not to inflate cards or line length.  
Type: `design-decision` · Confidence: 3 · Evidence: craft lens + readability/reflow standards · Validation: ultra-wide inspection and task scanning test.

## 3. Core journeys

The following journey contracts are normative at the strength shown in each row.

| Journey | Strength | User goal | Entry conditions | Primary path | Failure / recovery | Trust / privacy | State feedback | Accessibility | Proof criteria |
|---|---|---|---|---|---|---|---|---|---|
| Controlled access | MUST | Enter through the correct eligibility path | Signed out or admission pending | Identify role/relationship → provide only necessary evidence → receive clear pending/success outcome | Recoverable validation remains inline; denial avoids sensitive detail; retry/help remains available | Verification data minimized; dependent/provider paths never masquerade as member verification | Pending, denied/unavailable, recoverable error, success are distinct | Labeled fields; programmatic errors; keyboard-complete; accessible authentication | Each role reaches only its authorized next state and no sensitive eligibility detail leaks |
| Locality/community participation | MUST | Understand and participate in an entitled context | Authenticated and authorized for at least one scope | Inspect active scope → browse activity/knowledge → enter a narrower context when desired | Missing/removed access becomes unavailable, not empty; route offers safe next step | Current scope remains visible; narrower scope does not erase broader membership | Scope transition and content refresh are explicit | Focus order remains stable; scope control has accessible name/state | Users correctly identify current scope and can return to broader context |
| Scoped contribution | MUST | Publish to the intended audience | Authorized to contribute in active scope | Compose → inspect audience → submit → see pending/success | Validation preserves draft; network failure offers retry without duplicate publish; widened audience requires explicit choice | Audience visible before commit; sensitive identity detail excluded unless task-required | Pending, success, retry, moderation consequence are explicit | Labels/errors; keyboard submission; focus to error summary/first error where useful; announcements for async status | No test path can silently broaden audience or lose draft on recoverable failure |
| Durable knowledge recovery | MUST | Find an older useful answer/recommendation/guidance item | Authenticated with relevant scope access | Search/browse structured knowledge → filter by authorized scope/type → open detail → return with state preserved | No-results differs from query failure; clear filter reset and retry paths | Results respect authorization and never preview inaccessible private content | Loading, zero results, partial results, stale/retry distinguishable | Search field labeled; result list semantic; filters keyboard-operable | Known older seeded items are recoverable without chronological scrolling |
| Service discovery | MUST | Find a community-relevant service provider | Eligible member in an authorized scope | Browse/search providers → inspect category, locality/context, endorsement/trust context → act on provided contact/next step | Missing provider/unavailable listing differs from data failure | Provider is clearly not a verified member; member-only content stays inaccessible | Listing freshness/unavailable state visible where material | Provider cards/rows have meaningful names; non-color status cues | Provider accounts cannot read member-only content merely because a profile exists |
| Events/local information | SHOULD | Discover time-bound and durable local information | Authorized member | Browse relevant current/upcoming information → inspect scope/time/location → open detail | Past/cancelled/unavailable/error states distinguishable | Scope and audience stay visible | Time/status changes use text plus color/icon | Dates/times locale-aware; accessible labels; reflow of schedule content | Users can distinguish current/upcoming/past and scope without opening every item |
| Membership-context understanding | MUST | Understand locality, communities, groups, and consequences | Authenticated | Inspect memberships → see containment/context → join/request/leave where permitted → understand resulting access | Pending/denied/revoked states explicit without leaking third-party eligibility | Additive membership and relative “public” meaning are explained | Membership changes show pending/success and consequences | Relationship structure conveyed semantically, not only spatially | Users can explain broader/narrower scopes and predicted content audience |
| Governance | MUST | Perform authorized admission/moderation/membership work safely | Authorized operator/community owner | Enter distinct governance workspace → review task/context → act → receive auditable result | Destructive or high-impact actions provide confirmation/reversal where feasible; failures preserve context | Least information necessary; privilege context explicit | Pending, completed, failed, partially completed states explicit | Full keyboard path; focus management for dialogs; descriptive action labels | Privilege tests, auditability, and recovery checks pass for representative high-impact actions |

## 4. Responsive strategy

### REF-018 — Reflow baseline
- **Statement — MUST:** Content reflows without loss of information/functionality and without two-dimensional scrolling at a 320 CSS px equivalent width, except content whose meaning genuinely requires two-dimensional layout.
- **Type:** `objective-standard`
- **Rationale:** WCAG 2.2 SC 1.4.10.
- **Evidence/source class:** W3C WCAG 2.2.
- **Reference confidence:** 5
- **Validation/falsification:** 320 CSS px / 400% zoom test across core journeys.

### REF-019 — Content-driven transitions
- **Statement — SHOULD:** Responsive transitions occur when content, controls, or readable measure no longer fit their task, not because of inherited device labels; exact breakpoint values remain implementation decisions backed by stress testing.
- **Type:** `design-decision`
- **Rationale:** Avoid false precision and brittle device assumptions.
- **Evidence/source class:** responsive craft lens; WCAG reflow.
- **Reference confidence:** 4
- **Validation/falsification:** Sweep viewport widths and zoom levels; no collision, truncation of essential labels, hidden actions, or unnecessary horizontal scroll.

### REF-020 — Pointer target floor and touch comfort
- **Statement — MUST:** Pointer targets meet WCAG 2.2 SC 2.5.8 minimum sizing/spacing requirements, including the 24×24 CSS px criterion or its defined exceptions.
- **Type:** `objective-standard`
- **Rationale:** Objective pointer accessibility requirement.
- **Evidence/source class:** W3C WCAG 2.2.
- **Reference confidence:** 5
- **Validation/falsification:** Automated/manual target-size audit.
- **Statement — SHOULD:** Frequent touch controls on narrow touch layouts provide approximately 44 CSS px of usable hit area when layout permits.
- **Type:** `implementation-guidance`
- **Rationale:** Mobile motor-access comfort beyond the WCAG AA floor.
- **Evidence/source class:** current Vercel Web Interface Guidelines.
- **Reference confidence:** 4
- **Validation/falsification:** Touch-device usability test with adjacent controls and edge cases.

### REF-021 — Readable measure and density
- **Statement — SHOULD:** Long-form reading regions use a bounded readable measure, while lists, discovery, and governance surfaces may use wider task-driven grids; exact max widths are measured with real Portuguese/locale content and marked `EXPERIMENT` until validated.
- **Type:** `design-decision`
- **Rationale:** Reading and scanning have different width needs.
- **Evidence/source class:** visual craft/readability lens; WCAG text spacing/reflow.
- **Reference confidence:** 3
- **Validation/falsification:** Real-content line-length and scan tests at narrow, medium, wide, zoomed, and large-text modes.

## 5. Component interaction contract

### REF-022 — Native semantics first
- **Statement — MUST:** Navigation uses links; in-place commands use buttons; headings, lists, forms, and regions use appropriate HTML semantics before ARIA is added.
- **Type:** `objective-standard`
- **Rationale:** Native semantics provide expected keyboard, name/role/value, and assistive-technology behavior.
- **Evidence/source class:** WCAG 2.2; WAI-ARIA APG; web platform.
- **Reference confidence:** 5
- **Validation/falsification:** Accessibility tree inspection and keyboard test.

### REF-023 — Forms use accessible field composition
- **Statement — MUST:** User-input fields have persistent accessible labels; required/invalid state and descriptive errors are programmatically associated; placeholder text is not the only label.
- **Type:** `objective-standard`
- **Rationale:** WCAG input assistance; HeroUI v3 provides `TextField` + `Label` + `Input/TextArea` + `Description` + `FieldError`.
- **Evidence/source class:** WCAG 2.2 SC 3.3.1–3.3.3; HeroUI v3 maintainer docs.
- **Reference confidence:** 5
- **Validation/falsification:** Screen-reader field navigation, form submission with errors, axe/manual label checks.

### REF-024 — Selection controls retain canonical behavior
- **Statement — MUST:** Checkbox, radio-group, select/listbox, and menu interactions preserve the installed HeroUI v3 / React Aria semantic and keyboard contract unless a documented product need requires a tested deviation.
- **Type:** `implementation-guidance`
- **Rationale:** Re-implementing compound-control behavior creates keyboard/focus risk.
- **Evidence/source class:** HeroUI v3 maintainer docs; WAI-ARIA APG.
- **Reference confidence:** 5
- **Validation/falsification:** Keyboard matrix and accessibility-tree tests against canonical examples.

### REF-025 — Modal focus lifecycle
- **Statement — MUST:** Modal dialogs move focus inside on open, keep `Tab`/`Shift+Tab` within the modal while open, provide an accessible name, support an appropriate dismissal path, and return focus to the invoking context when that remains meaningful.
- **Type:** `objective-standard`
- **Rationale:** Modal interaction must not strand keyboard users.
- **Evidence/source class:** WAI-ARIA APG Dialog pattern; HeroUI v3 Modal.
- **Reference confidence:** 5
- **Validation/falsification:** Keyboard open/close/focus-return test including long/scrolling dialogs.

### REF-026 — Tabs are local section controls, not hidden routing
- **Statement — SHOULD:** Tabs are used for closely related panels within one conceptual context; if state must survive share/refresh/back or represents a distinct destination, URL-backed navigation is preferred or tab selection is URL-synchronized.
- **Type:** `design-decision`
- **Rationale:** Tabs are panel selection controls; durable navigational state needs deep-link semantics.
- **Evidence/source class:** WAI-ARIA APG Tabs; HeroUI v3 Tabs; Vercel URL-state guidance.
- **Reference confidence:** 4
- **Validation/falsification:** Keyboard arrow/tab behavior plus refresh/back/share tests.

### REF-027 — Feedback placement matches consequence
- **Statement — SHOULD:** Field/action errors appear inline near the affected context; page/section failures appear in-place with recovery; toasts are reserved for transient supplemental status and never carry the only copy of critical failure or required action.
- **Type:** `design-decision`
- **Rationale:** Users need persistent recovery context; HeroUI toast is temporary by design.
- **Evidence/source class:** WAI form notification guidance; HeroUI v3 Toast; craft guidance.
- **Reference confidence:** 4
- **Validation/falsification:** Dismiss/timeout tests confirm no essential instruction disappears irrecoverably.

### Component-class summary

| Component class | Contract |
|---|---|
| Buttons/actions | **MUST:** visible purpose from label/context; preserve label during loading; prevent accidental duplicate submission; destructive actions receive proportionate confirmation/reversibility. |
| Text inputs/forms | **MUST:** use label + description/error composition; retain user input on recoverable validation/server failure. |
| Checkbox/radio | **MUST:** use canonical HeroUI/React Aria semantics; entire associated label may enlarge hit area without changing meaning. |
| Select/listbox/menu | **MUST:** use canonical compound behavior; selection state is not communicated by color alone; long option sets receive searchable/filterable alternatives when task evidence requires them. |
| Dialog/sheet/popover | **MUST:** distinguish modal from non-modal behavior; focus and dismissal match the WAI/APG pattern. |
| Tabs/segmented controls | **SHOULD:** only represent peer views of one context; never hide required primary actions or access scope. |
| Cards/list rows | **SHOULD:** group information only when grouping improves scan/comparison; avoid nested interactive controls inside a single “clickable card” hit target. |
| Feedback/toast/inline status | **SHOULD:** choose persistence and placement from severity/recovery needs; status has text/non-color cue. |
| Empty/loading/error | **MUST:** represent distinct causes and offer the appropriate next step rather than a generic blank surface. |

## 6. State model

### REF-028 — State truthfulness
- **Statement — MUST:** Initial/loading, partial/streaming, true empty, denied/unavailable, recoverable failure, destructive failure, optimistic/pending action, success, and stale/retry states are distinguishable whenever the distinction changes user understanding or recovery.
- **Type:** `objective-standard` + `product-invariant`
- **Rationale:** Conflating these states misleads users and can leak or hide access information.
- **Evidence/source class:** sanitized privacy principle; Next.js loading/error model; craft state guidance.
- **Reference confidence:** 5
- **Validation/falsification:** Inject each state at the data boundary and verify a distinct, correct UI/recovery path.

### REF-029 — Error is never empty
- **Statement — MUST:** Backend/query/render failure never appears as a legitimate zero-results or no-content state.
- **Type:** `objective-standard`
- **Rationale:** False emptiness destroys trust and masks recoverable failures.
- **Evidence/source class:** protocol requirement; Next.js explicit expected/unexpected error guidance.
- **Reference confidence:** 5
- **Validation/falsification:** Fault-injection test.

### State presentation contract

| State | Normative behavior |
|---|---|
| Initial/loading | **SHOULD:** preserve shell/context and show task-shaped feedback only when delay is perceptible. |
| Partial/streaming | **SHOULD:** reveal stable independent regions progressively without moving already-interactive controls unpredictably. |
| True empty | **MUST:** state what is empty and offer a meaningful first/next action or filter reset where one exists. |
| Denied/unavailable | **MUST:** communicate inability to access without unnecessary sensitive detail; offer a safe next destination. |
| Recoverable failure | **MUST:** explain what failed in plain language and provide retry/correction while preserving useful user input/state. |
| Destructive failure | **MUST:** make resulting data state explicit and provide escalation/recovery if available. |
| Optimistic/pending | **MUST:** show pending state, prevent contradictory duplicate actions, and reconcile/roll back visibly on failure. |
| Success | **SHOULD:** confirm consequential actions near the changed context; avoid gratuitous confirmation for obvious direct manipulation. |
| Stale/retry | **SHOULD:** preserve usable stale content when safe, label staleness when material, and provide refresh/retry. |

## 7. Accessibility and input model

### REF-030 — WCAG 2.2 AA baseline
- **Statement — MUST:** Production member and governance interfaces meet WCAG 2.2 Level AA for applicable success criteria.
- **Type:** `objective-standard`
- **Rationale:** Current W3C accessibility baseline.
- **Evidence/source class:** W3C Recommendation WCAG 2.2.
- **Reference confidence:** 5
- **Validation/falsification:** Automated checks plus manual keyboard, screen reader, zoom/reflow, contrast, and touch-target tests.

### REF-031 — Contrast and non-color cues
- **Statement — MUST:** Normal text reaches at least 4.5:1 contrast, large-scale text at least 3:1, and essential non-text UI/state indicators at least 3:1 against adjacent colors; status/selection/error meaning is never carried by color alone.
- **Type:** `objective-standard`
- **Rationale:** WCAG 2.2 SC 1.4.3 and 1.4.11.
- **Evidence/source class:** W3C WCAG 2.2.
- **Reference confidence:** 5
- **Validation/falsification:** Token-level and rendered-state contrast audit plus grayscale/non-color review.

### REF-032 — Focus, zoom, motion, locale
- **Statement — MUST:** Keyboard focus remains visible and not entirely obscured; browser zoom is not disabled; interaction remains functional at 200% text resize and WCAG reflow stress; reduced-motion preferences suppress non-essential motion; page/part language and locale-sensitive dates/numbers are programmatically correct.
- **Type:** `objective-standard`
- **Rationale:** Keyboard, resize/reflow, motion, and language requirements affect core operation.
- **Evidence/source class:** WCAG 2.2; Vercel Web Interface Guidelines.
- **Reference confidence:** 5
- **Validation/falsification:** Keyboard focus trace, zoom/reflow, `prefers-reduced-motion`, locale, and screen-reader tests.

## 8. Performance-visible UX

### REF-033 — Server-first boundary
- **Statement — SHOULD:** In Next.js 16.3, layouts/pages and non-interactive data presentation remain Server Components by default; Client Components are introduced at the smallest practical boundary that needs state, event handlers, lifecycle logic, browser APIs, or client-only component behavior.
- **Type:** `implementation-guidance`
- **Rationale:** Current Next.js guidance reduces client JavaScript while retaining interactivity.
- **Evidence/source class:** Next.js 16.3/current App Router maintainer docs.
- **Reference confidence:** 5
- **Validation/falsification:** Bundle/client-boundary inspection and interaction tests.

### REF-034 — Meaningful streaming and stable fallbacks
- **Statement — SHOULD:** Slow independent regions stream behind meaningful Suspense/loading boundaries while stable shell/context remains available; skeleton/fallback geometry approximates final content closely enough to avoid disruptive layout shift.
- **Type:** `implementation-guidance`
- **Rationale:** Next.js streaming improves perceived progress only when boundaries match user-perceived regions.
- **Evidence/source class:** Next.js fetching/streaming docs; Vercel interface guidance.
- **Reference confidence:** 4
- **Validation/falsification:** Throttled-network observation, layout-shift measurement, interruptible navigation test.

### REF-035 — Expected and unexpected errors stay explicit
- **Statement — MUST:** Expected action/data errors are modeled as recoverable UI state; unexpected render failures are caught by an appropriate Next.js error boundary with a usable retry/fallback path.
- **Type:** `implementation-guidance`
- **Rationale:** Current Next.js error model distinguishes expected errors from uncaught exceptions.
- **Evidence/source class:** Next.js 16.3/current error-handling docs.
- **Reference confidence:** 5
- **Validation/falsification:** Fault injection at action, fetch, render, and event-handler layers.

### REF-036 — Performance does not erase state
- **Statement — MUST:** Optimistic updates, prefetching, caching, or streamed navigation never hide scope changes, access changes, failed mutations, or stale data when those states are material.
- **Type:** `product-invariant`
- **Rationale:** Perceived speed cannot override trust/state truth.
- **Evidence/source class:** product invariants + Next.js/Vercel performance guidance.
- **Reference confidence:** 5
- **Validation/falsification:** Offline/slow/failure tests across mutations and scope transitions.

## 9. Design token model

### REF-037 — Semantic token categories
- **Statement — MUST:** The design system defines semantic tokens for surface/background hierarchy, text hierarchy, interactive/accent roles, success/warning/danger/info, borders/dividers, focus, spacing, radii, elevation, typography, and motion.
- **Type:** `implementation-guidance`
- **Rationale:** Semantic tokens let objective states survive palette/theme changes and prevent raw value drift.
- **Evidence/source class:** design-system craft lens; accessibility standards.
- **Reference confidence:** 4
- **Validation/falsification:** Component review finds no meaning encoded only in raw one-off values.

### REF-038 — Semantic role before aesthetic value
- **Statement — MUST:** Status, focus, disabled, selected, and destructive roles are specified semantically before colors or effects are chosen.
- **Type:** `objective-standard` + `design-decision`
- **Rationale:** Accessibility and state semantics are stronger evidence than aesthetic hue preference.
- **Evidence/source class:** WCAG 2.2; craft lens.
- **Reference confidence:** 5
- **Validation/falsification:** Palette can change while interaction/state meaning and contrast remain intact.

### REF-039 — Aesthetic precision is earned
- **Statement — EXPERIMENT:** Exact brand hue, font family, type scale, spacing scale, radii, elevation values, motion durations, content max widths, and responsive thresholds remain candidates for bounded visual/runtime validation unless supported by objective constraints.
- **Type:** `design-decision`
- **Rationale:** The sanitized product truth does not determine these exact values.
- **Evidence/source class:** protocol false-precision rule; craft lens.
- **Reference confidence:** 2
- **Validation/falsification:** Compare candidate systems using readability, density, trust perception, scanability, accessibility, and implementation fit.

### REF-040 — No dependency expansion by reference
- **Statement — MUST:** The reference does not add a component library, state store, icon package, font package, animation package, or other dependency solely because an external example uses it.
- **Type:** `product-invariant` + `implementation-guidance`
- **Rationale:** Dependency expansion is outside the Phase 1 authorization.
- **Evidence/source class:** sanitized pilot/technical constraints.
- **Reference confidence:** 5
- **Validation/falsification:** Dependency diff remains unchanged by Phase 1.

## External evidence set

Verified on 2026-08-21. These sources support the evidence classes above; they do not redefine Bivaque product truth.

1. W3C, **Web Content Accessibility Guidelines (WCAG) 2.2**, Recommendation: https://www.w3.org/TR/WCAG22/
2. W3C WAI-ARIA APG, **Dialog (Modal) Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
3. W3C WAI-ARIA APG, **Tabs Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
4. W3C WAI-ARIA APG, **Listbox Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
5. W3C WAI, **User Notification / Forms Tutorial**: https://www.w3.org/WAI/tutorials/forms/notifications/
6. Vercel, **Web Interface Guidelines** (living guidance): https://vercel.com/design/guidelines
7. Next.js, **Server and Client Components**: https://nextjs.org/docs/app/getting-started/server-and-client-components
8. Next.js, **Fetching Data / Streaming**: https://nextjs.org/docs/app/getting-started/fetching-data
9. Next.js, **Error Handling**: https://nextjs.org/docs/app/getting-started/error-handling
10. Next.js, **Linking and Navigating**: https://nextjs.org/docs/app/getting-started/linking-and-navigating
11. Next.js, **16.3 release stream / current release index**: https://nextjs.org/blog
12. HeroUI v3, **Button**: https://heroui.com/en/docs/react/components/button
13. HeroUI v3, **TextField**: https://heroui.com/en/docs/react/components/text-field
14. HeroUI v3, **Checkbox**: https://heroui.com/en/docs/react/components/checkbox
15. HeroUI v3, **RadioGroup**: https://heroui.com/en/docs/react/components/radio-group
16. HeroUI v3, **Select**: https://heroui.com/docs/react/components/select
17. HeroUI v3, **Modal**: https://heroui.com/en/docs/react/components/modal
18. HeroUI v3, **Tabs**: https://heroui.com/en/docs/react/components/tabs
19. HeroUI v3, **Toast**: https://heroui.com/en/docs/react/components/toast
20. Addy Osmani, `addyosmani/agent-skills`, **frontend-ui-engineering** current upstream: https://github.com/addyosmani/agent-skills/blob/main/skills/frontend-ui-engineering/SKILL.md

## 10. Normative rule table

| Ref ID | Rule | Type | Strength | Confidence | Evidence class | Validation |
|---|---|---|---|---:|---|---|
| REF-001 | Audience visible before consequential commit | product-invariant | MUST | 5 | product truth/privacy | publishing-flow audience test |
| REF-002 | No silent scope widening | product-invariant | MUST | 5 | product truth | scope-transition test |
| REF-003 | Role/verification truth stays distinct | product-invariant | MUST | 5 | product roles | role/access matrix |
| REF-004 | Failure language minimizes sensitive disclosure | product-invariant | MUST | 5 | privacy invariant | unauthorized-access test |
| REF-005 | No implication of official Armed Forces ownership | product-invariant | MUST | 5 | product proposition | brand/copy review |
| REF-006 | Durable knowledge independently recoverable | product-invariant | MUST | 5 | core outcome | seeded-item retrieval |
| REF-007 | Current activity separated from durable purpose | design-decision | SHOULD | 4 | product problem/IA | overview comprehension test |
| REF-008 | Task navigation distinct from membership scope | design-decision | SHOULD | 4 | IA/product scope | mental-model test |
| REF-009 | Locality/community/group additive relation remains legible | product-invariant | MUST | 5 | community model | membership test |
| REF-010 | Active scope inspectable/changeable where material | design-decision | SHOULD | 4 | trust/error prevention | scope-identification test |
| REF-011 | Stable task-level primary navigation; exact count not fixed | design-decision | SHOULD | 3 | craft/product outcomes | navigation-fit test |
| REF-012 | Repeated navigation order/identification consistent | objective-standard | MUST | 5 | WCAG 3.2.3/3.2.4 | route regression |
| REF-013 | Scope/type-aware discovery; material filters deep-linkable | design-decision | SHOULD | 4 | product/Vercel/Next | refresh/back/share |
| REF-014 | List items expose decision-critical metadata | design-decision | SHOULD | 4 | trust/craft | dense scan test |
| REF-015 | Governance surfaces separated from member surfaces | product-invariant | MUST | 5 | product governance | privilege/workspace test |
| REF-016 | Narrow primary-nav pattern selected by bounded experiment | design-decision | EXPERIMENT | 2 | responsive craft | prototype comparison |
| REF-017 | Wide space improves context/scan, not inflation | design-decision | SHOULD | 3 | craft/readability | ultra-wide test |
| REF-018 | WCAG reflow at 320 CSS px equivalent | objective-standard | MUST | 5 | WCAG 1.4.10 | zoom/reflow |
| REF-019 | Responsive transitions are content-driven | design-decision | SHOULD | 4 | craft/WCAG | viewport sweep |
| REF-020 | 24×24 CSS px WCAG target floor; ~44 CSS px touch comfort | objective-standard + guidance | MUST / SHOULD | 5 / 4 | WCAG/Vercel | target audit |
| REF-021 | Reading measure bounded; task surfaces may be wider | design-decision | SHOULD | 3 | craft/WCAG | real-content readability |
| REF-022 | Native semantic element matches action | objective-standard | MUST | 5 | WCAG/APG | accessibility tree |
| REF-023 | Forms have labels, associated help/errors | objective-standard | MUST | 5 | WCAG/HeroUI | form a11y test |
| REF-024 | Canonical HeroUI/React Aria selection behavior preserved | implementation-guidance | MUST | 5 | HeroUI/APG | keyboard matrix |
| REF-025 | Modal focus lifecycle follows APG | objective-standard | MUST | 5 | APG/HeroUI | focus test |
| REF-026 | Tabs stay local or synchronize durable URL state | design-decision | SHOULD | 4 | APG/HeroUI/Vercel | keyboard/deep-link |
| REF-027 | Feedback persistence matches consequence | design-decision | SHOULD | 4 | WAI/HeroUI/craft | timeout/recovery |
| REF-028 | Material UI states are distinguishable | objective-standard + invariant | MUST | 5 | product/Next/craft | state injection |
| REF-029 | Failure never masquerades as empty | objective-standard | MUST | 5 | protocol/Next | fault injection |
| REF-030 | WCAG 2.2 AA baseline | objective-standard | MUST | 5 | W3C | multi-modal a11y audit |
| REF-031 | Text/non-text contrast and non-color cues | objective-standard | MUST | 5 | WCAG 1.4.3/1.4.11 | contrast audit |
| REF-032 | Focus/zoom/motion/locale remain accessible | objective-standard | MUST | 5 | WCAG/Vercel | keyboard/zoom/motion/locale |
| REF-033 | Server-first; narrow Client Component boundaries | implementation-guidance | SHOULD | 5 | Next.js 16.3 | bundle/boundary review |
| REF-034 | Meaningful streaming with stable fallbacks | implementation-guidance | SHOULD | 4 | Next/Vercel | throttled navigation |
| REF-035 | Expected errors explicit; unexpected errors bounded | implementation-guidance | MUST | 5 | Next.js 16.3 | fault injection |
| REF-036 | Performance optimizations never erase trust state | product-invariant | MUST | 5 | product/Next | slow/offline mutation test |
| REF-037 | Semantic token categories defined | implementation-guidance | MUST | 4 | design-system craft | token/component audit |
| REF-038 | Semantic state roles precede aesthetic values | objective-standard + design | MUST | 5 | WCAG/craft | palette substitution |
| REF-039 | Exact aesthetic values require experiment/evidence | design-decision | EXPERIMENT | 2 | protocol/craft | bounded visual comparison |
| REF-040 | Phase 1 adds no dependency by imitation | product-invariant + guidance | MUST | 5 | pilot/technical constraint | dependency diff |

## Freeze declaration

The Phase 1 reference pair (`REFERENCE_DESIGN_SPEC.md` and `REFERENCE_VISUAL_GUIDE.md`) is frozen as of 2026-08-21. `REF-*` IDs above are stable and must not be renumbered after Phase 2 begins.
