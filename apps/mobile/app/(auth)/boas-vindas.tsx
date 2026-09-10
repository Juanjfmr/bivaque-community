// apps/mobile/app/(auth)/boas-vindas.tsx
// Primeira tela do aplicativo: apresentação e escolha entre entrar e criar conta.
//
// Antes desta tela o app abria direto em `(tabs)/cidade` — quatro abas de
// conteúdo que ninguém sem sessão pode ver. A entrada agora é explícita, e a
// escolha viaja como parâmetro para o passo de e-mail, que precisa dela para
// decidir entre retomar uma conta e criar uma.
//
// Direção visual: guia de 06/09/2026 — superfície clara, verde profundo na
// ação principal, uma ação evidente por contexto (PROCESSO-DE-CONSTRUCAO §4).
import { useRouter } from "expo-router"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Button } from "../../src/components/ui/Button"
import { Wordmark } from "../../src/components/ui/Wordmark"
import { bodyLineHeight, theme } from "../../src/theme"

const HIGHLIGHTS = [
  {
    title: "Pergunte a quem conhece o lugar",
    body: "Escolas, bairros, serviços e o que ninguém escreve num site oficial.",
  },
  {
    title: "Encontre sua comunidade",
    body: "Participação conforme o seu papel — militar, veterano, pensionista ou família.",
  },
  {
    title: "Prepare a próxima mudança",
    body: "Chegue sabendo a quem perguntar, antes de desembarcar.",
  },
]

export default function BoasVindasScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Wordmark />
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>A comunidade vai com você.</Text>
          <Text style={styles.lead}>
            Uma rede nacional de militares federais, veteranos, pensionistas e famílias, com acesso
            conferido conforme o papel de cada pessoa.
          </Text>
        </View>

        <View style={styles.highlights}>
          {HIGHLIGHTS.map((item) => (
            <View key={item.title} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label="Criar conta"
          accessibilityHint="Começa um cadastro novo pelo seu e-mail"
          onPress={() => router.push("/(auth)/acesso?modo=criar-conta")}
        />
        <Button
          label="Já tenho conta"
          variant="secondary"
          accessibilityHint="Entra com o e-mail que você já usa no Bivaque"
          onPress={() => router.push("/(auth)/acesso?modo=entrar")}
        />
        <Text style={styles.footnote}>
          Criar conta não concede participação em uma comunidade privada. O acesso é conferido
          depois, conforme o seu papel.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  scroll: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[6],
    paddingBottom: theme.space[6],
    gap: theme.space[6],
  },
  brand: {
    alignItems: "flex-start",
  },
  intro: {
    gap: theme.space[3],
  },
  title: {
    fontSize: theme.text.xl,
    fontWeight: "700",
    color: theme.color.foreground,
    lineHeight: theme.text.xl * 1.25,
  },
  lead: {
    fontSize: theme.text.base,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.base),
  },
  highlights: {
    gap: theme.space[3],
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space[4],
    gap: theme.space[1],
  },
  cardTitle: {
    fontSize: theme.text.base,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  cardBody: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.sm),
  },
  actions: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
    paddingBottom: theme.space[4],
    gap: theme.space[3],
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.background,
  },
  footnote: {
    fontSize: theme.text.xs,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.xs),
  },
})
