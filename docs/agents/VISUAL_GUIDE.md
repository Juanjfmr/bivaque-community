# VISUAL_GUIDE — Bivaque vNext

> **Status: PHASE 6 vNext — visual craft contract derived from the frozen Phase 5.5 adjudication.**
>
> This document defines how Bivaque should *feel and compose*, not route-by-route wireframes. It is subordinate to `DESIGN_SPEC.md` for trust, scope, semantics, accessibility, and state truth.
>
> **“AAA craft” is an internal product-quality term. It does not mean WCAG AAA. The objective accessibility baseline remains WCAG 2.2 Level AA as defined in `DESIGN_SPEC.md`; Bivaque's reduced-motion contract is an additional product requirement.**

## 0. Interpretation: design law vs craft bar

Only statements explicitly labeled **MUST**, **SHOULD**, or **EXPERIMENT** are normative in this document, and each must trace to a Phase 5.5 `KEEP`, `AMEND`, or `RT-ADD-*` authority.

Statements labeled **CRAFT HEURISTIC** are deliberately non-normative. They are quality-review lenses derived from the adjudicated contract. They may be used to withhold an internal “AAA-ready” declaration, but they do not authorize new product behavior, fixed geometry, tokens, routes, component anatomy, or implementation requirements.

External products, screenshots, editorial layouts, relocation/travel products, community products, and other references may establish a **craft floor** or inspire an experiment candidate. They never become normative authority over Bivaque's product model, IA, palette, component anatomy, or brand.

The absence of defects is the floor. Composition, identity, hierarchy, and craft are part of visual acceptance.

---

## 1. Visual character

### VG-001 — Calm, credible, community-operated
**SHOULD:** The product feels calm, capable, practical, local, and trustworthy. Its credibility should not depend on ceremonial authority, tactical styling, prestige signaling, gamification, or official-government/military mimicry.

Trace: `CUR-015 AMEND`; `RT-DEC-001`.

### VG-002 — Recognizable beyond the wordmark
**CRAFT HEURISTIC:** Major surfaces should develop a coherent Bivaque signature through typography, rhythm, composition, imagery use, information hierarchy, and state treatment rather than relying on the logo alone.

This is a craft test, not authorization for an exact font, accent, radius, or layout. Those remain `EXP-004` candidates.

### VG-003 — Trust is informational, not decorative
**MUST:** Verification, role, scope, privacy, warning, and membership meaning is communicated through factual text/semantics and appropriate state treatment, never through prestige badges or decorative military-authority cues.

Trace: `CUR-232 AMEND`; `CUR-233–236 KEEP`; `RT-ADD-007`.

---

## 2. Hierarchy and composition

### VG-004 — Priority before detail
**CRAFT HEURISTIC:** A resolved surface makes its primary purpose, secondary actions/information, and supporting content perceptibly different in weight. Equal visual emphasis across every block is evidence of unresolved hierarchy.

### VG-005 — Compose the page; do not only stack components
**CRAFT HEURISTIC:** Spatial grouping, alignment, measure, contrast, media, and section rhythm should express relationships. A vertical stack of individually acceptable components is not automatically a resolved composition.

### VG-006 — One visual grammar per surface
**CRAFT HEURISTIC:** Repeated patterns on a surface should share alignment logic, spacing rhythm, metadata treatment, icon language, and action hierarchy. Variation should correspond to a real difference in content or consequence.

### VG-007 — Dense does not mean noisy
**CRAFT HEURISTIC:** Density follows the task. Scan/discovery surfaces can be information-rich when alignment and hierarchy remain strong; detail/reading surfaces can be calmer; privileged operational surfaces can be compact without becoming visually indiscriminate.

### VG-008 — Wide space is not a defect
**SHOULD:** Wide layouts use additional space only when it improves context, scanning, comparison, or reading measure. Do not add rails, cards, widgets, or decoration solely to eliminate blank margin.

Trace: `RT-ADD-008`.

---

## 3. Surface strategy

### VG-009 — Surface layers must earn their existence
**CRAFT HEURISTIC:** Backgrounds, bounded groups, cards, nested surfaces, and overlays should be introduced only when they clarify grouping, interaction boundary, modality, privilege, or comparison.

### VG-010 — Cards are not the default unit of thought
**CRAFT HEURISTIC:** For scan-heavy content, consider semantic sections, lists, rows, and aligned regions before bounded cards. Cards are strongest when mixed content, independent action, comparison, media, or containment genuinely benefits from a surface boundary.

`EXP-003` remains open; this heuristic does not choose rows or cards.

### VG-011 — Elevation should represent structure
**CRAFT HEURISTIC:** Strong elevation is most useful for overlays, temporary prominence, or materially distinct layers. Repeated shadowed floating objects without structural purpose usually weaken hierarchy.

Exact radii, borders, shadow values, and elevation tiers remain `EXP-004` candidates.

---

## 4. Typography

### VG-012 — Type hierarchy should explain information hierarchy
**CRAFT HEURISTIC:** Page/region purpose, section headings, item titles, body, metadata, labels/help/errors, and status should remain distinguishable through a coherent typographic system rather than arbitrary size changes.

### VG-013 — Reading and scanning use different measure
**SHOULD:** Long-form reading is bounded to a comfortable measure; lists, comparisons, and operational views may widen when doing so improves scanning without flattening hierarchy.

Trace: `RT-ADD-008`.

### VG-014 — Exact typography is a system experiment
**EXPERIMENT:** Font family, type scale, line-height system, tracking, and exact text-size mapping are evaluated as a coherent system using real Portuguese content, diacritics, long names, numbers, metadata, zoom/text resize, and layout stability.

Trace: `CUR-280 EXPERIMENT`; `EXP-004`; `RT-DEC-002`.

A system/native sans stack is one candidate, not the default winner.

---

## 5. Color and tokens

### VG-015 — Semantic roles precede aesthetic values
**MUST:** Shared color roles originate from semantic meaning — surfaces/backgrounds, text hierarchy, borders/dividers, primary actions, focus, selected, disabled, success, warning, danger, info, and other material states — and use system tokens rather than ad-hoc color invention.

Trace: `CUR-016 AMEND`; `RT-ADD-007`.

### VG-016 — Material state survives without hue
**MUST:** Selected, unread, warning, error, pending, disabled, and similar material states remain understandable without relying on color alone.

Trace: `CUR-224 AMEND`; `RT-ADD-007`.

### VG-017 — Exact palette remains open
**EXPERIMENT:** The incumbent Navy direction is one `EXP-004` candidate. Brand accent, neutrals, surface temperature, state palette, focus treatment, and light/dark-theme strategy are selected only through coherent-system comparison and objective contrast checks.

Trace: `CUR-018 EXPERIMENT`; `EXP-004`.

---

## 6. Imagery and local context

The following are **CRAFT HEURISTICS**, not new product authority:

- Prefer photography/media that contributes locality, orientation, recognition, atmosphere, comparison, or task context.
- Decorative image slots should not be introduced merely to make a page feel premium.
- If an image carries no useful context and its removal improves scanability, remove it.
- Local imagery should feel specific enough to strengthen place recognition rather than interchangeable stock-travel decoration.
- Media absence must not collapse the information hierarchy; the interface remains complete without an image when imagery is optional.

No heuristic here prescribes an asset library, image ratio, hero pattern, or mandatory photography.

---

## 7. Navigation, scope, and responsive composition

### VG-018 — Navigation and scope must look like different concepts
**MUST:** Global task navigation and active membership scope are visually distinguishable. A person should not need to infer scope solely from whichever destination appears selected.

Trace: `CUR-301 AMEND`; `RT-ADD-003`.

### VG-019 — Current scope uses real product state
**MUST:** Visible locality/community/group context is derived from current authorized membership state and remains consistent with the content/action audience. Pilot literals are not durable UI treatment.

Trace: `RT-ADD-003`; Phase 4 `RUN-005/016`.

### VG-020 — Responsive design recomposes instead of squeezing
**SHOULD:** Narrow, medium, and wide layouts may change grouping, disclosure, persistent context, and navigation presentation when task fit improves. Mobile is not desktop compressed; desktop is not mobile stretched.

Trace: `RT-ADD-008`; `CUR-477 AMEND`.

### VG-021 — Wide screens earn additional structure
**SHOULD:** Additional columns, rails, or parallel regions appear only when they create useful simultaneous context, comparison, or faster scanning while preserving readable measure.

Trace: `RT-ADD-008`.

Exact breakpoint thresholds and bottom-nav/rail/sidebar geometry remain `EXP-001`.

---

## 8. States and interaction craft

### VG-022 — State presentation remains truthful
**MUST:** Loading, true empty, denied/unavailable, recoverable failure, pending/optimistic, success, and stale/retry presentations preserve the semantic distinction and recovery path defined by the design contract. Error and empty are never interchangeable visual placeholders.

Trace: `CUR-466 AMEND`; `RT-ADD-006`; `RT-ADD-010`.

**CRAFT HEURISTIC:** Non-happy-path states should receive the same compositional care as populated screens; a polished happy path does not compensate for crude or visually unrelated state paths.

### VG-023 — Pending feedback preserves action meaning
**SHOULD:** Pending actions visibly retain their purpose, prevent harmful duplicate activation, and avoid needless layout jumps. A spinner is feedback, not a replacement for the meaning of the action.

Trace: `CUR-081–082 AMEND`; `RT-ADD-006/010`.

### VG-024 — Motion should explain change
**CRAFT HEURISTIC:** Motion is most useful when it supports continuity, disclosure, selection, optimistic progress, or spatial understanding. Decorative movement that competes with content usually weakens the system.

### VG-025 — Reduced motion preserves comprehension
**MUST:** Reduced-motion mode removes or materially reduces non-essential travel/transform animation while retaining clear state feedback.

Trace: `CUR-075 AMEND`.

This requirement is intentionally stronger than the WCAG 2.2 AA baseline; WCAG 2.2 SC 2.3.3 “Animation from Interactions” is Level AAA. Exact durations, easing curves, spring values, hover lifts, card-entry animations, and transition distances remain `EXP-004` implementation candidates.

---

## 9. Surface archetypes — composition guidance, not frozen wireframes

These are **CRAFT HEURISTICS** explaining intended visual logic. They do not prescribe exact routes, card anatomy, pixel dimensions, or navigation placement.

### Member overview / community activity

Target experience:
- active scope and current purpose are immediately legible;
- current activity and durable/recoverable knowledge are not visually collapsed into one undifferentiated stream;
- content has a dominant scan path;
- contribution entry is discoverable without permanently consuming excessive viewport space;
- secondary context earns its place rather than filling desktop emptiness.

Relevant authority: `RT-ADD-002/003/008/009`; `EXP-002/006` remain open.

### Discovery / recommendations / groups

Target experience:
- query/filter/scope remains visible when it matters;
- items expose decision-critical metadata before opening;
- rows/cards/hybrid are chosen for scanability and comparison, not because “the design system uses cards”;
- privacy/membership/trust states are legible without relying on one icon or color.

Relevant authority: `RT-ADD-009`; `CUR-178 AMEND`; `CUR-207 KEEP`; `EXP-003/008/010`.

### Event/local information

Target experience:
- time, scope, status, and location consequence are easy to scan;
- private location never appears as ordinary metadata before authorization;
- chronology/grouping and RSVP affordance are selected through `EXP-007` rather than inherited wireframe anatomy.

Relevant authority: `CUR-191–192 KEEP`; `CUR-316 AMEND`; `EXP-007`.

### Admission / verification

Target experience:
- the admission task is visually primary;
- privacy and verification context appears at the decision point rather than as ornamental legal copy;
- pending/failure/success remains understandable without spinner-only or prestige treatment;
- exact step grouping remains `EXP-005`.

Relevant authority: `CUR-124/131/138/140/459 AMEND`; `CUR-137 KEEP`; `EXP-005`.

### Governance / privileged work

Target experience:
- privilege context is unmistakable without looking militarized or official;
- density may increase for operational work, but consequence, selection, error, and destructive actions remain explicit;
- member and privileged navigation are not visually conflated.

Relevant authority: `CUR-182 AMEND`; `CUR-336–337 KEEP`; `RT-ADD-007/009`.

---

## 10. Anti-pattern indicators

These are **diagnostic CRAFT HEURISTICS**, not independent rules. When they appear without task/product justification, they usually indicate failure of hierarchy, composition, density, semantic-token, state-truth, or responsive intent:

- every section becoming a rounded card;
- a dashboard mosaic of equal-weight tiles for unrelated priorities;
- pills used as the default shape for every action/filter/status;
- shadows/elevation on every repeated list item;
- decorative gradients/glass effects competing with information hierarchy;
- generic camouflage, rank, insignia, seal, or official-document styling used to signal trust;
- desktop created by merely increasing widths/gaps around the mobile layout;
- mobile created by hiding desktop content without rethinking priority;
- hero imagery that consumes attention without adding place/task context;
- right rails or widgets added only to occupy empty space;
- truncation that hides scope, status, trust, or distinguishing metadata;
- color-only state;
- ARIA roles whose expected keyboard contract is not implemented;
- beautiful empty/error states that misrepresent the underlying data state.

No indicator authorizes a specific replacement pattern. Fix the violated upstream rule or experiment question instead of creating another micro-prescription.

---

## 11. Internal AAA-readiness review

This is a craft acceptance review, not an accessibility-conformance level and not a substitute audit harness. Failing it may block the internal label **AAA-ready** without turning each row into a new normative product rule.

A material surface is not AAA-ready merely because it renders, works, uses tokens, and has no obvious layout bug. Reviewers should be able to defend the following from the rendered product:

| Dimension | Evidence of readiness |
|---|---|
| **Hierarchy** | Primary purpose, secondary actions, and supporting information have visibly different priority. |
| **Composition** | Regions relate through alignment, grouping, measure, and rhythm rather than looking like an arbitrary component stack. |
| **Density** | Information amount matches the task and remains scannable under sparse and dense content. |
| **Bivaque character** | The surface feels calm, local, practical, community-operated, and coherent with other Bivaque surfaces without relying solely on the logo. |
| **Content credibility** | Realistic Portuguese names, long text, missing media, counts, dates, metadata, and edge cases do not collapse hierarchy. |
| **Responsive composition** | Narrow and wide layouts each feel intentionally composed; neither is a squeezed or inflated copy of the other. |
| **State craft** | Loading/empty/error/pending/success/stale states feel like the same product and remain truthful. |
| **Interaction craft** | Focus, hover/pressed/selected/pending/disclosure behavior is clear, restrained, and proportionate to consequence. |
| **Accessibility** | Applicable WCAG 2.2 AA semantics, contrast/non-color cues, focus, keyboard, text resize and reflow remain intact; the separate `DS-025` reduced-motion contract also holds. |
| **Polish** | Alignment, wrapping, optical balance, icons, imagery, metadata, and boundaries survive close inspection without arbitrary drift. |

If hierarchy, composition, density, or product character is materially weak, the internal visual design remains unresolved; calling the gap “polish for later” does not satisfy the AAA-readiness review.

The executable audit/harness must prove whichever objective/runtime properties it claims. A screenshot alone cannot prove keyboard, focus lifecycle, semantics, authorization, or state truth.

---

## 12. Open visual/design experiments

No candidate below is the selected final design merely because it exists in the incumbent UI.

| Experiment | Visual question |
|---|---|
| `EXP-001` | Task navigation + scope presentation across narrow/medium/wide layouts. |
| `EXP-002` | Composer modal vs inline vs adaptive disclosure. |
| `EXP-003` | Group rows vs cards vs hybrid under realistic content density. |
| `EXP-004` | Coherent visual system: palette, typography, spacing, radii, elevation, motion, content measure. |
| `EXP-005` | Admission grouping and visual progression. |
| `EXP-006` | Activity sorting controls and information hierarchy. |
| `EXP-007` | Event chronology/grouping and RSVP presentation. |
| `EXP-008` | Recommendation category discovery pattern. |
| `EXP-009` | Profile sections and navigation/state treatment. |
| `EXP-010` | Group-discovery IA presentation. |
| `EXP-011` | Notification grouping model. |

### EXP-004 quality requirement

`EXP-004` must compare **2–3 coherent visual directions**, not isolated token knobs. Each candidate should be applied to the same representative content/states so the comparison evaluates the system rather than simultaneous content/layout changes.

The candidate set should demonstrate materially different interpretations of Bivaque while satisfying the same trust/accessibility/product contract. Candidate dimensions may vary together — for example type personality, surface strategy, accent family, imagery treatment, density rhythm, radius/elevation restraint, and motion character.

A winning candidate must be defensible on readability, scanability, trust perception, distinctiveness, content resilience, responsive composition, accessibility, and implementation/dependency cost — not model preference or novelty alone.

---

## 13. Traceability boundary

The following old prescriptions remain deleted as visual law unless a future experiment/adjudication explicitly selects them:

- exact Navy token values;
- fixed system font stack as winner;
- exact type scale, gaps, radii, shadow levels, breakpoints, rail widths, content widths, animation durations/distances;
- universal pills, card grids, right rails, sticky headers, skeleton counts, clamp counts, comment-preview counts;
- exact route wireframes;
- four navigation containers as settled ontology;
- mobile-bottom/desktop-sidebar as settled final pattern;
- modal composer as settled winner;
- group rows or group cards as settled winner;
- event date grouping/RSVP model as settled winner;
- notification time buckets as settled winner.

Implementation may temporarily use such values as candidate choices. Their presence in code does not promote them back into this visual contract.