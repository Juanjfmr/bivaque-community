/**
 * Approved Bivaque identity foundation.
 *
 * These values are canonical brand data, but they are not the active product
 * theme yet. Runtime activation remains gated by FRONTEND-VISUAL-AAA.
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
    activation: "staged",
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
