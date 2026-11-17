import "@/global.css"

import { PortalHost } from "@rn-primitives/portal"
import { Stack } from "expo-router"
import { ThemeProvider } from "expo-router/react-navigation"
import { StatusBar } from "expo-status-bar"
import { useColorScheme } from "nativewind"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { NAV_THEME } from "@/lib/theme"

export { ErrorBoundary } from "expo-router"

export default function RootLayout() {
  const { colorScheme } = useColorScheme()
  const esquema = colorScheme ?? "light"

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={NAV_THEME[esquema]}>
        <StatusBar style={esquema === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(abas)" />
          <Stack.Screen name="criar" options={{ presentation: "modal" }} />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
