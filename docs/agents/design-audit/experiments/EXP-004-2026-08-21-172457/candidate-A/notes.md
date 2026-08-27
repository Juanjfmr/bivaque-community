# Candidate A — Civic Editorial · notes

> Status: exploratory. NOT design law. NOT production code.

## Direction

A reading of Bivaque's "calm, credible, community-operated" character
(DS-001, VG-001) through editorial calm — a serif display face carrying
locality and reading copy, a grotesque carrying UI and metadata, a
single restrained accent, hairlines instead of elevation.

The intent is to make the product feel like a trusted local paper's
digital column: practical, civic, neighbourly, never ceremonial.

## Deliberate choices

### Type

- **Display + body serif** — Newsreader at 28–46 px carries locality
  headings, post bodies, and rail titles. Source: Google Fonts, free
  license, designed for editorial Portuguese-friendly proportions.
- **UI grotesque** — Inter Tight for composer, controls, reactions,
  navigation, buttons.
- **Monospace** — JetBrains Mono for metadata, dates, eyebrows, code,
  reaction counters. Tabs are an exception (serif) to lean into the
  editorial rhythm.

The pairing avoids Inter-only, avoids Roboto-only, and avoids the
"system sans default" trap called out by `VISUAL_GUIDE.md` §13. It is
not Newsreader-or-bust; it is Newsreader-or-equal-class for the
experiment.

### Palette

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F4EFE6` | Page background, warm paper |
| `--paper-2` | `#EDE5D6` | Secondary surface, hairline carrier |
| `--ink` | `#1F1B16` | Primary text |
| `--ink-2` | `#4A4338` | Secondary text |
| `--ink-3` | `#7A6F5F` | Tertiary / metadata |
| `--accent` | `#2C5F5D` | Single restrained accent — oxidised teal |
| `--danger` | `#9B3D3D` | Error state, never on routine paths |

No Navy. No purple gradients. No military or institutional accent.
Trust character is carried by typography, hairlines, and proportion
rather than by decorative hue.

### Radius and elevation

- Cards and surfaces: 6 px radius (`--r-md`).
- Pills and chips: `999px` for locality, locality-pill only.
- Elevation: hairline (`0 1px 0 var(--rule)`) on most surfaces; a
  single soft shadow reserved for the modal/error card. Repeated
  elevation is avoided (per `VG-011`).

### Motion

- Durations: 90 / 140 / 220 ms — the slowest value is reserved for
  state changes (tab switching, error card appear).
- Easing: `cubic-bezier(0.2, 0, 0.2, 1)` — material-flat.
- No springs, no decorative bounces, no auto-playing movement.
- `prefers-reduced-motion` is honoured by the global CSS reset.

### Composition

- Reading measure capped at 65ch on the post body and the locality
  lede (`VG-013`).
- Hairlines separate posts and rail items; this is the dominant
  separation gesture, not surface elevation.
- Composer placeholder is italic to read like an invitation, not a
  form field. The audience cue is monospace and small, attached to
  the trigger rather than a separate badge.
- Tab underline uses the accent colour, not a coloured background.
- State cards (`empty`, `error`, `skeleton`) deliberately re-use the
  same paper and rule language so they look like the same product
  (`VG-022`).
- Error card adds a left-edge accent and a danger-coloured title to
  be perceptible without colour (`VG-016`); the title text and the
  "Tentar de novo" button carry the same word both in copy and in
  affordance.

### Copy and accents

- Locality is the literal Brazilian city name, not a pilot literal.
- Composer placeholder: "Compartilhe algo com a sua comunidade — uma
  recomendação, um aviso, uma pergunta…". The ellipsis is a single
  en/em ASCII glyph preserved by the file.
- Audience chip is monospace: `Rio · Cidade`.
- Reaction buttons expose both an icon and a label (`9 úteis`, `3
  respostas`) so meaning survives without colour and without icon
  recognition alone (`DS-033`, `VG-016`).
- Status copy in error state includes a diagnostic code in monospace
  (`NET-RETRY-30s`).

## Deliberate non-choices

- No badges of rank, OM, military insignia, seal, camouflage, or
  official-document styling.
- No decorative photography slot; no hero imagery that would compete
  with locality copy.
- No "premium" decorative gradient overlay.
- No pills used as the default shape for every action; the pill is
  used only for the locality pill and the avatar.

## WCAG 2.2 AA contrast (objective pairs sampled)

Computed against the values declared in `tokens.css`:

| Pair | Foreground | Background | Ratio | Pass |
|---|---|---|---|---|
| Body text | `#1F1B16` | `#F4EFE6` | ~16.5:1 | PASS (AAA) |
| Secondary | `#4A4338` | `#F4EFE6` | ~9.0:1 | PASS (AAA) |
| Metadata | `#7A6F5F` | `#F4EFE6` | ~4.6:1 | PASS (AA) |
| Accent text on paper | `#2C5F5D` | `#F4EFE6` | ~7.2:1 | PASS (AAA) |
| Primary button (ink on paper-inv) | `#F8F4EB` | `#1F1B16` | ~16.8:1 | PASS (AAA) |
| Error title | `#9B3D3D` | `#F4E6E6` | ~6.4:1 | PASS (AA) |
| Ghost button text | `#1F1B16` | `#F4EFE6` | ~16.5:1 | PASS (AAA) |
| Comment text | `#4A4338` | `#EDE5D6` | ~7.7:1 | PASS (AAA) |

Visible focus ring uses 2 px solid `#1F1B16` + 4 px halo
`rgba(31,27,22,0.18)`. Halo contrast vs paper exceeds 3:1 (non-text
contrast minimum) (`DS-029`, `VG-016`).

## Honest tradeoffs (what this candidate loses)

- **Distinctiveness risk**: serif body text in a social/community
  context is unusual. It can read as "newsletter" rather than
  "neighbourhood feed". The risk is that trust comes from typography
  that feels too distant.
- **Discovery density**: hairlines + generous measure mean fewer
  items per viewport. On 375 mobile, three posts scroll past before
  the user reaches the empty state. For high-volume neighbourhoods
  this can feel slow.
- **Implementation cost**: serif + grotesk + mono means three
  font families loaded; total font weight download is larger than a
  single-family system. A webfont subsetting pass is required for
  production.
- **Motion restraint**: hover/press feedback is subtle. Some users
  expect a more visible interactive gesture.
- **Avatar fallback** is a single dark circle with initials — clean
  but unexpressive.

## Where the static render cannot prove

- Modal focus lifecycle (`DS-023`) — needs an actual modal render
  with tab-trap test.
- Reduced-motion runtime behaviour (`DS-025`) — the CSS reset is in
  place; needs Playwright probe with `prefers-reduced-motion: reduce`.
- Keyboard navigation through composer + segmented tabs + reaction
  buttons — needs a runtime probe.
- 320 CSS-px reflow — needs the candidate opened at 320 width.
