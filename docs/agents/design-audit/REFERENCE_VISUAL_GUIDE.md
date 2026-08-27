# REFERENCE_VISUAL_GUIDE — independent benchmark

> **Status: PHASE 1 FROZEN.**
>
> This guide translates the frozen blind reference in `REFERENCE_DESIGN_SPEC.md` into surface-level visual and interaction guidance. It uses only Phase 1-safe product/stack inputs and external evidence.
>
> **Normative interpretation:** only statements explicitly labeled `MUST`, `SHOULD`, `MAY`, or `EXPERIMENT` are normative. Unlabeled prose is rationale, context, or evidence description.

## 1. Visual system direction

### RVIS-001 — Product character
- **Visual/interaction rule — SHOULD:** The product character is calm, trustworthy, local, practical, and community-operated rather than ceremonial, tactical, gamified, or institutionally authoritative.
- **Strength:** SHOULD
- **Confidence:** 4
- **Rationale:** Bivaque carries real access/privacy consequences but exists to reduce noise and make community knowledge useful.
- **Validation:** Blind brand review with representative users: “community network” and “trustworthy/local” register more strongly than “official military portal” or “consumer social game”.

### RVIS-002 — Non-official visual identity
- **Visual/interaction rule — MUST:** Brand expression avoids official seals, rank/insignia mimicry, camouflage-as-authority, official-document styling, or other cues that could reasonably imply Armed Forces ownership or endorsement.
- **Strength:** MUST
- **Confidence:** 5
- **Rationale:** Direct product invariant (`REF-005`).
- **Validation:** Brand/legal-style review against pre-auth, authenticated, and governance surfaces.

### RVIS-003 — Density follows task
- **Visual/interaction rule — SHOULD:** Member overview and discovery use moderate information density optimized for scan; reading/detail views use calmer spacing; governance surfaces use compact but legible operational density.
- **Strength:** SHOULD
- **Confidence:** 4
- **Rationale:** The product must reduce noise without hiding useful context; one universal density wastes space or harms scanability.
- **Validation:** Dense/sparse content stress tests and task completion time.

### RVIS-004 — Typography is semantic before stylistic
- **Visual/interaction rule — MUST:** Typography exposes semantic hierarchy (page title, section heading, item title, body, metadata, label/helper/error, status) without relying only on size, color, or weight.
- **Strength:** MUST
- **Confidence:** 5
- **Rationale:** Supports headings/labels, scanability, reflow, and non-color understanding.
- **Validation:** Grayscale and 200% text-resize review plus semantic heading audit.

### RVIS-005 — Exact font choice
- **Visual/interaction rule — EXPERIMENT:** The exact font family remains unresolved; candidate families must support Portuguese diacritics, clear UI numerals, readable body copy, good small-size rendering, and implementation without an unnecessary new dependency.
- **Strength:** EXPERIMENT
- **Confidence:** 2
- **Rationale:** Sanitized product truth does not determine a typeface.
- **Validation:** Compare a system sans/native stack with one technically available humanist/neutral sans candidate using real Bivaque-length Portuguese content; evaluate readability, identity, payload, and layout stability.

### RVIS-006 — Color system
- **Visual/interaction rule — MUST:** Color tokens are semantic first: background/surface/text/border/focus/action plus success/warning/danger/info and selected/disabled roles; required contrast follows `REF-031`.
- **Strength:** MUST
- **Confidence:** 5
- **Rationale:** Objective state meaning is stronger than brand hue preference.
- **Validation:** Token contrast audit, grayscale check, and palette substitution test.

### RVIS-007 — Brand accent hue
- **Visual/interaction rule — EXPERIMENT:** The primary accent hue remains open; candidates must feel community-trustworthy, stay distinct from danger/warning semantics, work on light surfaces, and avoid official-institutional mimicry.
- **Strength:** EXPERIMENT
- **Confidence:** 2
- **Rationale:** No exact hue is implied by Phase 1 product truth.
- **Validation:** Small palette comparison in member overview, form focus, selected state, and governance actions; contrast and perception checks.

### RVIS-008 — Surface hierarchy
- **Visual/interaction rule — SHOULD:** Use the fewest surface layers needed to communicate grouping: page background → primary content surface when needed → overlay/elevated surface for temporary or privileged context.
- **Strength:** SHOULD
- **Confidence:** 4
- **Rationale:** Excessive cards/shadows fragment scan paths and recreate generic dashboard aesthetics.
- **Validation:** Remove one surface layer at a time; retain only layers whose removal reduces comprehension or target separation.

### RVIS-009 — Spacing/radius/elevation precision
- **Visual/interaction rule — EXPERIMENT:** Exact spacing increments, corner radii, shadows, and elevation depths remain un-fixed; choose a small consistent scale and reserve stronger elevation for overlays/temporary layers rather than making every item a floating card.
- **Strength:** EXPERIMENT
- **Confidence:** 2
- **Rationale:** These are aesthetic/system choices without objective Phase 1 values.
- **Validation:** Candidate token comparison on list, form, detail, and modal surfaces; reject arbitrary one-off values.

### RVIS-010 — Iconography and imagery
- **Visual/interaction rule — SHOULD:** Icons are simple, consistent, secondary to text for important actions/status, and never substitute for scope/audience labels; imagery is task-relevant rather than decorative filler.
- **Strength:** SHOULD
- **Confidence:** 4
- **Rationale:** Vercel/WCAG craft guidance and product trust requirements favor clear labels and low visual noise.
- **Validation:** Icon-hidden and screen-reader tests; review whether any meaning disappears without decorative imagery.

### RVIS-011 — Motion
- **Visual/interaction rule — SHOULD:** Motion communicates spatial/state change only when it improves comprehension; transitions are short and interruptible, and non-essential motion is removed under reduced-motion preference.
- **Strength:** SHOULD
- **Confidence:** 4
- **Rationale:** Motion is feedback, not decoration.
- **Validation:** `prefers-reduced-motion` test plus interruption/keyboard navigation test.

## 2. Global shell

### Pre-auth shell

**RVIS-012 — MUST:** The pre-auth shell presents product identity, community-operated/non-official clarification, access/admission task, privacy-relevant explanation, and help/recovery without exposing authenticated community content.  
Confidence: 5 · Links: `REF-004`, `REF-005` · Validation: signed-out privacy and task-completion test.

**RVIS-013 — SHOULD:** Pre-auth visual density stays low enough to keep the admission task primary; marketing-style feature grids, testimonial clutter, or decorative military imagery are omitted unless independently justified.  
Confidence: 4 · Validation: first-action comprehension test.

### Authenticated member shell

**RVIS-014 — MUST:** The member shell keeps global task navigation and current membership scope visually distinct; a user can inspect both without opening hidden help.  
Confidence: 5 · Links: `REF-008`, `REF-010` · Validation: “what task / what scope?” five-second comprehension test.

**RVIS-015 — SHOULD:** The shell keeps shared navigation/context stable while route content streams or refreshes, preventing navigation layout shift and loss of orientation.  
Confidence: 4 · Links: `REF-034` · Validation: throttled navigation and CLS observation.

**RVIS-016 — EXPERIMENT:** On narrow screens, compare a compact persistent primary-navigation pattern against a menu-first pattern. A persistent bottom treatment is eligible only when labels/targets fit without truncation, overflow, scope confusion, or crowding; no fixed destination count is prescribed.  
Confidence: 2 · Links: `REF-016` · Validation: narrow-device prototype comparison.

**RVIS-017 — SHOULD:** On wide screens, primary navigation remains persistently available without forcing reading content to span the viewport; exact rail-versus-header placement follows content-fit testing.  
Confidence: 3 · Links: `REF-017`, `REF-019` · Validation: laptop and ultra-wide scan test.

### Operator/admin shell

**RVIS-018 — MUST:** Governance tasks open in a visibly distinct workspace context with explicit privileged-role indication and a clear path back to member context when the account also has member access.  
Confidence: 5 · Links: `REF-015` · Validation: privilege-context test; users never mistake a governance action for a member action.

### Header/global actions

**RVIS-019 — SHOULD:** Global actions are limited to cross-route utilities (for example scope inspection, search entry, account/help); route-local actions stay near route content.  
Confidence: 3 · Rationale: reduces shell noise and improves action locality · Validation: action-location usability test.

### Content width and reflow

**RVIS-020 — MUST:** All shell/content layouts satisfy `REF-018` reflow and `REF-020` target requirements.  
Confidence: 5 · Validation: 320 CSS px equivalent, 400% zoom, and target-size audit.

**RVIS-021 — SHOULD:** Long reading copy uses a bounded measure; scan-oriented lists/grids may occupy more width while preserving a clear primary column and stable metadata alignment. Exact max widths remain `EXPERIMENT`.  
Confidence: 3 · Links: `REF-021` · Validation: reading/scan comparison using realistic long titles, diacritics, and multi-line metadata.

## 3. Surface-by-surface guide

The following contracts are organized around product concepts and journeys, not incumbent routes. Unless a field has a stronger label, the structure line is **SHOULD**.

### 3.1 Controlled access / admission

| Field | Reference guidance |
|---|---|
| Surface / route concept | **SHOULD:** A focused access/admission surface with role-appropriate branching, not a generic social sign-up funnel. |
| User success criterion | **MUST:** The person understands which path applies, what happens next, and whether the result is pending/success/unavailable without learning unnecessary sensitive eligibility facts. |
| Primary task | **MUST:** Identify the appropriate role/relationship path and complete only the necessary admission/verification step. |
| Secondary tasks | **SHOULD:** Explain privacy, non-official status, help, and recovery without distracting from the primary task. |
| Information hierarchy | **SHOULD:** Page purpose → role/path choice → required fields/evidence → privacy/context → submit → status. |
| Entry/exit points | **MUST:** Signed-out entry is clear; success/pending exits to the appropriate next state; denial offers a safe next step. |
| Mobile structure | **SHOULD:** Single-column form; labels above controls; helper/error copy directly attached; primary action follows relevant fields. |
| Desktop structure | **SHOULD:** Keep the form a focused readable column; optional explanation may sit adjacent only when it does not split required reading order. |
| Component choices | **MUST:** HeroUI `TextField`, `RadioGroup`/`Checkbox`/`Select` only where semantically appropriate; `Button` for commands; links for navigation/help. |
| Loading state | **SHOULD:** Submission button preserves label with pending indicator; form remains stable; duplicate submit is prevented. |
| Empty state | **MAY:** Not generally applicable; no artificial empty illustration is required. |
| Denied/unavailable state | **MUST:** Explain unavailability without exposing sensitive eligibility detail; distinguish from technical failure. |
| Error/retry state | **MUST:** Field errors stay near fields; recoverable server errors preserve entered data and offer retry. |
| Success state | **MUST:** State the accepted/pending outcome and next step; avoid decorative trust badges that reveal sensitive verification detail. |
| Keyboard/focus behavior | **MUST:** Logical order; error focus strategy; no trap; all paths complete without pointer. |
| Touch behavior | **MUST:** Target sizing follows `REF-020`; controls do not require precision taps. |
| Responsive stress cases | **MUST:** Long role labels, 200% text, 320 CSS px equivalent, software keyboard, validation errors, and browser autofill do not clip content. |
| Performance-visible behavior | **SHOULD:** Server-render stable explanatory content; isolate only interactive form behavior to client boundaries where needed. |
| Privacy/trust cues | **MUST:** Community-operated/non-official cue and data-minimization explanation appear at the decision point. |
| Open experiments | **EXPERIMENT:** Exact step grouping (single page vs short staged flow) based on completion/error evidence; do not add steps for visual drama. |

### 3.2 Member overview — “what matters now”

| Field | Reference guidance |
|---|---|
| Surface / route concept | **SHOULD:** A member overview that orients the user to current activity and durable useful information without merging everything into one chronological stream. |
| User success criterion | **MUST:** The user can identify relevant current items and a path to durable knowledge within the active scope. |
| Primary task | **SHOULD:** Scan what changed/needs attention and continue into the appropriate content concept. |
| Secondary tasks | **SHOULD:** Change scope, search, inspect membership context, enter services/events/knowledge/discussion concepts. |
| Information hierarchy | **SHOULD:** Active scope → current/important sections → durable/recoverable sections → secondary discovery. |
| Entry/exit points | **MUST:** Each item reveals type and scope before opening; exits preserve overview state when returning. |
| Mobile structure | **SHOULD:** One primary vertical scan; horizontally scrolling content is avoided for essential items; section headers remain clear. |
| Desktop structure | **SHOULD:** Multiple columns are allowed only for truly parallel sections with comparable priority; the layout keeps a clear reading order. |
| Component choices | **SHOULD:** Prefer semantic lists/sections; use cards only when a bounded item genuinely needs a surface container. |
| Loading state | **SHOULD:** Keep shell/scope stable; stream independent sections with skeletons shaped like their final list/card form. |
| Empty state | **MUST:** Section-specific empty copy distinguishes “nothing relevant yet” from loading/error and offers a next action where useful. |
| Denied/unavailable state | **MUST:** Hidden scopes/items do not leak through counts/previews. |
| Error/retry state | **MUST:** A failing section can recover independently when possible; failure never becomes an empty section. |
| Success state | **MAY:** Direct manipulation can update the affected item/section without a toast when the result is obvious. |
| Keyboard/focus behavior | **MUST:** Heading structure and list order match visual order; focus does not jump when streamed sections resolve. |
| Touch behavior | **SHOULD:** Repeated item targets have comfortable separation and avoid tiny nested affordances. |
| Responsive stress cases | **MUST:** Sparse, normal, and dense activity; long titles; absent imagery; multiple memberships; 320 CSS px equivalent; ultra-wide. |
| Performance-visible behavior | **SHOULD:** Prioritize shell/scope and first useful section; defer less important sections without blocking navigation. |
| Privacy/trust cues | **MUST:** Every item whose meaning depends on audience shows scope/type metadata before activation. |
| Open experiments | **EXPERIMENT:** Exact section ordering and whether current activity uses one mixed list or multiple purpose-specific modules; test findability/noise. |

### 3.3 Scoped community participation / contribution

| Field | Reference guidance |
|---|---|
| Surface / route concept | **SHOULD:** A scoped community space where conversation and durable contributions are distinguishable by purpose. |
| User success criterion | **MUST:** The user understands the current locality/community/group and publishes to the intended audience. |
| Primary task | **MUST:** Read relevant scoped content and contribute safely. |
| Secondary tasks | **SHOULD:** Search within scope, inspect scope membership, recover durable items, report/moderate where authorized. |
| Information hierarchy | **MUST:** Scope identity/audience → content filters/type → content → contribution action. |
| Entry/exit points | **MUST:** Entering from overview/search retains the target scope; leaving or switching scope updates audience cues before draft submission. |
| Mobile structure | **SHOULD:** Scope cue remains near top/current context; composer does not permanently consume large viewport area. |
| Desktop structure | **SHOULD:** Optional context rail/panel may expose scope metadata or filters if it materially reduces navigation; reading line length remains bounded. |
| Component choices | **SHOULD:** Semantic list/article patterns; `TextField`/`TextArea` for contribution; buttons for actions; menus only for secondary item commands. |
| Loading state | **SHOULD:** Preserve visible scope and prior stable content when safe; new-page/section loading is distinct from no posts. |
| Empty state | **MUST:** State that the active scope has no matching content and offer create/reset-filter actions only when authorized. |
| Denied/unavailable state | **MUST:** Access removal or unavailable scope does not reveal restricted item details. |
| Error/retry state | **MUST:** Draft survives recoverable publish failure; retry cannot silently duplicate or widen publication. |
| Success state | **SHOULD:** New contribution appears in context with clear scope; supplemental confirmation is brief. |
| Keyboard/focus behavior | **MUST:** Composer, filters, item actions, and menus follow canonical keyboard patterns; focus after successful publish returns to meaningful context. |
| Touch behavior | **MUST:** Scope-changing and publish controls have comfortable targets and are not adjacent in a way that encourages accidental audience changes. |
| Responsive stress cases | **MUST:** Very long posts, dense threads, long group names, multi-line metadata, keyboard open on mobile, 200% text. |
| Performance-visible behavior | **SHOULD:** Stream long content collections while keeping filters/scope usable; do not client-render the entire surface solely for convenience. |
| Privacy/trust cues | **MUST:** Audience/scope appears in composer and on published item when required to interpret access. |
| Open experiments | **EXPERIMENT:** Best visual distinction between transient conversation and durable knowledge contribution; compare labels, filters, and sectioning rather than color-only treatment. |

### 3.4 Durable knowledge search / recovery

| Field | Reference guidance |
|---|---|
| Surface / route concept | **MUST:** A durable discovery/search concept independent of chronological scrolling. |
| User success criterion | **MUST:** A user can retrieve a known older useful item within authorized scopes. |
| Primary task | **MUST:** Query and refine by meaningful scope/type facets. |
| Secondary tasks | **SHOULD:** Save/share a deep link to the result view, return to source context, inspect related durable items. |
| Information hierarchy | **SHOULD:** Search query → active scope/type filters → result count/status → result list → result metadata/snippet. |
| Entry/exit points | **SHOULD:** Search can be entered globally or from a scope; result links preserve intended context. |
| Mobile structure | **SHOULD:** Search stays prominent; filters collapse into an accessible control only if all active filters remain visible/removable. |
| Desktop structure | **SHOULD:** Filters may remain visible beside results when this improves scan; avoid a dense dashboard of filter cards. |
| Component choices | **MUST:** Labeled search input; canonical select/listbox/checkbox controls; semantic results list; links for results. |
| Loading state | **SHOULD:** Preserve query/filter controls and prior results when safe; mark updating state without blocking input unnecessarily. |
| Empty state | **MUST:** “No matching results” names the query/filter context and offers filter reset or query refinement. |
| Denied/unavailable state | **MUST:** Unauthorized content is not previewed as tantalizing locked search results unless product policy explicitly allows that disclosure. |
| Error/retry state | **MUST:** Query failure is visually and semantically distinct from zero results and provides retry. |
| Success state | **MAY:** Search update does not require toast; result count/list update and accessible status announcement are sufficient. |
| Keyboard/focus behavior | **MUST:** Query, filters, active-filter removal, results, and pagination/load-more are keyboard-complete; focus stays predictable after filter changes. |
| Touch behavior | **SHOULD:** Filter chips/buttons have comfortable hit areas and do not require horizontal precision scrolling for core operation. |
| Responsive stress cases | **MUST:** Long query, many active filters, zero results, hundreds of results, long snippets, absent images, 320 CSS px equivalent. |
| Performance-visible behavior | **SHOULD:** Search state lives in URL where feasible; server-render/stream results; client state only for interactive controls. |
| Privacy/trust cues | **MUST:** Result metadata communicates scope/type without exposing unauthorized audience detail. |
| Open experiments | **EXPERIMENT:** Exact filter set, result snippet density, and pagination vs incremental loading based on real corpus and performance. |

### 3.5 Service-provider discovery

| Field | Reference guidance |
|---|---|
| Surface / route concept | **SHOULD:** A service directory/detail concept with explicit provider trust context, not a member directory. |
| User success criterion | **MUST:** The member finds a relevant provider and understands that provider status is distinct from member verification. |
| Primary task | **SHOULD:** Browse/search by service need and relevant locality/community context. |
| Secondary tasks | **SHOULD:** Inspect endorsement/context/freshness, contact or follow an available next step, report outdated/inappropriate listing if supported. |
| Information hierarchy | **MUST:** Service/category → provider name → relevant location/context → trust/endorsement explanation → contact/next action. |
| Entry/exit points | **SHOULD:** Enter from overview/search/service concept; return preserves category/query filters. |
| Mobile structure | **SHOULD:** List rows/cards prioritize provider name, category, locality/context, and clear next action; secondary metadata wraps rather than truncates critically. |
| Desktop structure | **SHOULD:** Grid is allowed only if cards remain comparable and scan-friendly; a list is preferred when metadata comparison matters more than imagery. |
| Component choices | **SHOULD:** Lists/cards with semantic links; badges only for factual status; avoid avatar treatment that visually equates providers with verified members. |
| Loading state | **SHOULD:** Stable filter/search controls; provider skeletons mirror final geometry. |
| Empty state | **MUST:** No providers for a filter is distinct from service failure and offers filter reset. |
| Denied/unavailable state | **MUST:** Provider existence never grants member-only reading surfaces. |
| Error/retry state | **MUST:** Directory failure offers retry and does not display “no providers”. |
| Success state | **MAY:** Contact/deep-link actions rely on destination behavior; no celebratory confirmation required. |
| Keyboard/focus behavior | **MUST:** Entire provider identity is not wrapped around nested buttons; each interactive action has a distinct accessible purpose. |
| Touch behavior | **SHOULD:** Primary provider action and row/detail link do not overlap; targets are comfortable. |
| Responsive stress cases | **MUST:** Long business names, multiple categories, no image, outdated/unavailable status, dense list, 320 CSS px equivalent. |
| Performance-visible behavior | **SHOULD:** Images are optional progressive enhancement; useful provider text does not wait on image loading. |
| Privacy/trust cues | **MUST:** Provider ≠ member distinction is textual/semantic, not an implied badge color. |
| Open experiments | **EXPERIMENT:** List versus grid default and amount of endorsement context shown before detail. |

### 3.6 Events and local information

| Field | Reference guidance |
|---|---|
| Surface / route concept | **SHOULD:** A scoped current/upcoming/local-information concept that distinguishes time-sensitive items from durable reference content. |
| User success criterion | **SHOULD:** The user can tell what is upcoming/current/past, where it applies, and whether it is relevant to their scope. |
| Primary task | **SHOULD:** Scan relevant events/local items and open details. |
| Secondary tasks | **MAY:** Filter by date/type/scope; add to personal calendar only if implementation is justified without new dependency. |
| Information hierarchy | **MUST:** Status/time → title → scope/location → essential details → action. |
| Entry/exit points | **SHOULD:** Deep links open a stable detail; return preserves list date/filter context. |
| Mobile structure | **SHOULD:** Chronology and status remain textual; horizontal calendar grids are not the only route to content. |
| Desktop structure | **MAY:** A broader date/grid visualization may supplement, not replace, an accessible list. |
| Component choices | **SHOULD:** Semantic list + time elements; status badge with text; buttons/links as appropriate. |
| Loading state | **SHOULD:** Date/scope controls stay available; skeleton list mirrors item height. |
| Empty state | **MUST:** Clearly state no items for the selected date/scope and provide reset/broaden actions only within authorized scopes. |
| Denied/unavailable state | **MUST:** Hidden restricted events do not leak through titles/counts. |
| Error/retry state | **MUST:** Data failure is explicit and retryable. |
| Success state | **MAY:** Direct view/filter changes need no toast. |
| Keyboard/focus behavior | **MUST:** Date/filter controls follow canonical keyboard patterns; event links have descriptive accessible names. |
| Touch behavior | **SHOULD:** Date controls and list actions have adequate targets; no drag-only interaction. |
| Responsive stress cases | **MUST:** Long titles, multiple-day events, cancelled/past states, timezone/locale formatting, dense dates, 320 CSS px equivalent. |
| Performance-visible behavior | **SHOULD:** Prioritize textual event data over non-essential imagery; use stable placeholders. |
| Privacy/trust cues | **MUST:** Scope/location and any access limitation are visible before consequential action. |
| Open experiments | **EXPERIMENT:** Default grouping by time (today/upcoming/month) versus relevance; validate against pilot content volume. |

### 3.7 Membership contexts

| Field | Reference guidance |
|---|---|
| Surface / route concept | **MUST:** A membership/context concept that explains locality, communities, groups, and additive relationships. |
| User success criterion | **MUST:** The user understands current memberships and audience/access consequences of moving into a narrower context. |
| Primary task | **MUST:** Inspect memberships and active scope; enter/request/join/leave only where permitted. |
| Secondary tasks | **SHOULD:** Understand governance/contact/help for a context and pending membership state. |
| Information hierarchy | **MUST:** Locality context → communities → groups, with relationship labels and membership status; visual nesting is supportive, not the sole semantic carrier. |
| Entry/exit points | **SHOULD:** Global scope control can lead here; selecting a context returns to a task within that context without silently changing a draft audience. |
| Mobile structure | **SHOULD:** Vertical hierarchical list/sections; indentation is modest and paired with textual labels/breadcrumb-like context. |
| Desktop structure | **SHOULD:** Optional master-detail split when many memberships justify it; avoid tree complexity for small sets. |
| Component choices | **SHOULD:** Lists/disclosure controls/links; badges for explicit membership state; radio/select only if choosing one active scope among authorized options. |
| Loading state | **SHOULD:** Preserve known active scope while membership data refreshes when safe. |
| Empty state | **MUST:** Distinguish “no narrower memberships” from failed load; broader locality context remains understandable. |
| Denied/unavailable state | **MUST:** Removed/private contexts reveal no more than policy allows. |
| Error/retry state | **MUST:** Membership failure does not falsely imply user has no memberships. |
| Success state | **MUST:** Membership change names the changed context and access consequence. |
| Keyboard/focus behavior | **MUST:** Hierarchy remains traversable in semantic order without requiring spatial interpretation. |
| Touch behavior | **SHOULD:** Expand/select/join actions are distinct targets; disclosure chevrons do not become tiny sole targets. |
| Responsive stress cases | **MUST:** Deep group names, many memberships, pending states, no groups, 200% text, 320 CSS px equivalent. |
| Performance-visible behavior | **SHOULD:** Load context details progressively without blocking the basic membership map. |
| Privacy/trust cues | **MUST:** Relative “public” scope is expressed in words; it never implies open-internet visibility. |
| Open experiments | **EXPERIMENT:** Breadcrumb, compact hierarchy, or master-detail presentation based on membership depth/volume. |

### 3.8 Governance workspace

| Field | Reference guidance |
|---|---|
| Surface / route concept | **MUST:** A privileged operational workspace distinct from member participation surfaces. |
| User success criterion | **MUST:** Authorized roles complete admission/moderation/membership/governance tasks with clear context, consequence, and recoverability. |
| Primary task | **MUST:** Review a work item with necessary context and take an authorized action. |
| Secondary tasks | **SHOULD:** Filter queue/status, inspect audit-relevant detail, return to workload, switch back to member context where applicable. |
| Information hierarchy | **MUST:** Workspace/role → queue/context → subject/work item → evidence needed for decision → action/consequence → result. |
| Entry/exit points | **MUST:** Privileged entry is explicit; leaving to member context is explicit; browser back does not accidentally repeat actions. |
| Mobile structure | **SHOULD:** Critical review/action remains possible on narrow screens, but dense multi-column comparison may reflow to sequenced sections; no information loss. |
| Desktop structure | **SHOULD:** Denser split/list-detail layouts are allowed where they materially improve operational scan and still preserve reading/focus order. |
| Component choices | **MUST:** Semantic tables only for genuinely tabular comparison; lists for queues; dialogs for focused confirmation; inline forms for recoverable edits; status badges include text. |
| Loading state | **SHOULD:** Queue shell/context stays visible; item detail can stream independently. |
| Empty state | **MUST:** “No work items” is distinct from load failure and names the applied filters. |
| Denied/unavailable state | **MUST:** Insufficient privilege offers safe exit without exposing unauthorized governance data. |
| Error/retry state | **MUST:** Failed high-impact action shows actual resulting state, preserves evidence/context, and provides retry/escalation where appropriate. |
| Success state | **MUST:** Completed action names the affected entity/context and resulting state; auditability is not replaced by a transient toast. |
| Keyboard/focus behavior | **MUST:** Full queue→detail→action→confirmation→result flow is keyboard-complete; modal focus follows `REF-025`. |
| Touch behavior | **MUST:** Destructive and opposing actions are not crowded; touch targets meet `REF-020`. |
| Responsive stress cases | **MUST:** Dense queues, long evidence, many statuses, table reflow, 200% text, 320 CSS px equivalent, slow network. |
| Performance-visible behavior | **SHOULD:** Server-render/filter operational data where practical; keep client interactivity narrow; errors have bounded recovery. |
| Privacy/trust cues | **MUST:** Privileged role/workspace, subject scope, and action consequence are visible; sensitive verification data is minimized. |
| Open experiments | **EXPERIMENT:** Exact split-pane/table/list composition based on real operational volume; do not optimize for hypothetical platform-scale admin complexity. |

## 4. Content density rules

### RVIS-022 — Feed/list density
- **Rule — SHOULD:** Repeated feed/list items use separators, rhythm, and aligned metadata before defaulting to individually elevated cards.
- **Confidence:** 4
- **Validation:** Compare scan time and visual noise with dense real content.

### RVIS-023 — Discovery/search density
- **Rule — SHOULD:** Search/discovery prioritizes query, active filters, result identity/type/scope, and snippet; secondary metadata collapses before essential context does.
- **Confidence:** 4
- **Validation:** 320 CSS px and dense-results test.

### RVIS-024 — Form/onboarding density
- **Rule — SHOULD:** Forms use a clear vertical progression with related fields grouped semantically; helper/error copy stays close to its field; decorative side content never interrupts reading/focus order.
- **Confidence:** 4
- **Validation:** keyboard + error-state completion test.

### RVIS-025 — Detail/profile density
- **Rule — SHOULD:** Details favor readable sectioning over dashboard tiles; metadata is grouped by meaning and action consequence.
- **Confidence:** 3
- **Validation:** information-finding task with long real content.

### RVIS-026 — Operational-console density
- **Rule — SHOULD:** Governance views may be denser than member views, using aligned columns, compact controls, and persistent context only when all controls remain comfortably targetable and legible.
- **Confidence:** 4
- **Validation:** scan speed, 200% text, keyboard, and touch fallback.

### RVIS-027 — Overlay density
- **Rule — MUST:** Modal/popover content contains only the focused task/context needed for that overlay; long multi-section workflows stay in a page/surface unless modal containment materially improves safety.
- **Confidence:** 4
- **Validation:** focus/scroll and recovery test.

## 5. Typography and readability

### RVIS-028 — Hierarchy roles
- **Rule — MUST:** Define tokens/roles for page title, section heading, item title, body, secondary body, metadata, field label, helper/error, and status; semantic heading levels match document structure.
- **Confidence:** 5
- **Validation:** semantic outline and grayscale review.

### RVIS-029 — Body readability
- **Rule — SHOULD:** Default body/UI copy remains comfortably readable at normal browser settings and survives 200% text resize; exact base size/line-height remains a candidate system decision rather than inherited pixel fact.
- **Confidence:** 4
- **Validation:** real-content read test, 200% text, text-spacing override.

### RVIS-030 — Mobile form text
- **Rule — SHOULD:** Text-entry controls on narrow touch layouts use approximately 16 CSS px or larger text unless device testing shows equivalent readability without unwanted browser zoom behavior.
- **Confidence:** 4
- **Rationale:** Current Vercel interface guidance plus mobile browser ergonomics.
- **Validation:** iOS/Android browser focus test; browser zoom remains enabled.

### RVIS-031 — Reading measure
- **Rule — EXPERIMENT:** Long-form content targets a readable line measure rather than a fixed pixel width; evaluate approximately 60–75 characters per line as a candidate range, then validate with Portuguese text, headings, links, and 200% text.
- **Confidence:** 2
- **Rationale:** Readability heuristic, not an objective product invariant.
- **Validation:** side-by-side reading test and wrapping stress.

### RVIS-032 — Metadata and truncation
- **Rule — MUST:** Scope, audience, action labels, status, and error text never rely on truncation that removes the distinguishing information; lower-value metadata may wrap or truncate only when full content remains available accessibly.
- **Confidence:** 5
- **Validation:** long-name/localization stress.

### RVIS-033 — Locale/diacritics/numerics
- **Rule — MUST:** Font and layout handle Portuguese diacritics and locale-aware date/time/number presentation without clipped glyphs or fixed-width assumptions; tables/comparisons MAY use tabular numerals where it improves alignment.
- **Confidence:** 5 / 3
- **Validation:** diacritic, large-number, date/time, and locale test.

## 6. Color and status semantics

### RVIS-034 — Text and UI contrast
- **Rule — MUST:** Normal text ≥ 4.5:1; large-scale text ≥ 3:1; essential non-text controls/state indicators ≥ 3:1 against adjacent colors, subject to WCAG-defined exceptions.
- **Confidence:** 5
- **Validation:** computed contrast on every semantic token/state.

### RVIS-035 — Status redundancy
- **Rule — MUST:** Success, warning, danger, info, selected, pending, denied, and disabled states use text/shape/icon/position semantics in addition to color where the state matters.
- **Confidence:** 5
- **Validation:** grayscale/color-vision simulation plus screen-reader check.

### RVIS-036 — Danger reservation
- **Rule — SHOULD:** Danger styling is reserved for destructive/failed/high-risk states; brand accent does not compete with danger.
- **Confidence:** 4
- **Validation:** state palette review across forms, governance, and alerts.

### RVIS-037 — Selected/active vs scope
- **Rule — MUST:** Selected navigation state and current access scope are visually distinguishable concepts; the same accent treatment cannot make them semantically ambiguous.
- **Confidence:** 5
- **Links:** `REF-008`
- **Validation:** shell comprehension test.

### RVIS-038 — Disabled state
- **Rule — MUST:** Disabled controls remain identifiable and their purpose understandable; disabled styling does not reduce essential explanatory text below accessible contrast when that text is still intended for reading.
- **Confidence:** 5
- **Validation:** contrast/semantics review.

### RVIS-039 — Additional themes
- **Rule — MAY:** Additional color themes, including dark mode, may be implemented only if the pilot value and maintenance cost justify them and every semantic/contrast rule remains intact.
- **Confidence:** 2
- **Validation:** complete token/state parity audit; no Phase 1 dependency expansion.

## 7. Component visual/interaction rules

| Component | Reference rule |
|---|---|
| Buttons | **MUST:** hierarchy comes from action consequence/frequency, not decorative color variety; primary action is visually clear; loading keeps the action label; icon-only buttons have accessible names and adequate hit area. |
| Links | **MUST:** links remain distinguishable by context/non-color cue where needed and use descriptive purpose; links navigate, buttons act. |
| Form fields | **MUST:** visible label, control, helper/error relationship; invalid state uses text + semantic state; placeholder is supplemental. |
| Checkbox/radio/switch | **MUST:** preserve HeroUI/React Aria state/focus behavior; label enlarges the practical target; selected state is not color-only. |
| Select/listbox/menu | **MUST:** preserve canonical keyboard/focus/selection behavior; menu is for actions, select/listbox for choice; active/selected items remain clear in high-contrast/grayscale conditions. |
| Tabs/navigation controls | **SHOULD:** tabs look like peer panel controls rather than global destinations; selected state, focus state, and overflow remain distinct; durable destination state is URL-backed where needed. |
| Dialog/sheet/popover | **MUST:** modal versus non-modal behavior is visually and semantically clear; backdrop/elevation supports containment but does not replace heading/label; focus lifecycle follows APG. |
| Cards/list rows | **SHOULD:** use one main click target plus separate explicit secondary actions; avoid nested controls inside a giant clickable container; border/surface separation is preferred over heavy shadow by default. |
| Avatars/identity cues | **MUST:** avatar shape/style never implies verified member status; verification/role context is textual/semantic and only shown when task-relevant. |
| Badges/status | **MUST:** badges contain meaningful text or accessible name; color is supplemental; provider/member/governance distinctions are factual, not prestige decoration. |
| Toasts/alerts | **SHOULD:** toast for transient supplemental confirmation; inline/page alert for persistent recovery; critical instructions never exist only in an auto-dismissed toast. |
| Skeleton/empty/error | **MUST:** skeleton mirrors expected geometry; empty states describe real absence; errors describe failure/recovery; neither is reused as the other. |

### RVIS-040 — HeroUI canonical foundation
- **Rule — MUST:** Styling customizations preserve HeroUI v3 compound-component semantics, interactive data states, focus visibility, validation wiring, and keyboard behavior documented for the installed component classes.
- **Confidence:** 5
- **Validation:** compare component behavior to current HeroUI v3 maintainer examples and WAI-ARIA patterns.

## 8. Responsive reference matrix

Exact viewport breakpoints are not frozen. Transitions are triggered by content fit, readable measure, navigation target fit, and interaction complexity.

| Surface | Narrow/mobile | Medium | Wide/desktop | Trigger for transition | Experiment? |
|---|---|---|---|---|---|
| Controlled access | **SHOULD:** single focused column | **SHOULD:** same reading order; optional adjacent explanation | **SHOULD:** bounded form with optional supporting pane | Supporting content can sit adjacent without splitting focus/read order | yes — exact width |
| Member overview | **SHOULD:** one primary vertical scan | **SHOULD:** selected parallel sections may share row | **SHOULD:** multiple purposeful columns only if hierarchy remains obvious | Section cards/lists can coexist without label truncation or competing priority | yes |
| Scoped participation | **SHOULD:** content + compact scope cue; secondary context collapses | **SHOULD:** more persistent filters/context if fit | **SHOULD:** optional context rail + bounded reading column | Scope/filter controls fit without shrinking reading measure | yes |
| Knowledge search | **SHOULD:** search + collapsible filters + list | **SHOULD:** active filters stay visible; filter panel may persist | **SHOULD:** persistent filter region + results if useful | Filter controls and result measure fit with no crowding | yes |
| Services | **SHOULD:** list-first | **EXPERIMENT:** list vs 2-up cards | **EXPERIMENT:** list vs grid based on comparison needs | Metadata can remain comparable without truncation | yes |
| Events/local info | **SHOULD:** accessible list chronology | **MAY:** richer grouped timeline | **MAY:** supplemental calendar/grid beside list | Two-dimensional view adds value without replacing list | yes |
| Membership contexts | **SHOULD:** vertical hierarchy | **SHOULD:** hierarchy + detail | **MAY:** master-detail if volume justifies | Membership count/depth makes split view materially faster | yes |
| Governance | **SHOULD:** sequenced list→detail→action | **SHOULD:** compact list/detail when fit | **SHOULD:** denser split/table layouts when warranted | Operational comparison gains outweigh reading/focus complexity | yes |
| Modal | **SHOULD:** near-full-width with safe margins; internal scroll | **SHOULD:** bounded dialog | **SHOULD:** bounded dialog; no gratuitous width expansion | Content/controls fit with readable line length | yes — exact size |
| Global navigation | **EXPERIMENT:** compact persistent vs menu-first | **SHOULD:** persistent when fit | **SHOULD:** persistent | Labels/targets/scope cue fit without truncation/crowding | yes |

### RVIS-041 — Responsive verification set
- **Rule — MUST:** Every material surface is tested at 320 CSS px equivalent width, 200% text, 400% zoom/reflow conditions where applicable, portrait/landscape narrow devices, a common laptop width, and an ultra-wide layout; exact test pixel set beyond objective thresholds is implementation-owned.
- **Confidence:** 5
- **Validation:** recorded browser matrix and screenshots in later runtime phases, not in Phase 1.

## 9. Motion and feedback

### RVIS-042 — Motion purpose
- **Rule — SHOULD:** Use motion only for state continuity (overlay enter/exit, disclosure, selection, optimistic progress) when static feedback would be less clear.
- **Confidence:** 4
- **Validation:** remove motion; retain it only when comprehension degrades.

### RVIS-043 — Reduced motion
- **Rule — MUST:** `prefers-reduced-motion` removes or materially reduces non-essential transforms/animated travel and never removes required state feedback.
- **Confidence:** 5
- **Validation:** OS/browser reduced-motion test.

### RVIS-044 — Pending feedback
- **Rule — MUST:** Pending actions show immediate visible state without changing the action's meaning; duplicate activation is prevented where duplication is harmful.
- **Confidence:** 5
- **Links:** `REF-028`, `REF-036`
- **Validation:** slow-network mutation test.

### RVIS-045 — Skeleton stability
- **Rule — SHOULD:** Skeletons appear only for perceptible content waits and approximate final geometry; avoid skeleton flashes for near-instant responses.
- **Confidence:** 4
- **Rationale:** Next.js/Vercel performance-visible guidance.
- **Validation:** throttled/fast network test and layout-shift measurement.

## External source set

Verified on 2026-08-21. The visual guide inherits the source set in `REFERENCE_DESIGN_SPEC.md` and relies particularly on:

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WAI-ARIA APG Dialog/Tabs/Listbox patterns:
  - https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  - https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
  - https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- Vercel Web Interface Guidelines: https://vercel.com/design/guidelines
- Next.js App Router current 16.3-era docs:
  - https://nextjs.org/docs/app/getting-started/server-and-client-components
  - https://nextjs.org/docs/app/getting-started/fetching-data
  - https://nextjs.org/docs/app/getting-started/error-handling
  - https://nextjs.org/docs/app/getting-started/linking-and-navigating
- HeroUI v3 current maintainer docs:
  - https://heroui.com/en/docs/react/components/button
  - https://heroui.com/en/docs/react/components/text-field
  - https://heroui.com/en/docs/react/components/checkbox
  - https://heroui.com/en/docs/react/components/radio-group
  - https://heroui.com/docs/react/components/select
  - https://heroui.com/en/docs/react/components/modal
  - https://heroui.com/en/docs/react/components/tabs
  - https://heroui.com/en/docs/react/components/toast
- Addy Osmani, frontend UI engineering craft lens: https://github.com/addyosmani/agent-skills/blob/main/skills/frontend-ui-engineering/SKILL.md

## 10. Reference rules

| Ref ID | Visual/interaction rule | Strength | Confidence | Rationale | Validation |
|---|---|---|---:|---|---|
| RVIS-001 | Calm, practical, community-operated character | SHOULD | 4 | trust + low-noise product | blind brand review |
| RVIS-002 | Avoid official/institutional authority cues | MUST | 5 | product invariant | brand review |
| RVIS-003 | Density varies by task | SHOULD | 4 | scanability vs reading | density stress |
| RVIS-004 | Typography hierarchy is semantic | MUST | 5 | accessibility/scan | grayscale + outline |
| RVIS-005 | Exact font family remains bounded experiment | EXPERIMENT | 2 | no product evidence for exact family | type comparison |
| RVIS-006 | Semantic color system + contrast | MUST | 5 | objective state/a11y | token audit |
| RVIS-007 | Brand accent hue remains experiment | EXPERIMENT | 2 | aesthetic preference | palette comparison |
| RVIS-008 | Use minimum necessary surface layers | SHOULD | 4 | reduce card/shadow noise | layer-removal review |
| RVIS-009 | Exact spacing/radius/elevation scale remains experiment | EXPERIMENT | 2 | false precision avoidance | token comparison |
| RVIS-010 | Icons secondary to text; imagery task-relevant | SHOULD | 4 | clarity/accessibility | icon-hidden test |
| RVIS-011 | Motion purposeful/reduced-motion aware | SHOULD | 4 | feedback over decoration | motion-off test |
| RVIS-012 | Pre-auth shell protects authenticated content and explains access | MUST | 5 | privacy/product | signed-out test |
| RVIS-013 | Pre-auth keeps admission task visually primary | SHOULD | 4 | task focus | comprehension |
| RVIS-014 | Member shell separates task navigation from scope | MUST | 5 | REF-008/010 | shell comprehension |
| RVIS-015 | Shell/scope stable during loading/navigation | SHOULD | 4 | orientation/performance | throttled navigation |
| RVIS-016 | Narrow navigation pattern is experiment | EXPERIMENT | 2 | destination fit unknown | prototype comparison |
| RVIS-017 | Wide navigation persistent without line-length inflation | SHOULD | 3 | scan/readability | wide test |
| RVIS-018 | Governance workspace visibly distinct | MUST | 5 | privilege safety | role-context test |
| RVIS-019 | Global actions limited to cross-route utilities | SHOULD | 3 | reduce shell noise | task-location test |
| RVIS-020 | Reflow and target requirements apply globally | MUST | 5 | WCAG | 320/zoom/target audit |
| RVIS-021 | Reading measure bounded; scan surfaces can widen | SHOULD | 3 | task-specific readability | real-content test |
| RVIS-022 | Lists prefer rhythm/separators before elevated cards | SHOULD | 4 | scanability | dense list comparison |
| RVIS-023 | Search density preserves query/filter/result essentials | SHOULD | 4 | recoverability | narrow/dense test |
| RVIS-024 | Form density follows semantic vertical progression | SHOULD | 4 | form clarity | error/keyboard test |
| RVIS-025 | Detail views favor sections over dashboard tiles | SHOULD | 3 | reading hierarchy | info-find test |
| RVIS-026 | Governance may be compact but remains accessible | SHOULD | 4 | operational scan | density/a11y test |
| RVIS-027 | Overlays contain focused tasks only | MUST | 4 | focus/recovery | modal scroll test |
| RVIS-028 | Define semantic typography roles | MUST | 5 | hierarchy/a11y | outline audit |
| RVIS-029 | Body text remains readable/resizable | SHOULD | 4 | WCAG/readability | 200% text |
| RVIS-030 | Narrow touch input text ~16 CSS px+ | SHOULD | 4 | mobile ergonomics | iOS/Android test |
| RVIS-031 | Long-form measure candidate ~60–75 characters | EXPERIMENT | 2 | readability heuristic | reading comparison |
| RVIS-032 | Critical labels/status/scope never destructively truncate | MUST | 5 | trust/understanding | long-content test |
| RVIS-033 | Typography/layout support locale/diacritics | MUST | 5 | locale correctness | locale test |
| RVIS-034 | WCAG text/non-text contrast | MUST | 5 | objective standard | contrast audit |
| RVIS-035 | Status never color-only | MUST | 5 | objective standard | grayscale/a11y |
| RVIS-036 | Danger reserved for high-risk/destructive semantics | SHOULD | 4 | semantic clarity | state palette review |
| RVIS-037 | Selection and access scope are visually distinct | MUST | 5 | trust mental model | shell test |
| RVIS-038 | Disabled purpose stays understandable | MUST | 5 | accessibility | disabled-state review |
| RVIS-039 | Extra themes optional, never at semantic cost | MAY | 2 | pilot scope | token parity |
| RVIS-040 | HeroUI v3 behavior preserved under styling | MUST | 5 | component contract | keyboard/a11y matrix |
| RVIS-041 | Responsive verification includes objective stress set | MUST | 5 | WCAG/craft | browser matrix |
| RVIS-042 | Motion only when it clarifies state | SHOULD | 4 | low-noise feedback | motion removal |
| RVIS-043 | Reduced-motion preference respected | MUST | 5 | accessibility | OS preference test |
| RVIS-044 | Pending actions give immediate truthful feedback | MUST | 5 | state truth | slow mutation test |
| RVIS-045 | Skeletons stable and not flashed gratuitously | SHOULD | 4 | perceived performance | fast/slow + CLS |

## Freeze declaration

The Phase 1 reference pair is frozen as of 2026-08-21. `RVIS-*` IDs above are stable and must not be renumbered after Phase 2 begins.
