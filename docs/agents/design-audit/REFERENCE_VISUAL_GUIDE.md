# REFERENCE_VISUAL_GUIDE — independent benchmark

> **Status: NOT YET GENERATED.**
>
> This file must be produced in the same uncontaminated Phase 1 program as `REFERENCE_DESIGN_SPEC.md`. It may use the frozen reference design spec, but it must not read incumbent design docs, current UI source, current screenshots, current tokens, or visual audit history.

## Purpose

Translate the independent reference design standard into concrete screen/surface guidance without inheriting Bivaque's current visual solution.

This is not a moodboard and not a pixel-perfect redesign. It is an auditable guide for hierarchy, layout, responsive behavior, component usage, states, interaction, and visual language.

## Required structure

### 1. Visual system direction

Define the visual system appropriate to the product, including:

- brand/product character;
- density;
- typography strategy;
- color semantics;
- surface hierarchy;
- spacing rhythm;
- radius/elevation logic;
- iconography;
- imagery/media treatment;
- motion principles.

For every exact value or narrow range, state why that precision is warranted. Otherwise use semantic guidance and mark unresolved choices as `EXPERIMENT`.

### 2. Global shell

Define reference behavior for:

- pre-auth shell;
- authenticated member shell;
- operator/admin surfaces where product truth requires separation;
- desktop navigation;
- mobile navigation;
- header/global actions;
- content width and responsive reflow;
- persistent vs contextual actions.

Do not assume the incumbent number, order, size, or shape of navigation items.

### 3. Surface-by-surface guide

Create one section per material product surface/journey supported by `docs/BIVAQUE.md`.

Each section must include:

```text
Surface / route concept
User success criterion
Primary task
Secondary tasks
Information hierarchy
Entry/exit points
Mobile structure
Desktop structure
Component choices
Loading state
Empty state
Denied/unavailable state
Error/retry state
Success state
Keyboard/focus behavior
Touch behavior
Responsive stress cases
Performance-visible behavior
Privacy/trust cues
Open experiments
```

Do not invent routes solely because the incumbent app may have them. Organize around product concepts and journeys first.

### 4. Content density rules

Define how density changes by surface type:

- feed/list;
- discovery/search;
- form/onboarding;
- profile/detail;
- moderation/operational console;
- modal/overlay.

Avoid universal spacing/card rules unless they genuinely apply across contexts.

### 5. Typography and readability

Specify:

- hierarchy roles;
- body readability target;
- line length/measure guidance;
- metadata hierarchy;
- label/helper/error text;
- numeric/status treatment;
- truncation/wrapping rules;
- language/diacritic/i18n considerations.

Font-family selection must be justified as product/brand/technical choice, not inherited convention.

### 6. Color and status semantics

Define semantic roles and contrast requirements without assuming incumbent colors.

Separate:

- brand/accent choice;
- interactive state;
- success/warning/danger/info;
- selected/active state;
- disabled state;
- focus indication;
- decorative color.

Status cannot depend on color alone.

### 7. Component visual/interaction rules

For each major component class, define both visual and interaction constraints. Reference canonical HeroUI behavior where appropriate.

At minimum:

- buttons;
- links;
- form fields;
- checkbox/radio/switch;
- select/listbox/menu;
- tabs/navigation controls;
- dialogs/sheets/popovers;
- cards/list rows;
- avatars/identity cues;
- badges/status;
- toasts/alerts;
- skeleton/empty/error states.

### 8. Responsive reference matrix

Use a behavior matrix rather than blindly inheriting fixed breakpoints:

| Surface | Narrow/mobile | Medium | Wide/desktop | Trigger for transition | Experiment? |
|---|---|---|---|---|---|
| ... | ... | ... | ... | content/interaction criterion | yes/no |

Where exact viewport thresholds are proposed, include evidence/rationale and confidence.

### 9. Motion and feedback

Specify only purposeful motion:

- state change feedback;
- navigation transitions;
- overlay entrance/exit;
- optimistic/pending feedback;
- reduced-motion behavior.

Avoid motion as the sole carrier of meaning.

### 10. Reference rules

End with stable rule IDs linked to `REFERENCE_DESIGN_SPEC.md` where applicable:

| Ref ID | Visual/interaction rule | Strength | Confidence | Rationale | Validation |
|---|---|---|---:|---|---|
| RVIS-001 | ... | SHOULD | 3 | ... | ... |

Once the reference is frozen and Phase 2 begins, do not renumber existing rule IDs.

## Quality bar

Reject:

- generic SaaS card-grid defaults;
- arbitrary exact pixels presented as fact;
- visual novelty that harms operational scanability;
- one universal component shape for unrelated contexts;
- desktop-only reasoning;
- mobile-only reasoning;
- inaccessible contrast/focus/target behavior;
- patterns that fight canonical HeroUI interaction without rationale;
- visual rules that redefine product truth;
- any comparison to incumbent Bivaque design during Phase 1.
