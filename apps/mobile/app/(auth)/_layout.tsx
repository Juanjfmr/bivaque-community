// apps/mobile/app/(auth)/_layout.tsx
// Stack de entrada: boas-vindas e o passo de e-mail.
//
// A pilha é própria (e não uma aba) porque entrar não é um destino do produto:
// é o caminho até ele. Boas-vindas não tem cabeçalho — a marca já está na tela;
// as telas seguintes têm cabeçalho com voltar, que é o retorno exigido em
// PROCESSO-DE-CONSTRUCAO §10.
import { Stack } from "expo-router"
import { theme } from "../../src/theme"

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.background },
        headerTintColor: theme.color.foreground,
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.color.background },
      }}
    >
      <Stack.Screen name="boas-vindas" options={{ headerShown: false }} />
      <Stack.Screen name="acesso" options={{ title: "", headerBackTitle: "Voltar" }} />
    </Stack>
  )
}
