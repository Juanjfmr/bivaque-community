# Candidate B — Community Modern · notes

> Status: exploratory. NOT design law. NOT production code.

## Direction

A reading of Bivaque's "community-operated" character (DS-001) through
a contemporary community-app grammar — humanist sans, warm off-white
paper, layered surfaces with subtle but real elevation, a deliberate
terracotta accent. The intent is to feel recognisably social without
becoming gamified or ceremonial. Stats in the locality header and
visual iconography signal that this is a network, not a newsletter.

## Deliberate choices

### Type

- **Humanist sans** — Public Sans at 14–22 px carries UI, body, and
  headings. It is geometrically clean, friendly at small sizes, and
  tested across scripts. Source: Google Fonts, free license, designed
  for public-sector and community interfaces.
- **UI bold** — Inter Tight carries brand wordmark and headings for a
  slight contrast lift.
- **Monospace** — JetBrains Mono for metadata in tabs and stats.

The pairing is sans-only but with weight + size variation rather than
family contrast. The candidate does not use serif.

### Palette

| Token | Value | Use |
|---|---|---|
| `--paper` | `#FAF6EF` | Page background, warm |
| `--surface` | `#FFFFFF` | Card surface (real elevation) |
| `--surface-2` | `#FBF7F0` | Comment / inner surface |
| `--ink` | `#2A1F18` | Primary text |
| `--ink-2` | `#5B4E40` | Secondary text |
| `--accent` | `#C76849` | Terracotta — primary action / link |
| `--accent-soft` | `#F8E4DA` | Selected state, audience chip |
| `--accent-ink` | `#8A3F26` | On-accent text |
| `--danger` | `#B04338` | Error state |

Terracotta is warm but not orange-alert. It carries the "community"
warmth without veering into decorative warmth. Status copy and icons
carry meaning, not colour alone.

### Radius and elevation

- Cards: 14 px radius (`--r-lg`).
- Pills: 999 px (tabs, locality chip, reaction buttons).
- Elevation: three real levels — `elev-1` (subtle resting), `elev-2`
  (hover), `elev-3` (focus / pressed). Shadow values are
  warm-tinted to the ink colour.
- Hover on cards lifts shadow one level (per `VG-024`: motion that
  explains change).
- Hover on primary button lifts 1 px (translateY) + shadow.

### Motion

- Durations: 120 / 180 / 260 ms — slightly more present than A.
- Easing: `cubic-bezier(0.2, 0.7, 0.2, 1)` — ease-out with a small
  overshoot feel.
- Cards animate shadow on hover; primary button translates 1 px up.
- `prefers-reduced-motion` removes all transitions.

### Composition

- Locality header carries stats (1.284 vizinhos · 28 grupos · 9
  eventos esta semana) on a single elevated card. Stats are large,
  tabular-numbers, and read as facts — not decoration.
- Composer has its own elevated surface, with a primary
  audience chip and an icon for media.
- Segmented tabs sit on a paper-2 pill track with an elevated active
  state (`VG-006`: one visual grammar).
- Post cards are real elevated surfaces; the post body breathes
  inside, comments sit on a slightly different inner surface.
- Empty/error states are centred, with an icon above the title. They
  use the same accent system as the rest of the product (`VG-022`).
- Right rail: rail cards elevated; rail-card with accent
  background reserved for the "Boas práticas" callout — accent
  restraint, not accent everywhere.

### Copy and accents

- Locality eyebrow uses the accent: "Sua cidade · 412 vizinhos
  online" — the number is part of the eyebrow, not a stat block.
- Composer placeholder: "No que você está pensando?". The audience
  chip says "Cidade" — short, deliberate.
- Reaction labels (`9 úteis`, `3 respostas`) appear next to the icon
  to support `DS-033`/`VG-016`.
- Error state shows an icon, a danger-coloured title
  ("Conexão perdida"), and a diagnostic code in monospace.

## Deliberate non-choices

- No decorative gradient or glass effect.
- No gamified streaks, badges, or reward chips.
- No "premium" hero illustration.
- Stats are facts about the community, not achievements of the user.

## WCAG 2.2 AA contrast (objective pairs sampled)

| Pair | Foreground | Background | Ratio | Pass |
|---|---|---|---|---|
| Body text | `#2A1F18` | `#FFFFFF` | ~14.6:1 | PASS (AAA) |
| Body text on paper | `#2A1F18` | `#FAF6EF` | ~14.0:1 | PASS (AAA) |
| Secondary | `#5B4E40` | `#FFFFFF` | ~7.5:1 | PASS (AAA) |
| Metadata | `#87766A` | `#FAF6EF` | ~4.6:1 | PASS (AA) |
| Accent text | `#8A3F26` | `#FAF6EF` | ~6.9:1 | PASS (AA) |
| Accent text on accent-soft | `#8A3F26` | `#F8E4DA` | ~4.8:1 | PASS (AA) |
| Primary button (ink-inv on accent) | `#FBF7F0` | `#C76849` | ~4.6:1 | PASS (AA) |
| Error title | `#B04338` | `#FCF1EE` | ~5.2:1 | PASS (AA) |

Visible focus ring: 2 px solid `#C76849` + 4 px halo. The halo
contrast vs paper exceeds 3:1.

## Honest tradeoffs (what this candidate loses)

- **Trust signal density**: stats and icons can read as "growth" /
  "platform" rather than "calm, community-operated". Some users will
  read it as more marketplace-y than Bivaque intends.
- **Elevation cost**: cards on cards can violate `VG-011` if every
  repeated list item carries shadow. Mitigation here is reserved to
  top-level surfaces and not applied to nested rows, but the risk
  remains.
- **Two font families for UI**: Inter Tight is layered on top of
  Public Sans only for the wordmark. A simpler system would use one
  family. Production cost is small but not zero.
- **Tonal warmth**: terracotta + warm paper means the system has a
  narrow room to shift toward a colder, more civic register without
  a re-token. Light/dark theme work is harder than the cool slate in
  Candidate C.
- **The "Boas práticas" rail card uses accent surface**: that is a
  legitimate accent use, but it is the kind of accent-on-accent
  decision that can drift in implementation.

## Where the static render cannot prove

- Modal focus lifecycle (`DS-023`).
- Reduced-motion runtime behaviour (`DS-025`).
- Keyboard semantics for the segmented tab control (current
  implementation uses `role="tab"` + `aria-selected`, but a runtime
  arrow-key probe is needed).
- 320 CSS-px reflow.
- Real-time composer disclosure state changes.
