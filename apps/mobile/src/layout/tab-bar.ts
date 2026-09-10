import { theme } from "../theme"

export const TAB_BAR_BASE_HEIGHT = 64

export function getTabBarStyle(bottomInset: number) {
  const safeBottomInset = Math.max(0, bottomInset)
  return {
    height: TAB_BAR_BASE_HEIGHT + safeBottomInset,
    paddingTop: theme.space[2],
    paddingBottom: theme.space[2] + safeBottomInset,
  }
}
