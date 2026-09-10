// apps/mobile/app/auth-callback.tsx
// Rota de retorno da autenticação. O caminho aqui precisa bater com
// AUTH_CALLBACK_PATH e com `additional_redirect_urls` no supabase/config.toml —
// tests/scope/auth-deep-link.test.mjs falha quando os três divergem.
//
// Fica fora de (auth) de propósito: quando o link do e-mail inicia o app do
// zero, nenhuma pilha de entrada montou, e esta rota precisa existir na raiz
// para o router encontrá-la.
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuthCallback } from "../src/auth/useAuthDeepLink"
import { Button } from "../src/components/ui/Button"
import { Wordmark } from "../src/components/ui/Wordmark"
import { bodyLineHeight, theme } from "../src/theme"

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams()
  const state = useAuthCallback(params)
  const router = useRouter()

  // A navegação segue a sessão, não o link: chegar aqui prova que a pessoa
  // abriu o e-mail, não que o servidor concedeu acesso.
  if (state.status === "signed-in") return <Redirect href="/(tabs)/cidade" />

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Wordmark />

        {state.status === "exchanging" ? (
          <View style={styles.block}>
            <ActivityIndicator size="large" color={theme.color.accent} />
            <Text style={styles.title}>Concluindo sua entrada</Text>
            <Text style={styles.body}>Só um instante.</Text>
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={styles.title}>Não deu para entrar</Text>
            <Text style={styles.body}>{state.message}</Text>
            <Button
              label="Pedir outro link"
              onPress={() => router.replace("/(auth)/boas-vindas")}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.space[4],
    gap: theme.space[8],
  },
  block: {
    gap: theme.space[3],
    alignItems: "flex-start",
  },
  title: {
    fontSize: theme.text.xl,
    fontWeight: "700",
    color: theme.color.foreground,
  },
  body: {
    fontSize: theme.text.base,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.base),
  },
})
