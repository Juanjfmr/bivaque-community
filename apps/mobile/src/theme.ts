// apps/mobile/src/theme.ts
// Tokens RN-friendly derivados de @bivaque/tokens.
//
// @bivaque/tokens foi escrito para CSS/HTML, então usa `rem` para espaço e
// tipografia. React Native StyleSheet aceita apenas números em pixel space e
// aceita hex strings em cores — convertemos os valores rem para px usando
// 16px como base (alinhado com apps/web, que usa o mesmo escalonamento).
//
// Esta é a única divergência honesta em apps/mobile: espaço e tipografia
// passam por aqui. Cores vêm do adaptador nativo, que nunca contém CSS como
// `var()` ou `color-mix()`. Tokens são a fonte de verdade (DESIGN_SYSTEM §5).
import { brandTokens, nativeTokens } from "@bivaque/tokens"

const REM_BASE_PX = 16

const remToPx = (rem: string): number => {
  const value = parseFloat(rem)
  return Number.isFinite(value) ? value * REM_BASE_PX : 0
}

export const bodyLineHeight = (fontSize: number): number => fontSize * 1.5

export const theme = {
  color: {
    background: nativeTokens.canvas,
    surface: nativeTokens.surface,
    surfaceRaised: nativeTokens.surface,
    surfaceSunken: nativeTokens.surfaceSunken,
    surfaceSubtle: nativeTokens.surfaceSubtle,
    border: nativeTokens.border,
    controlBorder: nativeTokens.controlBorder,
    foreground: nativeTokens.foreground,
    muted: nativeTokens.muted,
    accent: nativeTokens.accent,
    accentForeground: nativeTokens.accentForeground,
    accentPressed: nativeTokens.accentPressed,
    accentDisabled: nativeTokens.accentDisabled,
    accentSoft: nativeTokens.surfaceSubtle,
    danger: nativeTokens.danger,
    focus: nativeTokens.focusOuter,
    focusInner: nativeTokens.focusInner,
  },
  // 4px scale, conforme DESIGN_SYSTEM §4.
  space: {
    1: remToPx(brandTokens.space[1]),
    2: remToPx(brandTokens.space[2]),
    3: remToPx(brandTokens.space[3]),
    4: remToPx(brandTokens.space[4]),
    6: remToPx(brandTokens.space[6]),
    8: remToPx(brandTokens.space[8]),
    12: remToPx(brandTokens.space[12]),
  },
  radius: {
    sm: remToPx(brandTokens.radius.sm),
    base: remToPx(brandTokens.radius.base),
    lg: remToPx(brandTokens.radius.lg),
  },
  // Nada abaixo de 12px (DESIGN_SYSTEM §4); body line-height 1.5+.
  text: {
    xs: remToPx(brandTokens.text.xs),
    sm: remToPx(brandTokens.text.sm),
    base: remToPx(brandTokens.text.base),
    lg: remToPx(brandTokens.text.lg),
    xl: remToPx(brandTokens.text.xl),
  },
} as const

export const productName = brandTokens.productName
