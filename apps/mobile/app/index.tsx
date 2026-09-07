import { nativeTokens } from "@bivaque/tokens"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BivaqueButton, BivaqueText } from "../src/ui/primitives"

export default function EntryScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <Image
          source={require("../assets/bivaque-logo-horizontal-graphite.svg")}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Bivaque"
        />

        <View style={styles.hero}>
          <Image
            source={require("../assets/hero-bivaque-arrival.webp")}
            style={styles.heroImage}
            contentFit="cover"
            accessibilityLabel="Pessoa chegando a um encontro comunitário"
          />
          <View style={styles.heroScrim} />
          <View style={styles.heroCopy}>
            <BivaqueText variant="eyebrow" tone="inverse">
              A comunidade vai com você
            </BivaqueText>
            <BivaqueText variant="title" tone="inverse">
              Chegue sabendo a quem perguntar.
            </BivaqueText>
          </View>
        </View>

        <View style={styles.copy}>
          <BivaqueText variant="eyebrow" tone="accent">
            Bem-vindo ao Bivaque
          </BivaqueText>
          <BivaqueText variant="title">Um lugar para chegar, perguntar e participar.</BivaqueText>
          <BivaqueText tone="muted">
            Entre com sua conta ou crie seu primeiro acesso. A admissão acontece depois, no contexto
            certo.
          </BivaqueText>
        </View>

        <View style={styles.actions}>
          <BivaqueButton
            label="Entrar"
            onPress={() => router.push("/login")}
            accessibilityHint="Abre a rota de acesso para quem já tem conta"
          />
          <BivaqueButton
            label="Criar conta"
            variant="secondary"
            onPress={() => router.push("/signup")}
            accessibilityHint="Abre a rota de primeiro acesso"
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: nativeTokens.color.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[6],
    paddingTop: nativeTokens.space[3],
    paddingBottom: nativeTokens.space[4],
    gap: nativeTokens.space[6],
  },
  logo: {
    width: 142,
    height: 40,
  },
  hero: {
    minHeight: 230,
    flex: 1,
    maxHeight: 330,
    borderRadius: nativeTokens.radius.xl,
    overflow: "hidden",
    backgroundColor: nativeTokens.color.accent,
    justifyContent: "flex-end",
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: nativeTokens.color.accentScrim,
  },
  heroCopy: {
    gap: nativeTokens.space[2],
    padding: nativeTokens.space[6],
  },
  copy: {
    gap: nativeTokens.space[3],
  },
  actions: {
    gap: nativeTokens.space[3],
  },
})
