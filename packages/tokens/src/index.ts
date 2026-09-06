// Bivaque's single token source is tokens.json. The web stylesheet is generated
// from it; native consumes nativeTokens below. The public objects preserve the
// legacy adapter while new code reads semantic/component roles.
import source from "./tokens.json"

export const primitives = source.primitive
export const semanticTokens = source.semantic
export const componentTokens = source.component

// Permanent adapter for the HeroUI stylesheet. Keep these library-facing names stable;
// product code should prefer semanticTokens/componentTokens for its own visual decisions.
export const vendorThemeTokens = source.web.aliases

// Typography roles are semantic contracts backed by primitive measurements.
// Keep this adapter data-only so the web and audit tooling consume the same source.
export const typographyTokens = {
  display: {
    fontSize: source.semantic["typography-display-size"],
    fontWeight: source.semantic["typography-display-weight"],
    lineHeight: source.semantic["typography-display-line-height"],
    letterSpacing: source.semantic["typography-display-letter-spacing"],
  },
  pageTitle: {
    fontSize: source.semantic["typography-page-title-size"],
    fontWeight: source.semantic["typography-page-title-weight"],
    lineHeight: source.semantic["typography-page-title-line-height"],
    letterSpacing: source.semantic["typography-page-title-letter-spacing"],
  },
  sectionTitle: {
    fontSize: source.semantic["typography-section-title-size"],
    fontWeight: source.semantic["typography-section-title-weight"],
    lineHeight: source.semantic["typography-section-title-line-height"],
    letterSpacing: source.semantic["typography-section-title-letter-spacing"],
  },
  cardTitle: {
    fontSize: source.semantic["typography-card-title-size"],
    fontWeight: source.semantic["typography-card-title-weight"],
    lineHeight: source.semantic["typography-card-title-line-height"],
    letterSpacing: source.semantic["typography-card-title-letter-spacing"],
  },
  body: {
    fontSize: source.semantic["typography-body-size"],
    fontWeight: source.semantic["typography-body-weight"],
    lineHeight: source.semantic["typography-body-line-height"],
    letterSpacing: source.semantic["typography-body-letter-spacing"],
  },
  label: {
    fontSize: source.semantic["typography-label-size"],
    fontWeight: source.semantic["typography-label-weight"],
    lineHeight: source.semantic["typography-label-line-height"],
    letterSpacing: source.semantic["typography-label-letter-spacing"],
  },
  meta: {
    fontSize: source.semantic["typography-meta-size"],
    fontWeight: source.semantic["typography-meta-weight"],
    lineHeight: source.semantic["typography-meta-line-height"],
    letterSpacing: source.semantic["typography-meta-letter-spacing"],
  },
  readingMeasure: source.semantic["typography-reading-measure"],
} as const

const primitive = (name: keyof typeof primitives) => primitives[name]
const semantic = (name: keyof typeof semanticTokens) => semanticTokens[name]

const hexWithAlpha = (hex: string, alpha: number) => {
  const value = hex.replace("#", "")
  const channels =
    value.length === 3
      ? value
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : value
  const rgb = [0, 2, 4].map((index) => Number.parseInt(channels.slice(index, index + 2), 16))
  return `rgba(${rgb.join(", ")}, ${alpha})`
}

// React Native consumes resolved primitive/semantic values; CSS syntax never
// crosses this boundary. Values are derived, not duplicated in a native list.
export const nativeTokens = {
  canvas: primitive("paper-50"),
  surface: primitive("paper-0"),
  surfaceSunken: primitive("paper-100"),
  surfaceSubtle: primitive("pine-100"),
  // CSS may use color-mix; React Native receives the same primitive with its
  // documented hairline alpha resolved here, without a duplicated color value.
  border: hexWithAlpha(primitive("ink-900"), 0.14),
  controlBorder: primitive("ink-700"),
  foreground: primitive("ink-900"),
  muted: primitive("ink-700"),
  accent: primitive("pine-700"),
  accentForeground: primitive("paper-0"),
  // Estados da ação primária. O nativo não tem :hover, mas tem pressionado e
  // desabilitado; derivá-los aqui evita que cada tela invente um tom próprio.
  accentPressed: primitive("pine-pressed"),
  accentDisabled: primitive("pine-disabled"),
  danger: primitive("rose-700"),
  focus: primitive("petrol-700"),
  focusInner: primitive("paper-0"),
  focusOuter: primitive("petrol-700"),
} as const

// Compatibility adapter for native/metadata consumers. Web visual decisions belong to the
// semantic/component layers; this object remains public for existing clients.
export const brandTokens = {
  productName: "Bivaque",
  color: {
    background: nativeTokens.canvas,
    foreground: nativeTokens.foreground,
    surface: nativeTokens.surface,
    accent: nativeTokens.accent,
    accentForeground: nativeTokens.accentForeground,
    surfaceRaised: nativeTokens.surface,
    surfaceSunken: nativeTokens.surfaceSunken,
    surfaceSubtle: nativeTokens.surfaceSubtle,
    border: nativeTokens.border,
    muted: nativeTokens.muted,
    accentSoft: nativeTokens.surfaceSubtle,
    danger: nativeTokens.danger,
    dangerSoft: primitive("rose-100"),
    warning: primitive("amber-700"),
    success: primitive("leaf-700"),
    overlay: nativeTokens.surface,
    backdrop: semantic("backdrop"),
  },
  elevation: {
    0: semantic("elevation-flat"),
    1: semantic("elevation-raised"),
    2: semantic("elevation-raised"),
    3: semantic("elevation-overlay"),
  },
  space: {
    0: primitive("space-0"),
    1: primitive("space-1"),
    2: primitive("space-2"),
    3: primitive("space-3"),
    4: primitive("space-4"),
    5: primitive("space-5"),
    6: primitive("space-6"),
    8: primitive("space-8"),
    10: primitive("space-10"),
    12: primitive("space-12"),
    16: primitive("space-16"),
  },
  radius: {
    sm: primitive("radius-6"),
    base: primitive("radius-10"),
    lg: primitive("radius-14"),
    full: primitive("radius-full"),
  },
  text: {
    xs: primitive("text-meta"),
    sm: primitive("text-label"),
    base: primitive("text-body"),
    lg: primitive("text-lg"),
    xl: primitive("text-section-title"),
    "2xl": primitive("text-2xl"),
    "3xl": primitive("text-page-title"),
  },
  motion: {
    duration: {
      instant: primitive("motion-fast"),
      fast: primitive("motion-fast"),
      base: primitive("motion-base"),
      slow: primitive("motion-slow"),
    },
    ease: {
      out: primitive("ease-out"),
      in: primitive("ease-in"),
      spring: primitive("ease-out"),
    },
  },
  secondaryAccent: nativeTokens.focus,
} as const
