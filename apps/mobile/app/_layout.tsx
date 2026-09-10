// apps/mobile/app/_layout.tsx
// Layout raiz do expo-router.
//
// O retorno da autenticação NÃO é tratado aqui. Um listener nesta raiz chega a
// fazer a troca do code por sessão, mas o expo-router, em paralelo, procura a
// rota do caminho do deep link — provado no emulador em 2026-09-06: a sessão
// nascia no banco e a pessoa ficava olhando "Unmatched Route". O retorno é a
// rota app/auth-callback.tsx, que o router encontra tanto com o app aberto
// quanto quando o link inicia o processo do zero.
//
// O contrato R3 de sessão é ADR-20260901-mobile-session (aprovada): PKCE no
// login, token no secure-store, revogação e purge em src/auth/.
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
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  )
}
