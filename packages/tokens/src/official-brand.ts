/**
 * Approved Bivaque identity foundation.
 *
 * These values are canonical brand data AND, desde 2026-08-30, a base do tema
 * ativo: `packages/tokens/src/index.ts` e `apps/web/app/globals.css` derivam
 * deles (ADR-20260828-sistema-visual-editorial, emendado). Este arquivo segue
 * sendo a fonte da identidade; os tokens semânticos ficam no index, porque um
 * brandbook define identidade e não sistema de UI — daí os derivados
 * declarados lá (superfície elevada, texto secundário, danger).
 *
 * A ativação foi liberada por autoridade explícita do owner, não por decisão de
 * agente. `activationCard` continua apontando para FRONTEND-VISUAL-AAA, que
 * ainda carrega os passos 3 e 4 (BrandMark nos wordmarks provisórios; ícones e
 * manifest).
 */
export const officialBrandIdentity = {
  name: "Bivaque",
  status: "approved",
  approvedAt: "2026-08-29",
  concepts: {
    symbol: "Glifo Bivaque",
    secondaryGraphic: "Pátio",
  },
  runtime: {
    activation: "active",
    activationCard: "FRONTEND-VISUAL-AAA",
    colorScheme: "light",
    darkModeAvailable: false,
  },
  color: {
    primary: {
      graphite: "#253033",
      paper: "#F2F0EB",
      brasa: "#B84A3A",
    },
    secondary: {
      charcoal: "#171E20",
      raised: "#20292B",
      mist: "#78979B",
      brasaLight: "#E07A5A",
    },
  },
  typography: {
    display: "Noto Serif",
    interface: "Noto Sans",
    webFallback: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  logo: {
    clearSpaceUnit: "22% da largura do símbolo",
    symbolWordmarkGap: "1.27X",
    minimumFullDigital: 120,
    minimumFullPrintMm: 28,
    minimumSymbolDigital: 16,
    minimumSymbolPrintMm: 5,
  },
  assets: {
    root: "/brand",
    primary: "/brand/bivaque-logo-primary.svg",
    horizontal: "/brand/bivaque-logo-horizontal.svg",
    stacked: "/brand/bivaque-logo-stacked.svg",
    wordmark: "/brand/bivaque-wordmark.svg",
    symbol: "/brand/bivaque-symbol.svg",
    patio: "/brand/bivaque-graphic-patio.svg",
  },
} as const
