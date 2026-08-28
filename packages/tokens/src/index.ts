// Bivaque design tokens — DESIGN_SPEC.md §1 is the source of truth.
// Every value here is mirrored as a CSS custom property in apps/web/app/globals.css;
// keep the two in sync. Components must read tokens (var(--…) or brandTokens), never
// raw colors.
//
// Palette: "Papel & Mata". Warm paper, warm ink, forest green, terracotta signal.
//
// Why this and not the previous Navy Professional set: Navy was slate-50/slate-950/
// blue-900 — the literal Tailwind default triad, which is what every SaaS starter
// ships and is why the authenticated product read as generic. It was also never
// selected: DESIGN_SPEC DS-036 (EXP-004) marks palette/type/spacing/radius/elevation/
// motion as an open experiment and says in as many words that "the incumbent Navy/
// system-sans combination is one candidate, not baseline truth".
//
// The values below are not invented either. They are the system the product already
// ships to every visitor in the acquisition funnel — landing, login and onboarding —
// where they had been copy-pasted into three separate CSS modules (--ink / --login-ink
// / --flow-ink). Promoting them here is what makes the member shell continue the
// identity the funnel promises, and retires that triplication (DS-034: shared visual
// roles use semantic tokens, not one-off local values).
//
// Contrast: every text/background pair below is >= 4.5:1 and every solid button pair
// >= 4.5:1, verified numerically rather than by eye (DS-029 / WCAG 2.2 AA).
export const brandTokens = {
  productName: "Bivaque",
  color: {
    background: "#F5F2E9", // warm paper — page background
    foreground: "#17211D", // warm ink — primary text (14.75:1 on paper)
    surface: "#FFFDF7", // paper bright — card surface
    accent: "#245B43", // forest — primary action / focus / link (7.07:1 on paper)
    accentForeground: "#FFFDF7",
    // Cards above the page background.
    surfaceRaised: "#FFFDF7",
    // Inset areas (composer field, empty states).
    surfaceSunken: "#EDE8DA",
    // Subtle neutral fills (avatar initials, chips, hover rows).
    surfaceSubtle: "color-mix(in oklch, #17211D 7%, transparent)",
    // Hairlines; replaces the inlined color-mix borders.
    border: "color-mix(in oklch, #17211D 12%, transparent)",
    // Secondary text; holds >= 4.5:1 on --surface (7.46:1) and on --background (6.78:1).
    muted: "#4A574F",
    // 12% accent tint for selected chips and active nav.
    accentSoft: "color-mix(in oklch, #245B43 12%, transparent)",
    danger: "#A33D26", // terracotta signal (5.77:1 on paper)
    dangerSoft: "color-mix(in oklch, #A33D26 14%, transparent)",
    warning: "#7A5312", // burnt gold, darkened to carry text (6.10:1 on paper)
    success: "#1F6347", // deep forest green (6.39:1 on paper)
    // Floating surface (HeroUI v3 semantics: modal dialog, popovers, menus).
    overlay: "#FFFDF7",
    // Modal scrim. DESIGN_SPEC §1 names this role "--overlay", but HeroUI v3 reserves
    // --overlay for the floating surface, so the scrim lives in --backdrop.
    backdrop: "color-mix(in oklch, #102F25 55%, transparent)",
    // Editorial accents. `forestDeep` is the masthead/inverted surface the landing
    // header already uses; `gold` is decorative only (rules, dividers, marks) and is
    // never asked to carry text — `warning` is the readable member of that family.
    forestDeep: "#102F25",
    gold: "#D7A44C",
    // Terracotta emphasis — the funnel's CTA colour. Deliberately NOT `danger`:
    // "act on this" and "this is destructive" are different roles that happen to
    // be neighbours on the wheel, and sharing one token means retuning
    // destructive UI would repaint the sign-up button.
    signal: "#B4472E",
  },
  // Elevation is deliberately shallow. The previous set leaned on 16-40px ambient
  // shadows, which is what made every list read as cards floating over grey. Here a
  // card is distinguished by its paper surface against the warmer page, plus a
  // hairline; shadow is reserved for things that genuinely float (menus, modals).
  elevation: {
    0: "none",
    1: "0 1px 0 color-mix(in oklch, #17211D 6%, transparent)",
    2: "0 1px 2px color-mix(in oklch, #17211D 8%, transparent), 0 2px 6px color-mix(in oklch, #17211D 6%, transparent)",
    3: "0 4px 8px color-mix(in oklch, #17211D 10%, transparent), 0 16px 40px color-mix(in oklch, #17211D 16%, transparent)",
  },
  // 4px scale.
  space: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    6: "1.5rem",
    8: "2rem",
    12: "3rem",
  },
  // Editorial radii: near-square for content surfaces, pill kept only for controls
  // that are genuinely pill-shaped (chips, avatars). Content no longer uses 12-16px
  // rounding, which reads as app-store card furniture rather than a page.
  radius: {
    sm: "0.25rem",
    base: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  // Nothing below 12px; body line-height 1.5+, headings 1.15 (see globals.css).
  text: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.375rem",
    "2xl": "1.75rem",
    "3xl": "2.25rem",
  },
  // Typography families. The serif carries the identity and is used for headings,
  // the wordmark and pull quotes; the sans is the UI workhorse. Both are self-hosted
  // through next/font — no runtime fetch to a third party, which also keeps the
  // funnel free of an external request tied to a visitor (LGPD).
  font: {
    serif: "var(--font-serif)",
    sans: "var(--font-sans)",
  },
  motion: {
    duration: {
      instant: "100ms",
      fast: "160ms",
      base: "240ms",
      slow: "320ms",
    },
    ease: {
      out: "cubic-bezier(0.16, 1, 0.3, 1)",
      in: "cubic-bezier(0.7, 0, 0.84, 0)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },
  // Second-tier actions and links that should not compete with the forest primary.
  secondaryAccent: "#2C4F62", // muted slate blue (7.81:1 on paper)
} as const
