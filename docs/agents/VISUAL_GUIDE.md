# VISUAL_GUIDE — Bivaque vNext

> **Status: PHASE 6 vNext — visual craft contract derived from the frozen Phase 5.5 adjudication.**
>
> This document defines how Bivaque should *feel and compose*, not route-by-route wireframes. It is subordinate to `DESIGN_SPEC.md` for trust, scope, semantics, accessibility, and state truth.
>
> **“AAA craft” in this document is an internal product-quality term. It does not mean WCAG AAA. The objective accessibility baseline remains WCAG 2.2 Level AA as defined in `DESIGN_SPEC.md`.**

## 0. What “production-grade / AAA craft” means here

Bivaque is not visually complete merely because the feature works, uses tokens, passes basic accessibility checks, and has no obvious layout bug.

The quality target is a product that feels deliberate at first glance and remains coherent under real use: clear hierarchy, composed pages, disciplined density, distinctive identity, credible content, strong responsive adaptation, truthful states, and precise interaction craft.

External products, screenshots, editorial layouts, travel/relocation products, community products, and design references may establish a **craft floor** or inspire a candidate. They never become normative authority over Bivaque's product model, IA, palette, component anatomy, or brand. Copying a polished reference is not the objective; matching or exceeding its execution quality while remaining recognizably Bivaque is.

The absence of defects is the floor. Composition, identity, hierarchy, and craft are part of visual acceptance.

---

## 1. Visual character

### VG-001 — Calm, credible, community-operated
**SHOULD:** The product feels calm, capable, practical, local, and trustworthy. It avoids visual language whose credibility depends on ceremonial authority, tactical styling, prestige signaling, gamification, or official-government/military mimicry.

Trace: `CUR-015 AMEND`; `RT-DEC-001`.

### VG-002 — Identity should survive removal of the logo
**SHOULD:** Major Bivaque surfaces should develop a coherent visual signature through typography, rhythm, composition, imagery use, information hierarchy, and state treatment rather than relying on the wordmark alone for recognizability.

Trace: visual projection of `CUR-015 AMEND`; `RT-DEC-002`.

This does **not** prescribe an exact font, accent, radius, or layout. Those remain EXP-004 candidates.

### VG-003 — Trust is informational, not decorative
**MUST:** Verification, role, scope, privacy, warning, and membership meaning is communicated through factual text/semantics and appropriate state treatment, never through prestige badges or decorative military authority cues.

Trace: `CUR-232 AMEND`; `CUR-233–236 KEEP`; `RT-ADD-007`.

---

## 2. Hierarchy and composition

### VG-004 — Priority is perceptible before detailed reading
**SHOULD:** Each material surface establishes a clear primary purpose, secondary actions/information, and supporting content. Equal visual weight across every block is a composition failure.

Trace: `RT-DEC-005`; `RT-ADD-009`.

### VG-005 — Pages are composed, not merely stacked
**SHOULD:** A page uses spatial grouping, alignment, measure, contrast, media, and section rhythm to express relationships. A vertical stack of individually acceptable components is not automatically a resolved composition.

Trace: `RT-DEC-002`; `RT-DEC-005`; `RT-ADD-008`.

### VG-006 — One visual grammar per surface
**SHOULD:** Repeated patterns on the same surface share alignment, spacing logic, metadata treatment, icon language, and action hierarchy. Variation must represent a real difference in content or consequence rather than decoration.

Trace: `CUR-016 AMEND`; `RT-DEC-003`; `RT-DEC-009`.

### VG-007 — Dense does not mean noisy
**SHOULD:** Density follows the task. Scan/discovery surfaces can be information-rich when alignment and hierarchy stay strong; detail/reading surfaces use calmer measure and spacing; privileged operational surfaces may be compact without becoming visually indiscriminate.

Trace: `RT-ADD-008`; `RT-ADD-009`.

### VG-008 — Empty space is allowed
**SHOULD:** Wide layouts use space to improve context, scanning, comparison, or reading measure. Do not add rails, cards, widgets, or decoration solely to eliminate blank margin.

Trace: `RT-ADD-008`; deletion of incumbent “fill the empty space” geometry under `RT-DEC-005/007`.

---

## 3. Surface strategy

### VG-009 — Use the fewest surface layers that clarify structure
**SHOULD:** Background, primary content surface, bounded grouped content, and overlays should be introduced only when each layer improves grouping, interaction boundary, or privilege/modality understanding.

Trace: visual projection of `RT-DEC-002/005`.

### VG-010 — Cards are not the default unit of thought
**SHOULD:** Prefer semantic sections, lists, rows, and aligned regions for scan-heavy content. Use a card when an item genuinely needs a bounded surface because of mixed content, independent action, comparison, media, or containment.

Trace: `RT-DEC-005`; `RT-ADD-009`; `EXP-003` remains open.

### VG-011 — Elevation indicates containment or temporary prominence
**SHOULD:** Strong elevation is reserved for overlays, temporary focus, or materially distinct layers. Repeating shadowed floating objects across a feed/list without a structural reason weakens hierarchy.

Trace: `RT-DEC-002`; `EXP-004`.

Exact radii, borders, shadow values, and elevation tiers remain EXP-004 candidates.

---

## 4. Typography

### VG-012 — Typography is semantic before stylistic
**MUST:** Visual type hierarchy reflects actual information hierarchy: page/region purpose, section heading, item title, body, metadata, label/help/error, and status remain distinguishable without depending on one exact size scale.

Trace: `RT-ADD-007`; `RT-DEC-002/007`.

### VG-013 — Reading and scanning use different measure
**SHOULD:** Long-form reading is bounded to a comfortable measure; lists, comparisons, and operational views may widen when doing so improves scanning without flattening hierarchy.

Trace: `RT-ADD-008`.

### VG-014 — Exact typography is a system experiment
**EXPERIMENT:** Font family, type scale, line-height system, tracking, and exact text-size mapping are evaluated as a coherent system using real Portuguese content, diacritics, long names, numbers, metadata, zoom/text resize, and layout stability.

Trace: `CUR-280 EXPERIMENT`; `EXP-004`; `RT-DEC-002`.

A system/native sans stack is one candidate, not the default winner.

---

## 5. Color and tokens

### VG-015 — Semantic roles precede color choices
**MUST:** Color decisions originate from semantic roles: surface/background, text hierarchy, border/divider, primary action, focus, selected, disabled, success, warning, danger, info, and other material states. Shared semantic roles use system tokens rather than ad-hoc color invention.

Trace: `CUR-016 AMEND`; `RT-ADD-007`.

### VG-016 — Status and selection survive without color
**MUST:** Selected, unread, warning, error, pending, disabled, and similar material states remain understandable when hue is removed or unavailable.

Trace: `CUR-224 AMEND`; `RT-ADD-007`.

### VG-017 — Exact palette remains open
**EXPERIMENT:** The incumbent Navy direction is one EXP-004 candidate. Brand accent, neutrals, surface temperature, state palette, focus treatment, and light/dark theme strategy are selected only through coherent-system comparison and objective contrast checks.

Trace: `CUR-018 EXPERIMENT`; `EXP-004`.

---

## 6. Imagery and local context

Imagery guidance in this section is **craft guidance, not new product authority**.

- Prefer photography/media that contributes locality, orientation, recognition, atmosphere, comparison, or task context.
- Decorative image slots should not be introduced merely to make a page feel premium.
- If an image carries no useful context and its removal improves scanability, remove it.
- Local imagery should feel specific enough to strengthen place recognition rather than interchangeable stock-travel decoration.
- Media absence must not collapse the information hierarchy; the interface remains complete without an image when imagery is optional.

These heuristics implement the hierarchy/density intent of `RT-DEC-005`, `RT-ADD-008`, and `RT-ADD-009`; they do not prescribe an asset library or image ratio.

---

## 7. Navigation, scope, and responsive composition

### VG-018 — Navigation and scope must look like different concepts
**MUST:** Global task navigation and active membership scope are visually distinguishable. The user should not need to infer scope solely from whichever destination appears selected.

Trace: `CUR-301 AMEND`; `RT-ADD-003`.

### VG-019 — Current scope uses real product state
**MUST:** Visible locality/community/group context is derived from current authorized membership state and is consistent with the content/action audience. Pilot literals are not durable UI treatment.

Trace: `RT-ADD-003`; Phase 4 `RUN-005/016`.

### VG-020 — Responsive design recomposes instead of squeezing
**SHOULD:** Narrow, medium, and wide layouts may change grouping, disclosure, persistent context, and navigation presentation when task fit improves. Mobile is not desktop compressed; desktop is not mobile stretched.

Trace: `RT-ADD-008`; `CUR-477 AMEND`.

### VG-021 — Wide screens earn additional structure
**SHOULD:** Additional columns, rails, or parallel regions appear only when they create useful simultaneous context, comparison, or faster scanning. Reading measure remains controlled.

Trace: `RT-ADD-008`.

Exact breakpoint thresholds and bottom-nav/rail/sidebar geometry remain `EXP-001`.

---

## 8. States and interaction craft

### VG-022 — Happy path and state paths receive equal visual care
**MUST:** Loading, true empty, denied/unavailable, recoverable failure, pending/optimistic, success, and stale/retry states preserve the same hierarchy and product character as populated screens. Error/empty are never interchangeable visual placeholders.

Trace: `CUR-466 AMEND`; `RT-ADD-006`; `RT-ADD-010`.

### VG-023 — Pending feedback preserves action meaning
**SHOULD:** Pending actions visibly retain their purpose, prevent harmful duplicate activation, and avoid needless layout jumps. A spinner is a feedback mechanism, not a replacement for the meaning of the action.

Trace: `CUR-081–082 AMEND`; `RT-ADD-006/010`.

### VG-024 — Motion explains change; it does not decorate routine use
**SHOULD:** Motion supports continuity, disclosure, selection, optimistic progress, or spatial understanding when static feedback would be weaker. Decorative movement that competes with content is removed.

Trace: `CUR-075 AMEND`; `CUR-076 KEEP`; `RT-DEC-003`.

### VG-025 — Reduced motion preserves comprehension
**MUST:** Reduced-motion mode removes or materially reduces non-essential travel/transform animation while retaining clear state feedback.

Trace: `CUR-075 AMEND`; `RT-ADD-007`.

Exact durations, easing curves, spring values, hover lifts, card-entry animations, and transition distances are EXP-004 implementation candidates, not design law.

---

## 9. Surface archetypes — composition guidance, not frozen wireframes

These archetypes explain the intended visual logic. They do not prescribe exact routes, card anatomy, pixel dimensions, or navigation placement.

### Member overview / community activity

Target experience:
- active scope and current purpose are immediately legible;
- current activity and durable/recoverable knowledge are not visually collapsed into one undifferentiated stream;
- content has a dominant scan path;
- contribution entry is visible without permanently consuming excessive viewport space;
- secondary context earns its place rather than filling desktop emptiness.

Trace: `RT-ADD-002/003/008/009`; `EXP-002/006` remain open.

### Discovery / recommendations / groups

Target experience:
- query/filter/scope remains visible when it matters;
- items expose decision-critical metadata before opening;
- rows/cards/hybrid are chosen for scanability and comparison, not because “the design system uses cards”;
- privacy/membership/trust states are legible without relying on a single icon or color.

Trace: `RT-ADD-009`; `CUR-178 AMEND`; `CUR-207 KEEP`; `EXP-003/008/010`.

### Event/local information

Target experience:
- time, scope, status, and location consequence are easy to scan;
- private location never appears as ordinary metadata before authorization;
- chronology/grouping and RSVP affordance are selected through EXP-007 rather than inherited wireframe anatomy.

Trace: `CUR-191–192 KEEP`; `CUR-316 AMEND`; `EXP-007`.

### Admission / verification

Target experience:
- the admission task is visually primary;
- privacy and verification context appears at the decision point rather than as ornamental legal copy;
- pending/failure/success remains understandable without spinner-only or prestige treatment;
- exact step grouping remains EXP-005.

Trace: `CUR-124/131/138/140/459 AMEND`; `CUR-137 KEEP`; `EXP-005`.

### Governance / privileged work

Target experience:
- privilege context is unmistakable without looking militarized or official;
- density may increase for operational work, but consequence, selection, error, and destructive actions remain explicit;
- member and privileged navigation are not visually conflated.

Trace: `CUR-182 AMEND`; `CUR-336–337 KEEP`; `RT-ADD-007/009`.

---

## 10. Anti-pattern indicators

The following are **diagnostic indicators**, not independent new rules. When they appear without task/product justification, they usually indicate failure of the hierarchy, composition, density, semantic-token, or responsive rules above:

- every section becoming a rounded card;
- a dashboard mosaic of equal-weight tiles for unrelated priorities;
- pills used as the default shape for every action/filter/status;
- shadows/elevation on every repeated list item;
- decorative gradients/glass effects competing with information hierarchy;
- generic military camouflage, rank, insignia, seal, or official-document styling used to signal trust;
- desktop created by merely increasing widths/gaps around the mobile layout;
- mobile created by hiding desktop content without rethinking priority;
- hero imagery that consumes attention without adding place/task context;
- right rails or widgets added only to occupy empty space;
- truncation that hides scope, status, trust, or distinguishing metadata;
- color-only state;
- ARIA roles whose expected keyboard contract is not implemented;
- beautiful empty/error states that misrepresent the underlying data state.

No item above authorizes a specific replacement pattern. Fix the violated upstream rule instead of introducing another micro-prescription.

---

## 11. Definition of visually ready

This is an interpretation of the rules above, not a substitute audit harness.

A material surface is not visually ready merely because it renders and is functionally complete. Before declaring the design resolved, reviewers should be able to defend all of the following from the rendered product:

| Dimension | Evidence of readiness |
|---|---|
| **Hierarchy** | Primary purpose, secondary actions, and supporting information have visibly different priority. |
| **Composition** | Regions relate through alignment, grouping, measure, and rhythm rather than looking like an arbitrary component stack. |
| **Density** | The amount of information matches the task and remains scannable under sparse and dense content. |
| **Bivaque character** | The surface feels calm, local, practical, community-operated, and coherent with other Bivaque surfaces without relying solely on the logo. |
| **Content credibility** | Realistic Portuguese names, long text, missing media, counts, dates, metadata, and edge cases do not collapse the intended hierarchy. |
| **Responsive composition** | Narrow and wide layouts each feel intentionally composed; neither is a squeezed or inflated copy of the other. |
| **State craft** | Loading/empty/error/pending/success/stale states feel designed as part of the same product and remain truthful. |
| **Interaction craft** | Focus, hover/pressed/selected/pending/disclosure behavior is clear, restrained, and consistent with consequence. |
| **Accessibility** | WCAG 2.2 AA semantics, contrast/non-color cues, focus, keyboard, reflow, zoom/text resize, and reduced motion remain intact. |
| **Polish** | Alignment, wrapping, optical balance, icons, imagery, metadata, and boundaries survive close inspection without arbitrary drift. |

If hierarchy, composition, density, or product character is materially weak, that is not “polish for later”; the visual design is still unresolved.

The executable audit/harness must prove whichever objective/runtime properties it claims. This document does not claim that a screenshot or script has enforced these qualities.

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

EXP-004 must compare **2–3 coherent visual directions**, not isolated token knobs. Each candidate should be applied to the same representative content/states so the comparison is about the system rather than changing layout and content simultaneously.

The candidate set should demonstrate materially different interpretations of Bivaque while all satisfying the same trust/accessibility/product contract. Examples of dimensions that may vary together include type personality, surface strategy, accent family, imagery treatment, density rhythm, radius/elevation restraint, and motion character.

A winning candidate must be defensible on readability, scanability, trust perception, distinctiveness, content resilience, responsive composition, accessibility, and implementation/dependency cost — not model preference or novelty alone.

---

## 13. Traceability boundary

The following old prescriptions remain deleted as visual law unless a future experiment/adjudication explicitly selects them:

- exact Navy token values;
- fixed system font stack as winner;
- exact type scale, gaps, radii, shadow levels, breakpoints, rail widths, content widths, animation durations/distances;
- universal pills, card grids, right rails, sticky headers, skeleton counts, clamp counts, comment preview counts;
- exact route wireframes;
- four navigation containers as settled ontology;
- mobile-bottom/desktop-sidebar as settled final pattern;
- modal composer as settled winner;
- group rows or group cards as settled winner;
- event date grouping/RSVP model as settled winner;
- notification time buckets as settled winner.

Implementation may temporarily use such values as candidate choices. Their presence in code does not promote them back into this visual contract.
