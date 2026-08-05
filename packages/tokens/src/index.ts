// Bivaque design tokens — DESIGN_SPEC.md §1 is the source of truth.
// Every value here is mirrored as a CSS custom property in apps/web/app/globals.css;
// keep the two in sync. Components must read tokens (var(--…) or brandTokens), never
// raw colors.
//
// Palette: Navy Professional — authority + trust for a verified federal-military
// invite-only community.
export const brandTokens = {
  productName: "Bivaque",
  color: {
    background: "#F8FAFC", // slate-50 — page background
    foreground: "#020617", // slate-950 — primary text
    surface: "#FFFFFF", // white — card surface
    accent: "#1E3A8A", // blue-900 — primary action / focus / link
    accentForeground: "#FFFFFF",
    // Cards above the page background.
    surfaceRaised: "#FFFFFF",
    // Inset areas (composer field, empty states).
    surfaceSunken: "color-mix(in oklch, #F8FAFC 95%, #020617 5%)",
    // Subtle neutral fills (avatar initials, chips, hover rows).
    surfaceSubtle: "color-mix(in oklch, #020617 8%, transparent)",
    // Hairlines; replaces the inlined color-mix borders.
    border: "color-mix(in oklch, #020617 12%, transparent)",
    // Secondary text; holds ≥ 4.5:1 on --surface.
    muted: "#475569", // slate-600
    // 12% accent tint for selected chips and active nav.
    accentSoft: "color-mix(in oklch, #1E3A8A 12%, transparent)",
    danger: "#DC2626", // red-600
    dangerSoft: "color-mix(in oklch, #DC2626 15%, transparent)",
    warning: "#D97706", // amber-600
    success: "#059669", // emerald-600
    // Floating surface (HeroUI v3 semantics: modal dialog, popovers, menus).
    overlay: "#FFFFFF",
    // Modal scrim. DESIGN_SPEC §1 names this role "--overlay", but HeroUI v3 reserves
    // --overlay for the floating surface, so the scrim lives in --backdrop.
    backdrop: "color-mix(in oklch, #020617 45%, transparent)",
  },
  // Shadows mix against the foreground color, never raw black.
  elevation: {
    0: "none",
    1: "0 1px 2px color-mix(in oklch, #020617 10%, transparent), 0 1px 3px color-mix(in oklch, #020617 8%, transparent)",
    2: "0 2px 4px color-mix(in oklch, #020617 10%, transparent), 0 8px 16px color-mix(in oklch, #020617 12%, transparent)",
    3: "0 4px 8px color-mix(in oklch, #020617 12%, transparent), 0 16px 40px color-mix(in oklch, #020617 18%, transparent)",
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
  // Secondary blue for hover/highlights and second-tier CTAs (e.g. "Entrar"
  // on group cards). Surfaces read --accent (blue-900) as the dominant action.
  secondaryAccent: "#3B82F6", // blue-500
} as const
