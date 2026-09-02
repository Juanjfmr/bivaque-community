// Bivaque's single token source is tokens.json. The web stylesheet is generated
// from it; native consumes nativeTokens below. The public objects preserve the
// legacy adapter while new code reads semantic/component roles.
import source from "./tokens.json"

export const primitives = source.primitive
export const semanticTokens = source.semantic
export const componentTokens = source.component

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
  surfaceSubtle: primitive("terra-100"),
  // CSS may use color-mix; React Native receives the same primitive with its
  // documented hairline alpha resolved here, without a duplicated color value.
  border: hexWithAlpha(primitive("ink-900"), 0.14),
  controlBorder: primitive("petrol-700"),
  foreground: primitive("ink-900"),
  muted: primitive("ink-700"),
  accent: primitive("terra-700"),
  accentForeground: primitive("paper-0"),
  danger: primitive("rose-700"),
  focus: primitive("petrol-700"),
  focusInner: primitive("paper-0"),
  focusOuter: primitive("petrol-700"),
} as const

// Compatibility adapter for existing consumers. Do not use it for new UI.
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
