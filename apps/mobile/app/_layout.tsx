// apps/mobile/app/_layout.tsx
// Layout raiz do expo-router.
//
// Esta fundação não tem sessão: nenhum provider de autenticação é montado
// aqui. Conforme ADR-20260831-mobile-native.md, qualquer jornada autenticada
// exige contrato R3 próprio — storage seguro, revogação, purge de cache — e
// este shell não a autoriza por si só.
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { theme } from "../src/theme"

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.color.surface },
          headerTintColor: theme.color.foreground,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: theme.color.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  )
}
