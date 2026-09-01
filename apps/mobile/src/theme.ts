// apps/mobile/src/theme.ts
// Tokens RN-friendly derivados de @bivaque/tokens.
//
// @bivaque/tokens foi escrito para CSS/HTML, então usa `rem` para espaço e
// tipografia. React Native StyleSheet aceita apenas números em pixel space e
// aceita hex strings em cores — convertemos os valores rem para px usando
// 16px como base (alinhado com apps/web, que usa o mesmo escalonamento).
//
// Esta é a única divergência honesta em apps/mobile: cores vêm direto do
// pacote compartilhado, espaço e tipografia passam por aqui. Tokens são a
// fonte de verdade (DESIGN_SPEC.md §0, DS-034); este módulo é só o tradutor
// para o runtime nativo.
import { brandTokens } from "@bivaque/tokens"

const REM_BASE_PX = 16

const remToPx = (rem: string): number => {
  const value = parseFloat(rem)
  return Number.isFinite(value) ? value * REM_BASE_PX : 0
}

export const theme = {
  color: {
    background: brandTokens.color.background,
    surface: brandTokens.color.surface,
    surfaceRaised: brandTokens.color.surfaceRaised,
    surfaceSunken: brandTokens.color.surfaceSunken,
    surfaceSubtle: brandTokens.color.surfaceSubtle,
    border: brandTokens.color.border,
    foreground: brandTokens.color.foreground,
    muted: brandTokens.color.muted,
    accent: brandTokens.color.accent,
    accentForeground: brandTokens.color.accentForeground,
    accentSoft: brandTokens.color.accentSoft,
    danger: brandTokens.color.danger,
  },
  // 4px scale, conforme DESIGN_SPEC.md §0.
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
  // Nada abaixo de 12px (DESIGN_SPEC.md §0); body line-height 1.5+.
  text: {
    xs: remToPx(brandTokens.text.xs),
    sm: remToPx(brandTokens.text.sm),
    base: remToPx(brandTokens.text.base),
    lg: remToPx(brandTokens.text.lg),
    xl: remToPx(brandTokens.text.xl),
  },
} as const

export const productName = brandTokens.productName
