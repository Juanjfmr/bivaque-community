# QWEN_BUILD_PROMPT — Bivaque Community

Paste everything below the divider into opencode as the opening message. The model is
expected to be **Qwen 3.8 Max** (vision-capable) with the full opencode tool/skill surface
available.

> **The two halves of review.** `scripts/visual/capture.mjs` produces screenshots *and* a
> deterministic audit, and they are not redundant. The audit owns what is measurable —
> contrast ratios, 44px targets, horizontal overflow, missing transitions, hardcoded colors.
> Your eyes own what is not — hierarchy, rhythm, balance, density, whether a screen feels
> finished. Neither one alone closes an iteration. Read the PNGs; do not paraphrase the
> audit and call it a visual review.

---

## MISSION

You are implementing **Bivaque Community** end to end — backend and frontend — in
`C:\Users\juana\bivaque-community`. It is a private, invite-only network for verified
federal military, Veterans and military pensioners, piloted in Manaus (AM). Server-rendered
Next.js 16 on Supabase.

The bar is **premium product quality**: polished visual system, real transitions, real
microinteractions, complete loading/empty/error states, and accessibility that passes an
audit — not a functional prototype.

## READ FIRST (in this order, before writing any code)

1. `AGENTS.md` — repo contracts. These are enforced by tests; breaking one fails CI.
2. `docs/agents/DESIGN_SPEC.md` — the design language, token system, motion spec, and the
   per-screen specification you are building against.
3. `docs/PILOT_RUNBOOK.md`.
4. The screen you are about to touch, plus the migration that backs it in
   `supabase/migrations/` and its pgTAP test in `supabase/tests/`.

## HARD CONSTRAINTS — violating any of these is a failed iteration

- `pnpm` is not on PATH. Every command runs as `npx pnpm@11.18.0 <script>`.
- **HeroUI v3 is the only component library.** No shadcn, Radix, Headless UI, Framer
  Motion component wrappers, or any new UI dependency. Motion is CSS/Web Animations API
  or HeroUI's own primitives. A scope test asserts this.
- Next.js stays on the **server runtime**. `output: "export"` is prohibited.
- Biome style: double quotes, no semicolons, 2-space indent, lineWidth 100. `noExplicitAny`,
  `noNonNullAssertion`, `noParameterAssign`, `useImportType` are errors.
- Never edit an applied migration. New schema = `npx pnpm@11.18.0 exec supabase migration new <name>`.
- Types are generated for the `public` schema only — never the `private` trust schema.
- **Never persist or render**: raw CPF, Portal da Transparência payload, military
  organization, rank, residential address, documents, or a public verification badge.
  Portal's `reformado` maps to internal `veteran` only.
- Portal integration is server-side only; the API key is an env secret, never logged.
- No secrets, credentials, or `.env` content in any commit.
- Files stay under 500 lines. Split components before crossing it.
- Delete `playwright-report/` and `test-results/` before running lint locally — otherwise
  `biome check .` scans them and fails.

## CURRENT STATE (verified, do not re-derive)

**Backend is largely complete**: 17 migrations covering locality/profile foundation, the
`private` trust schema, forced RLS on every table, authorization helpers, community feed,
groups + moderation, recommendations, events + RSVP, personal notifications, contextual DM
abuse controls, reports, and group-event scoping. 26 pgTAP suites cover the allow/deny
matrix. Treat the schema as the source of truth and extend it only when a screen genuinely
needs data that does not exist.

**Frontend is functional but unpolished.** Pages exist for `/login`, `/consent`,
`/onboarding`, `/community`, `/groups`, `/events`, `/recommendations`, `/messages`,
`/notifications`. What is missing or weak:

- `/profile` **does not exist** — the bottom nav links to a dead route.
- No motion system at all. No `transition` on interactive elements. No page transitions.
- Inline `style={{ backgroundColor: brandTokens.color.accent }}` instead of tokens
  (see `apps/web/app/community/page.tsx`, `app-shell.tsx`).
- Token set is 5 colors and one radius. No spacing scale, elevation, typography scale,
  or motion tokens.
- Loading states are bare text ("Carregando publicacoes..." — also missing its accent).
  No skeletons, no `loading.tsx` per segment.
- Empty states and error states are unstyled divs; errors leak raw Supabase messages.
- Layouts are mobile-only in practice; no desktop rail or sidebar treatment.
- Zero `loading.tsx` / `error.tsx` / `not-found.tsx` segment files.

## THE LOOP

Work **one backlog item at a time**. Never batch multiple screens into one iteration.

```
PLAN → BUILD → VERIFY → SEE → JUDGE → FIX → (repeat until clean) → COMMIT → next item
```

**1. PLAN.** State the item, the files you will touch, and the acceptance criteria pulled
from `DESIGN_SPEC.md`. If a permission or denial path is involved, name the positive test
and the negative test you will write. Implementation and its tests are ONE unit of work.

**2. BUILD.** Implement the item. Tokens before components; components before screens.
Surgical edits — do not refactor what is not broken.

**3. VERIFY.** Run the gates:

```bash
npx pnpm@11.18.0 lint && npx pnpm@11.18.0 typecheck && npx pnpm@11.18.0 test
```

Schema changes additionally need Docker up plus:

```bash
npx pnpm@11.18.0 exec supabase start && npx pnpm@11.18.0 db:reset && npx pnpm@11.18.0 test:db && npx pnpm@11.18.0 db:lint
```

**4. SEE.** Capture and audit the real rendered app:

```bash
node scripts/visual/loop.mjs
```

This runs lint → typecheck → test → build, boots the production server, screenshots every
route at 375 / 768 / 1440, and writes to `.visual/<run>/`:

- `shots/<route>--<viewport>--fold.png` — the first screen, at viewport height
- `shots/<route>--<viewport>--full.png` — the whole page, scroll rhythm included
- `report.md` / `report.json` — the deterministic audit
- `ITERATION.md` — the gate table and the verdict

Use `node scripts/visual/loop.mjs --fast` against an already-running dev server for tight
iteration; run the full command before declaring an item done.

Authenticated screens need credentials, otherwise gated routes capture their signed-out
state (`report.md` says which). Export before running:

```bash
export BIVAQUE_VISUAL_EMAIL=...        # a seeded LOCAL user, never a real person
export BIVAQUE_VISUAL_PASSWORD=...
```

**5. JUDGE.** This step is done with your eyes, and it is not optional.

Load the images — six per screen you touched: `--fold` and `--full` at 375, 768, and 1440.
Then, in this order:

1. **Fold first, one viewport at a time.** For each fold shot, before comparing anything,
   say what you see: where your eye lands first, what the primary action is, what is
   competing with it, what looks unfinished. If a screen reads as a wall of text or a large
   empty void, that is the finding — write it down.
2. **Full shots for rhythm.** Does vertical spacing repeat on a scale, or drift? Do cards
   read as distinct objects or merge into a stripe? Where does the page just stop?
3. **Across viewports.** Put the three folds side by side. 375 must not be a squeezed 1440,
   and 1440 must not be a stretched 375 with dead margins. Name any element that only works
   at one width.
4. **Against the previous run.** Compare with the last `.visual/<run>/` for this screen. State
   what visibly improved and what you broke. A change you cannot see is a change you cannot
   claim.
5. **Then read `report.md`** and merge the measured findings into the same list.

Every finding is concrete and located — "the RSVP control at 375 has 12px below the venue
line where the spec calls for 16, and the selected state has no fill" — never a verdict
("looks good", "clean, modern UI"). Write the full list down **before** fixing anything.

Two failure modes to avoid: restating the audit and calling it a visual review, and
declaring a screen good because it renders without errors. Rendering is the floor, not the
bar.

Judge against these, in priority order:

1. **Correctness** — does it render the real data, and do the denial paths still deny?
2. **Hierarchy** — can you find the primary action in under a second?
3. **Rhythm** — does spacing follow the 4px scale, or is it arbitrary?
4. **State completeness** — loading, empty, error, success, and the disabled/pending cases.
5. **Motion** — does every interactive element respond in under 200ms, and does it survive
   `prefers-reduced-motion`?
6. **Density** — Nextdoor-like scannability: does the feed read as a list of distinct
   cards, or as a wall?
7. **Responsiveness** — 375 is not a squeezed 1440, and 1440 is not a stretched 375.

**6. FIX.** Address every high-severity audit finding and every judgment finding. Then go
back to step 3. Do not advance to the next backlog item while `ITERATION.md` says
`KEEP ITERATING`.

**7. COMMIT.** One conventional commit per backlog item
(`feat(profile): …`, `fix(feed): …`, `chore(tokens): …`). Do **not** add a `Co-Authored-By`
trailer. Save the run's `report.md` and the relevant screenshots as evidence under
`.omo/evidence/bivaque-community-pilot/task-<N>-<name>/` (outside this repo).

## BACKLOG — build in this order

Order matters: the foundation items make every later screen cheaper.

1. **Token system.** Extend `packages/tokens/src/index.ts` and `apps/web/app/globals.css`
   with the full color / elevation / spacing / typography / motion sets from
   `DESIGN_SPEC.md` §1. Extract the repeated `color-mix(...)` hairline into `--border`.
2. **Primitives.** A shared `Card`, `Skeleton`, `EmptyState`, `ErrorState`, `Toast`, and
   `PageHeader` under `apps/web/app/components/bivaque/`, all HeroUI-based and
   token-driven. Purge every inline color from existing components.
3. **Motion layer.** Global transition utilities, press/hover states on all interactive
   elements, staggered list entry, and the reduced-motion path.
4. **App shell.** Bottom nav → animated indicator + icon fill; desktop sidebar at ≥1024px;
   real header actions. Segment-level `loading.tsx` / `error.tsx` / `not-found.tsx`.
5. **`/community` feed.** Full spec (§3.3) — composer, sort control, complete card anatomy,
   optimistic reactions, skeleton, empty, error, end-of-feed, desktop right rail.
6. **`/profile`.** New route (§3.9). Respect the privacy rules absolutely: no rank, no
   organization, no address, no public verification badge.
7. **`/events`** (§3.5), including the private-venue rule enforced server-side.
8. **`/groups`** (§3.4), including private-group request flow and moderator-only actions.
9. **`/recommendations`** (§3.6) and **`/messages`** (§3.7).
10. **`/notifications`** (§3.8) and the read-state transition.
11. **Onboarding + consent polish** (§3.2), CPF masking and never echoing it back.
12. **E2E sweep.** Extend `tests/e2e/` so each screen has a happy path and a denial path
    at all three viewport projects.

## REPORTING

After each iteration, output exactly this and nothing else:

```
ITEM: <backlog number and name>
CHANGED: <files>
GATES: lint <pass/fail> · typecheck <p/f> · test <p/f> · build <p/f> · db <p/f/skipped>
AUDIT: <N> findings (<M> high) — <run dir>
SAW: <what the fold shots look like, one line per viewport — 375 / 768 / 1440>
DELTA: <what visibly changed vs the previous run for this screen>
JUDGMENT: <the located findings you wrote before fixing>
FIXED: <what this iteration corrected>
REMAINING: <what is still open on this item>
VERDICT: <ITERATION COMPLETE | KEEP ITERATING>
```

## STOP AND ASK

Stop and ask the human instead of guessing when:

- A screen needs data the schema does not have and adding it would touch the `private`
  trust schema or the privacy rules.
- A design decision would put a verification badge, rank, organization, or address on
  screen in any form.
- A repo contract in `AGENTS.md` appears to block the spec — the contract wins until a
  human changes it.
- Docker/Supabase is unavailable and the item needs `test:db` to be honest.

Never mark an item complete on unverified claims. If a gate did not run, say it did not
run. Evidence before assertions.
