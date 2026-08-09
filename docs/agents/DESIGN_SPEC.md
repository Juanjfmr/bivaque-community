# DESIGN_SPEC — Bivaque Community

Reference product: **Nextdoor**. Copy its *interaction architecture* — feed density, card
anatomy, compose entry points, locality framing, discovery chips. Never copy its brand:
no Nextdoor colors, logo, illustrations, copy, or asset files. Bivaque is a private,
verification-gated network for verified federal military, Veterans and pensioners in Manaus —
the tone is sober and institutional, not consumer-playful.

---

## 1. Token system (extend `packages/tokens` + `apps/web/app/globals.css`)

Everything visual reads from tokens. A raw hex or `rgb()` in a component is a defect
(the audit flags `hardcoded-color`).

### Color

Palette: **Navy Professional** — authority + trust for a verified federal-military
verification-gated community. Sober and institutional, not consumer-playful.

| Token | Value | Purpose |
| --- | --- | --- |
| `--background` | `#F8FAFC` (slate-50) | page background |
| `--foreground` | `#020617` (slate-950) | primary text |
| `--surface` | `#FFFFFF` | card surface |
| `--accent` | `#1E3A8A` (blue-900) | primary action / focus / link |
| `--accent-foreground` | `#FFFFFF` | text on `--accent` |
| `--accent-soft` | `color-mix(in oklch, var(--accent) 12%, transparent)` | selected chips, active nav |
| `--secondary-accent` | `#3B82F6` (blue-500) | secondary CTAs, hover highlights |
| `--surface-raised` | `#FFFFFF` | cards above the page background |
| `--surface-sunken` | `color-mix(in oklch, var(--background) 95%, var(--foreground) 5%)` | inset areas (composer field, empty states) |
| `--surface-subtle` | `color-mix(in oklch, var(--foreground) 8%, transparent)` | avatar initials, chips, hover rows |
| `--border` | `color-mix(in oklch, var(--foreground) 12%, transparent)` | hairlines |
| `--muted` | `#475569` (slate-600) | secondary text; must hold 4.5:1 on `--surface` |
| `--danger` | `#DC2626` (red-600) | destructive + report affordances |
| `--danger-soft` | `color-mix(in oklch, var(--danger) 15%, transparent)` | destructive bg |
| `--warning` | `#D97706` (amber-600) | moderation / verification states |
| `--success` | `#059669` (emerald-600) | moderation / verification states |
| `--backdrop` | `color-mix(in oklch, var(--foreground) 45%, transparent)` | modal scrim (HeroUI reserves `--overlay` for the floating surface) |
| `--focus` | `var(--accent)` | focus ring |
| `--link` | `var(--accent)` | hyperlinks |

All colors must hold 4.5:1 against their background surface (3:1 for ≥24px or
≥18.66px bold). Components must read tokens (`var(--…)` or `brandTokens`), never raw
colors.

### Elevation

`--elevation-0` (flat, border only) → `--elevation-1` (card) → `--elevation-2` (sheet/menu)
→ `--elevation-3` (modal). Shadows use `color-mix` against `--foreground`, never black.

### Spacing & radius

4px scale: `--space-1` 4 → `--space-2` 8 → `--space-3` 12 → `--space-4` 16 → `--space-6` 24
→ `--space-8` 32 → `--space-12` 48. Radius: `--radius-sm` .5rem, `--radius` .75rem,
`--radius-lg` 1rem, `--radius-full` 9999px.

### Typography

`--text-xs` 12 / `--text-sm` 14 / `--text-base` 16 / `--text-lg` 18 / `--text-xl` 20 /
`--text-2xl` 24 / `--text-3xl` 30. Nothing below 12px. Body line-height 1.5+; headings 1.2.

### Motion

| Token | Value | Used by |
| --- | --- | --- |
| `--duration-instant` | 100ms | color/opacity on hover, focus ring |
| `--duration-fast` | 160ms | press feedback, chip selection, icon morph |
| `--duration-base` | 240ms | card enter, accordion, tab indicator |
| `--duration-slow` | 320ms | sheets, modals, page transitions |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | anything entering |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | anything leaving |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | press release, reaction pop |

The `prefers-reduced-motion` block in `globals.css` already zeroes durations — keep it,
and never encode meaning in motion alone (no state that is only communicated by movement).

---

## 2. Motion & microinteraction inventory

Every interactive element needs a visible state change under 200ms. The audit flags
`no-transition` on anything interactive with no transition or animation.

| Element | Interaction |
| --- | --- |
| Button | hover: surface lift + 1.5% darken · press: `scale(0.97)` `--duration-fast` `--ease-spring` · loading: label crossfades to inline spinner, width stays fixed |
| Bottom nav tab | active icon fills (outline → solid) over `--duration-fast`; indicator slides between tabs with a shared-layout transition; press ripple stays inside the 44px target |
| Feed card | mount: fade + 8px rise, staggered 40ms per card, capped at 6 · hover (pointer only): `--elevation-1` → `--elevation-2` |
| Reaction / RSVP | optimistic toggle: icon pops `scale(1.2) → 1` on `--ease-spring`, count number slides up, tint fills; server failure reverts with a shake + toast |
| Composer | expands from a one-line "No que você está pensando?" field to full editor at `--duration-base`; character counter turns `--warning` at 90%, `--danger` at 100% |
| Chip / filter | selection fills with `--accent-soft`, border tightens, `--duration-fast` |
| Modal / sheet | scrim fades `--duration-fast`; panel rises 24px + fades `--duration-slow` `--ease-out`. Mobile = bottom sheet with a drag handle; ≥768px = centered dialog |
| Skeleton | shimmer sweep 1.4s linear infinite, `--surface-sunken` base. Skeletons must match the real card's box so nothing reflows on load |
| Toast | slides in from bottom above the nav, auto-dismiss 4s, pauses on hover, swipe/`Esc` to dismiss |
| Pull-to-refresh | mobile feed: elastic pull, spinner scales with distance, snaps back on release |
| Route change | `loading.tsx` per segment renders the skeleton — never a blank screen or a bare spinner |

---

## 3. Screen specs

Layout rule for every screen: single column ≤ 640px content width on mobile/tablet;
at ≥1024px a two-column grid — content (max 640px) + a 320px sticky right rail. The
bottom nav is mobile/tablet only; at ≥1024px it becomes a left sidebar.

### 3.1 `/login`
Centered card on `--background`. Wordmark, one-line value prop, Google OAuth button,
divider "ou", e-mail field + magic link. Magic-link success replaces the form with an
inline "Verifique seu e-mail" state (no alert box). Verification-gated note in the footer.

### 3.2 `/consent` and `/onboarding`
Multi-step with a top progress bar (segments, not percent) and per-step slide transition
(forward: 24px left; back: 24px right). CPF field masks as typed and **never** echoes
back after submit. Verification wait state is an indeterminate progress with reassuring
copy, not a spinner alone. Failure states are specific and offer the waitlist path.

### 3.3 `/community` — the feed (highest-fidelity screen)
- **Locality header**: "Manaus, AM" with member count; sticky under the app header.
- **Composer entry**: avatar + collapsed input + attachment/event/recommendation shortcuts.
- **Sort control**: segmented "Recentes / Relevantes" mapping to the existing `feed_posts`
  `p_order` argument. Changing sort crossfades the list; it does not blank it.
- **Post card anatomy**: avatar → display name → locality + relative time → overflow menu
  (report) · body (4-line clamp + "Ver mais") · optional media · reaction row
  (react, comment count, share) · comment preview (2 most recent) + inline reply field.
- **States**: skeleton (3 cards) · empty ("Seja o primeiro a publicar" + composer CTA) ·
  error (retry button, message never leaks a raw Postgres error) · end-of-feed marker.
- **Right rail** ≥1024px: upcoming events, active groups, community guidelines.

### 3.4 `/groups`
Grid of group cards (cover, name, member count, privacy badge). Tabs "Meus grupos /
Descobrir". Private groups show a lock and a "Solicitar entrada" button whose pending
state persists. Group detail: cover header collapsing on scroll, tab bar
(Publicações / Membros / Sobre), moderation actions gated to moderators only.

### 3.5 `/events`
Date-grouped list with sticky date headers. Card: date block (day + month), title, venue
line, attendee avatars, RSVP segmented control (Vou / Talvez / Não vou) with optimistic
update. **Private venues render only for confirmed attendees** — enforced server-side;
the UI must not fetch-then-hide. Detail view: hero photo, map placeholder, description,
attendee list, share.

### 3.6 `/recommendations`
Category chip row (horizontally scrollable, snap). Cards show category icon, business
name, recommender name, blurb, and helpful count. Search field with debounced filtering
and a "nenhum resultado" empty state that keeps the query visible.

### 3.7 `/messages`
Two-pane at ≥1024px (list + thread), stacked with slide navigation on mobile. Thread list:
avatar, name, message preview, relative time, unread dot. Thread: date separators,
grouped consecutive bubbles, own messages accent-tinted and right-aligned, send button
enables only on non-empty input, optimistic send with a pending tick. Contextual-DM rules
(a thread requires a shared context) surface as an explanatory empty state, never a raw
permission error.

### 3.8 `/notifications`
Grouped "Hoje / Esta semana / Anteriores". Unread items carry an `--accent-soft` background
that fades out `--duration-slow` once read. "Marcar todas como lidas" in the header.

### 3.9 `/profile` — **does not exist yet; the bottom nav already links to it**
Header: avatar, display name, locality, member-since. Verified members show only the
internal trust state the schema allows — **never a public verification badge, rank,
military organization, or address**. Tabs: Publicações / Eventos / Configurações.
Settings: notification preferences, privacy visibility, family invitations, sign out.

---

## 4. Accessibility gates (all enforced by `scripts/visual/capture.mjs`)

- 44×44 CSS px minimum for every interactive target.
- Text contrast ≥ 4.5:1 (≥ 3:1 for ≥24px or ≥18.66px bold).
- Exactly one `<h1>` per screen; heading levels never skip.
- Every control has an accessible name; every `<img>` has `alt`.
- Visible `:focus-visible` ring using `--focus`, offset 2px — never `outline: none`.
- Modals trap focus, close on `Esc`, and restore focus to the trigger.
- Live regions announce optimistic actions (`aria-live="polite"` on toasts and counts).
- No horizontal page scroll at 375, 768, or 1440.
