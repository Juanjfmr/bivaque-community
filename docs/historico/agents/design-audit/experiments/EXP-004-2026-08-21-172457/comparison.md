# EXP-004 — comparison matrix

> Three coherent visual directions for the Bivaque Community product,
> evaluated against the same representative content and the criteria
> listed in `VISUAL_GUIDE.md` §12 (`EXP-004` quality requirement).
>
> This file does not declare a winner. It records the honest tradeoffs
> and the questions the human adjudicator needs answered before any
> `EXP-004` decision gate closes.

## Method

- Same representative content was rendered into each candidate
  (header, locality, composer, 3 posts, comments, empty, error,
  skeleton, segmented tabs, bottom nav, right rail). See
  `candidate-{A,B,C}/index.html`.
- Screenshots in `screenshots/` show 375 / 768 / 1440 for each
  candidate.
- Scoring is qualitative on a 1–5 scale; the rationale column names
  the contract rule or visual evidence that justifies the score.
- The "Tradeoffs" section is intentionally honest about what each
  candidate loses.
- Accessibility is checked against `DS-029` (WCAG 2.2 AA objective
  baseline) and `VG-016` / `DS-033` (state survives without hue).
  Per-candidate contrast pairs are recorded in each `notes.md`.

## Scoring legend

- 5 — clearly defensible against the criterion; evidence in render
  or in the contract.
- 4 — defensible with caveats noted below.
- 3 — average; real tradeoff present.
- 2 — weak on this criterion; needs a deliberate choice to address.
- 1 — fails the criterion.

## Matrix

| Criterion | Source rule(s) | A — Civic Editorial | B — Community Modern | C — Quiet Civic |
|---|---|---|---|---|
| Readability (long-form) | `VG-013`, `DS-031`, `DS-035` | **5** — Newsreader body at 18 px / 65 ch, diacritics preserve shape; PT-BR copy uses `Ã`, `É`, `Ç`, `ª`, `º` correctly. | **4** — Public Sans 15 px / 64 ch is comfortable; sans body is friendly but loses the editorial calm. | **4** — Geist 14 px / 68 ch is precise; mono metadata can compress at narrow widths if not subset. |
| Scanability | `VG-007`, `VG-013`, `DS-032` | **3** — Hairlines + generous measure mean fewer items per viewport; reactions live below each post without a numeric pill. | **5** — Stats in locality header + elevated cards + reaction pills; very scannable; the right rail earns its place. | **5** — Tabular numbers + status dot + monospace neighbourhood chip make every post parseable in one glance; rail-row date tile is the densest scan element of the three. |
| Trust perception | `DS-001`, `DS-005`, `VG-001`, `VG-003` | **5** — Reads as "trusted local paper" rather than "social app"; no military / institutional cues; verification cue carried by typography and rhythm. | **4** — Reads as "community platform"; the warmth is honest but the stats can read as growth/engagement cues. | **3** — Reads as "internal tool" or "data app"; trust character is delivered by precision, not by warmth. The contract requires calm/capable/practical/local — C meets that literally but loses the community warmth. |
| Distinctiveness | `VG-002` | **5** — Serif body in a neighbourhood-feed context is unusual; recognisable without the wordmark. | **3** — Familiar community-app grammar; the terracotta accent is the strongest distinctiveness cue, but the system as a whole is recognisable rather than distinctive. | **4** — Monospace metadata + cool slate is distinctive inside the design-system space; the brand cue comes from precision and tabular numbers. |
| Content resilience | `DS-014`–`DS-019`, `VG-022`–`VG-023` | **4** — Empty / error / skeleton re-use paper and rule language; error uses red title + dashed border to read distinct from empty. Skeleton lines feel editorial. | **5** — Each state has its own icon + title; error card uses a soft danger surface; skeleton lines are soft and animate; all states sit inside the elevated-card grammar. | **4** — State cards add a monospace index label ("FIM", "!") to read as a section; error uses an accent left edge + danger title; the system is spartan but distinguishable. |
| Responsive composition | `DS-011`, `DS-030`, `VG-020`–`VG-021` | **5** — Locality pill in topbar at 375; locality header full at 768+; right rail appears at 1024+; bottom nav on <1024. Recomposes cleanly without squeezing. | **5** — Same breakpoints; stats card recomposes from stacked to side-by-side at 768; cards stay elevated across widths. | **3** — Topnav appears at 768+, hidden at <768, replaced by bottom nav at <1024. This means the **conceptual parent of `Cidade` changes between mobile and tablet** (bottom nav vs topnav) — a real `DS-011` risk that needs an answer. |
| Accessibility (WCAG 2.2 AA) | `DS-029`, `DS-021`, `DS-025`, `DS-033`, `VG-016`, `VG-025` | **5** — Body contrast ~16.5:1; metadata ~4.6:1; state meaning via icon + label + colour; visible focus ring with halo; reduced-motion honoured. | **5** — Body contrast ~14.6:1; primary button ~4.6:1; state meaning via icon + label + colour; visible focus ring with halo. | **5** — Body contrast ~14.8:1; mono metadata at 12 px passes AA; status meaning via icon + label + colour (dot); visible focus ring. |
| Implementation / dependency cost | Phase 6 deletion-resurrection check | **3** — Three font families loaded (Newsreader, Inter Tight, JetBrains Mono); webfont subsetting required; serif body demands quality QA on rendering at small sizes. | **4** — Two font families (Public Sans + Inter Tight) plus JetBrains Mono for metadata; three elevation tiers to maintain; warm palette has a narrower light/dark range. | **5** — Two families (Geist + Geist Mono); no warm colour shift; smallest token surface; mono metadata is the cheapest predictable cross-renderer choice. |

## Cumulative score (descriptive)

The matrix is intentionally not summed into a single ranking. Three
candidates are meant to expose different reads of the contract. But
to make the tradeoffs legible:

- **B leads on scanability and content resilience** — it is the most
  conventional community-app reading and the easiest to scale across
  many surfaces (profile, groups, events, governance).
- **A leads on trust perception and distinctiveness** — it is the
  most defensible reading of "calm, credible, community-operated"
  when the audience is risk-aware or first-time.
- **C leads on implementation cost and tabular precision** — it is
  the most defensible reading of "operational" surfaces (governance,
  dense lists, decision-critical metadata) but the weakest on warmth.

## Tradeoff ledger — what each candidate loses

### A — Civic Editorial

1. **Distinctiveness risk**: serif body in a social/community context
   can read as newsletter. Trust comes from typography that may feel
   distant.
2. **Discovery density**: hairlines + generous measure mean fewer
   items per viewport. High-volume neighbourhoods scroll more.
3. **Implementation cost**: three font families loaded.
4. **Motion restraint**: hover/press feedback is subtle; some users
   expect more visible gesture.

### B — Community Modern

1. **Trust signal density**: stats and icons can read as "growth" /
   "platform" rather than "calm community". The warmth has a
   marketplace flavour.
2. **Elevation cost**: cards on cards can violate `VG-011` if every
   repeated list item carries shadow; reserved here, but the risk
   remains.
3. **Tonal warmth**: terracotta + warm paper limits the room to shift
   to a colder register without a re-token; light/dark theme work
   is harder than C.
4. **Accent-on-accent**: the "Boas práticas" rail card uses accent
   surface — legitimate accent use, but the kind of decision that
   can drift.

### C — Quiet Civic

1. **Personality / warmth**: cool slate + monospace-heavy chrome can
   read as "internal tool". Welcome cue is the weakest of the three.
2. **Locality header density**: no stats. Some neighbourhoods want a
   clear "you are part of a 1,200-person network" cue; C does not
   deliver it.
3. **Responsive IA risk**: topnav at ≥768 vs bottom nav at <1024
   means the **conceptual parent of `Cidade` changes between mobile
   and tablet**, a real `DS-011` exposure that must be resolved
   before any production promotion.
4. **Status dot in metadata**: `● aberto` / `■ informativo` /
   `✓ recomendação` carries meaning without colour but adds three
   small icons per post; can wrap on very narrow viewports.

## Cross-candidate observations

These observations hold across all three candidates and would need to
be addressed regardless of which direction wins:

1. **The 4-container bottom nav is settled by implementation, not by
   design law.** All three candidates ship a 4-item bottom nav
   (Cidade / Comunidade / Grupos / Eu). The contract treats this as
   `EXP-001` (still open), so the IA is preserved for the experiment
   to remain comparable. Any winner must defend or replace it as
   part of `EXP-001`.

2. **State truth is achievable in all three systems**, but they
   diverge on *how much chrome* the empty/error/skeleton states earn.
   A wins on restraint (uses the same chrome), B wins on affordance
   (icons + titles), C wins on spartan clarity (mono index label).

3. **Visible focus rings differ in personality, not in contract.** All
   three pass `DS-029`. The ring is darker in A, accent-coloured in
   B and C, with a halo. The choice between them is a personality
   decision, not an accessibility one.

4. **The right rail at 1440 is the strongest test of `VG-008` and
   `VG-021`**. All three place three rail cards (events, groups,
   best practices). They differ on whether the rail "earns" the space
   or fills it; the matrix rates B highest because the stats card in
   the locality header creates context that the rail then extends.

5. **The composer trigger is structurally identical across the
   three** (avatar + placeholder + audience + optional media). This
   is because `DS-002` / `DS-003` (audience before action; no silent
   widening) constrain the structure regardless of which visual
   system wins. Good signal: the contract held across three
   materially different systems.

## What the human adjudicator needs to decide

These are the questions that close `EXP-004`. None of them has an
objective answer; they are product / brand calls.

1. **Trust register**: does Bivaque want to feel like a local paper
   (A), a community platform (B), or an operational tool (C)? This is
   the highest-leverage question.

2. **Distinctiveness vs familiarity**: how distinctive is the
   product meant to be? A is the most distinctive; B the most
   familiar; C sits in between on a different axis (precision vs
   warmth).

3. **Scanability vs density**: how many items per viewport do we
   optimise for? A is sparsest, B is densest, C is in between.

4. **Welcome register for first-time members**: do we expect first-
   time members to need warmth (B) or precision (C)? A's editorial
   register is somewhere in between.

5. **Implementation budget**: is the cost of three font families (A)
   acceptable in exchange for the editorial register, or is the
   simpler two-family system (C) the right starting point?

6. **Topnav vs locality-context-only IA on tablet**: this is a real
   `DS-011` exposure for C. Do we want a horizontal topnav on tablet,
   or do we want the locality context + composer to carry IA at that
   width?

7. **Accent policy**: which surfaces are allowed to carry the brand
   accent? A: only the tab underline + locality dot. B: locality
   eyebrow + buttons + rail callout. C: only actions, focus rings,
   and the active tab underline.

## What this experiment deliberately did not produce

- No candidate was declared the winner.
- No token was promoted into `packages/tokens/**`.
- No route or component anatomy was selected.
- No exact pixel scale, font weight axis, or shadow tier was
  promoted into `DESIGN_SPEC.md` or `VISUAL_GUIDE.md`.
- No deleted incumbent rule was restored (no Nextdoor imitation,
  no Navy default, no `Manaus, AM` literal, no badge/seal
  ornamentation).
- No production code was written.
- No Next.js surface was touched.

The three HTML files and the screenshots are the entire artefact
surface. Adjudication is out of scope for this folder.
