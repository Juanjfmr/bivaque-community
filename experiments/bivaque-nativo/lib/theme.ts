import { DarkTheme, DefaultTheme, type Theme } from "expo-router/react-navigation"

// Espelho em JS do global.css, para o que não lê classe (navegação, Skia, Rive, Lottie).
export const THEME = {
  light: {
    background: "hsl(200 14% 96%)",
    foreground: "hsl(200 21% 14%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(200 21% 14%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(200 21% 14%)",
    primary: "hsl(199 35% 23%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(200 17% 93%)",
    secondaryForeground: "hsl(200 21% 14%)",
    muted: "hsl(200 17% 93%)",
    mutedForeground: "hsl(200 10% 36%)",
    accent: "hsl(200 17% 93%)",
    accentForeground: "hsl(200 21% 14%)",
    destructive: "hsl(6 63% 46%)",
    border: "hsl(203 14% 89%)",
    input: "hsl(203 14% 89%)",
    ring: "hsl(199 35% 23%)",
    brasa: "hsl(8 52% 47%)",
    brasaForeground: "hsl(0 0% 100%)",
    radius: "1rem",
  },
  dark: {
    background: "hsl(206 18% 8%)",
    foreground: "hsl(200 15% 92%)",
    card: "hsl(204 16% 12%)",
    cardForeground: "hsl(200 15% 92%)",
    popover: "hsl(204 16% 12%)",
    popoverForeground: "hsl(200 15% 92%)",
    primary: "hsl(200 15% 92%)",
    primaryForeground: "hsl(206 18% 8%)",
    secondary: "hsl(203 16% 16%)",
    secondaryForeground: "hsl(200 15% 92%)",
    muted: "hsl(203 16% 16%)",
    mutedForeground: "hsl(202 12% 65%)",
    accent: "hsl(203 16% 16%)",
    accentForeground: "hsl(200 15% 92%)",
    destructive: "hsl(3 75% 60%)",
    border: "hsl(197 13% 22%)",
    input: "hsl(197 13% 22%)",
    ring: "hsl(200 15% 92%)",
    brasa: "hsl(14 68% 62%)",
    brasaForeground: "hsl(193 16% 11%)",
    radius: "1rem",
  },
}

// Hex dos mesmos tons, para Skia e Lottie (que não leem hsl()).
export const HEX = {
  light: {
    background: "#F3F5F6",
    card: "#FFFFFF",
    foreground: "#1C262B",
    mutedForeground: "#525E64",
    border: "#DEE3E6",
    primary: "#26424F",
    primaryForeground: "#FFFFFF",
    brasa: "#B84A3A",
    brasaForeground: "#FFFFFF",
  },
  dark: {
    background: "#101417",
    card: "#1A2024",
    foreground: "#E8ECEE",
    mutedForeground: "#9CAAB2",
    border: "#303A3E",
    primary: "#E8ECEE",
    primaryForeground: "#101417",
    brasa: "#E07A5A",
    brasaForeground: "#171E20",
  },
} as const

export type Esquema = keyof typeof HEX

export const NAV_THEME: Record<Esquema, Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.brasa,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.brasa,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
}
