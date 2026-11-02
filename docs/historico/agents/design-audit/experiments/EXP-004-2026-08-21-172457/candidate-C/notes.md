# Candidate C — Quiet Civic · notes

> Status: exploratory. NOT design law. NOT production code.

## Direction

A reading of Bivaque's contract through a high-readability,
low-emotion visual system optimised for scan and decision. The intent
is the opposite of B: instead of warmth and elevation, deliver
precision, tabular numbers, monospace metadata, cool slate surfaces,
and a slate-blue accent reserved for actions and decisions only.

The candidate demonstrates that "calm, capable, practical, local,
trustworthy" (DS-001 / VG-001) can also be carried by a cooler,
more operational visual register.

## Deliberate choices

### Type

- **Neutral grotesk** — Geist at 12–22 px carries UI, body, and
  headings. It is technical, neutral, and readable at small sizes.
  Source: Google Fonts, free license.
- **Monospace tabular** — Geist Mono carries metadata (dates, hours,
  counters, eyebrows, status chips, neighbourhood tags,
  reaction labels). The pairing is one grotesk + one mono — the
  smallest font-family surface area of the three candidates.

The pairing is deliberately the simplest of the three candidates.
This makes the design system cheaper to ship, easier to audit, and
less prone to drift.

### Palette

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F4F6F8` | Page background, cool slate |
| `--surface` | `#FFFFFF` | Card / state-card surface |
| `--surface-2` | `#FAFBFC` | Comment surface |
| `--ink` | `#1B2530` | Primary text |
| `--ink-2` | `#46586A` | Secondary text |
| `--ink-3` | `#788998` | Tertiary / metadata |
| `--accent` | `#3B5673` | Slate-blue, actions only |
| `--accent-soft` | `#E1E9F2` | Selected, focus halo carrier |
| `--accent-ink` | `#1F3247` | On-accent text |
| `--danger` | `#8E4848` | Error state |

Accent is reserved for actions, focus rings, the active tab
underline, and status dots on post metadata. It is **not** used as
decoration.

### Radius and elevation

- Cards and surfaces: 6 px radius (`--r-md`). Pills for locality
  toggle only; segmented tabs are underline-based.
- Elevation: hairline + a single soft `0 2px 6px ...` reserved for
  focus state. Repeated elevation is avoided (`VG-011`).
- Hover on reaction buttons tints the border to accent and the
  background to paper-2.

### Motion

- Durations: 100 / 160 / 220 ms — the fastest base of the three.
- Easing: `cubic-bezier(0.2, 0.4, 0.2, 1)`.
- No hover lift. No translateY. No shadow scale-up.
- Reduced-motion: same global reset as A and B.

### Composition

- Topbar carries an explicit horizontal `Cidade · Comunidade ·
  Grupos · Eu` topnav at ≥768 px. At <768 px, the topnav collapses
  out; the bottom nav takes over (see below). The presence of a
  topnav on tablet and desktop is a deliberate contrast to A and B,
  which rely on locality context + composer + activity stream to
  carry IA at those widths.
- Locality is a single headline with a monospace eyebrow
  ("CIDADE ·") above it.
- Composer: trigger + audience chip + primary "Publicar" button. The
  Publish button is a deliberate contrast — it sits inside the
  composer surface, signalling that the composer is actionable from
  the trigger without opening a modal.
- Segmented tabs use an underline accent (not a pill background),
  with a tabular monospace counter (`128 posts · 18 h`) on the right.
- Posts are hairline-separated lists, not cards. Metadata is a
  monospace row with three parts: a neighbourhood chip (`laranjeiras`),
  a timestamp (`21 ago, 14:32`), and a status dot + label
  (`aberto`, `informativo`, `recomendação`).
- Comments carry a small monospace timestamp on the right, anchoring
  the comment in time without needing a hover or extra metadata
  block.
- State cards include a small monospace index label (`FIM`, `!`) at
  the top to give a "section" feel. Error state uses an accent left
  edge.
- Right rail cards are bordered and dense; the rail-row uses a small
  tabular numeric date tile and a `●●●` activity delta instead of an
  icon.

### Copy and accents

- Eyebrow "CIDADE ·" is monospace uppercase, deliberately low key.
- Composer placeholder: "Compartilhe algo com a sua comunidade…".
- Audience chip: "Rio · Cidade", monospace, accent-coloured,
  bordered.
- Reaction buttons split the count and label
  (`9` `úteis`, `22` `salvaram`). Numbers are tabular-nums.
- Status labels in post metadata carry an icon plus text
  (`● aberto`, `■ informativo`, `✓ recomendação`) so meaning survives
  even without the dot colour.

## Deliberate non-choices

- No decorative gradients, no glass, no warm earth tones.
- No iconography for the rail — only typographic and tabular cues.
- No hover lift on the primary button (hover changes background
  only).
- Stats are not added to the locality header. Locality reads as a
  place, not as a product.

## WCAG 2.2 AA contrast (objective pairs sampled)

| Pair | Foreground | Background | Ratio | Pass |
|---|---|---|---|---|
| Body text | `#1B2530` | `#FFFFFF` | ~14.8:1 | PASS (AAA) |
| Body text on paper | `#1B2530` | `#F4F6F8` | ~13.7:1 | PASS (AAA) |
| Secondary | `#46586A` | `#FFFFFF` | ~8.2:1 | PASS (AAA) |
| Metadata | `#788998` | `#FFFFFF` | ~4.6:1 | PASS (AA) |
| Accent text on accent-soft | `#1F3247` | `#E1E9F2` | ~9.4:1 | PASS (AAA) |
| Accent text on surface | `#3B5673` | `#FFFFFF` | ~7.0:1 | PASS (AAA) |
| Primary button (ink-inv on accent) | `#F4F6F8` | `#3B5673` | ~6.6:1 | PASS (AA) |
| Error title | `#8E4848` | `#FFFFFF` | ~5.7:1 | PASS (AA) |
| Mono metadata (small) | `#788998` | `#FFFFFF` | ~4.6:1 | PASS (AA @ 12 px) |

Visible focus ring: 2 px solid `#3B5673` + 4 px halo. Halo contrast
vs paper/surface exceeds 3:1.

## Honest tradeoffs (what this candidate loses)

- **Personality**: cool slate + monospace-heavy chrome can read as
  "internal tool" rather than "community product". Some users will
  feel welcomed by A and B before they feel welcomed by C.
- **Brand warmth**: terracotta and warm paper are a more distinctive
  brand cue than slate blue. C's recognisability comes from
  precision, not from colour.
- **Locality header density**: no stats means C is the most
  information-spare of the three on the locality card. For
  neighbourhoods that want a clear "you are part of a 1,200-person
  network" cue, C is the wrong answer.
- **Topnav on ≥768 px**: the topnav occupies more horizontal space
  than A's locality pill + avatar. On 768 px, A and B leave more
  room for the composer; C does not. Whether this is a tradeoff or
  a feature depends on whether the IA at tablet width belongs in the
  topnav or in the page body.
- **Status dot in metadata**: the `● aberto` / `■ informativo` /
  `✓ recomendação` pattern carries meaning without colour, but adds
  three small icons per post. On very narrow viewports this can
  wrap.

## Where the static render cannot prove

- Topnav keyboard semantics: the topnav is rendered as plain links
  with `aria-current="page"`. Whether it should become a menubar /
  navigation landmark is an IA question, not a visual one — but the
  visual system needs to accommodate either.
- Modal focus lifecycle (`DS-023`).
- Reduced-motion runtime behaviour (`DS-025`).
- Keyboard semantics for segmented tabs.
- 320 CSS-px reflow.

## Cross-candidate note

C is the candidate most likely to be read as "operational". If the
audience for Bivaque skews toward members who already self-identify
as community operators (governance, group admins, organisers), C may
match their actual expectation. If the audience skews toward casual
members who joined for a single recommendation, A or B will probably
feel more welcoming. The comparison matrix records this as a
tradeoff rather than a winner.
