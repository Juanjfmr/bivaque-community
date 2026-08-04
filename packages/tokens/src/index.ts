// Bivaque design tokens — DESIGN_SPEC.md §1 is the source of truth.
// Every value here is mirrored as a CSS custom property in apps/web/app/globals.css;
// keep the two in sync. Components must read tokens (var(--…) or brandTokens), never
// raw colors.
export const brandTokens = {
  productName: "Bivaque",
  color: {
    background: "oklch(0.985 0.008 96)",
    foreground: "oklch(0.205 0.018 72)",
    surface: "oklch(1 0 0)",
    accent: "oklch(0.48 0.115 155)",
    accentForeground: "oklch(0.985 0.008 96)",
    // Cards above the page background.
    surfaceRaised: "oklch(1 0 0)",
    // Inset areas (composer field, empty states).
    surfaceSunken: "color-mix(in oklch, oklch(0.985 0.008 96) 95%, oklch(0.205 0.018 72) 5%)",
    // Hairlines; replaces the inlined color-mix borders.
    border: "color-mix(in oklch, oklch(0.205 0.018 72) 12%, transparent)",
    // Secondary text; holds ≥ 4.5:1 on --surface.
    muted: "oklch(0.5 0.02 72)",
    // 12% accent tint for selected chips and active nav.
    accentSoft: "color-mix(in oklch, oklch(0.48 0.115 155) 12%, transparent)",
    danger: "oklch(0.6532 0.2328 25.74)",
    dangerSoft: "color-mix(in oklch, oklch(0.6532 0.2328 25.74) 15%, transparent)",
    warning: "oklch(0.7819 0.1585 72.33)",
    success: "oklch(0.7329 0.1935 150.81)",
    // Floating surface (HeroUI v3 semantics: modal dialog, popovers, menus).
    overlay: "oklch(1 0 0)",
    // Modal scrim. DESIGN_SPEC §1 names this role "--overlay", but HeroUI v3 reserves
    // --overlay for the floating surface, so the scrim lives in --backdrop.
    backdrop: "color-mix(in oklch, oklch(0.205 0.018 72) 45%, transparent)",
  },
  // Shadows mix against the foreground color, never raw black.
  elevation: {
    0: "none",
    1: "0 1px 2px color-mix(in oklch, oklch(0.205 0.018 72) 10%, transparent), 0 1px 3px color-mix(in oklch, oklch(0.205 0.018 72) 8%, transparent)",
    2: "0 2px 4px color-mix(in oklch, oklch(0.205 0.018 72) 10%, transparent), 0 8px 16px color-mix(in oklch, oklch(0.205 0.018 72) 12%, transparent)",
    3: "0 4px 8px color-mix(in oklch, oklch(0.205 0.018 72) 12%, transparent), 0 16px 40px color-mix(in oklch, oklch(0.205 0.018 72) 18%, transparent)",
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
  radius: {
    sm: "0.5rem",
    base: "0.75rem",
    lg: "1rem",
    full: "9999px",
  },
  // Nothing below 12px; body line-height 1.5+, headings 1.2 (see globals.css).
  text: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
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
} as const
