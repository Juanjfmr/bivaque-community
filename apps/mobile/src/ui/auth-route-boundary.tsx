import { nativeTokens } from "@bivaque/tokens"
import { useRouter } from "expo-router"
import { StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BivaqueButton, BivaqueText } from "./primitives"

type AuthRouteBoundaryProps = {
  eyebrow: string
  title: string
  description: string
}

export function AuthRouteBoundary({ eyebrow, title, description }: AuthRouteBoundaryProps) {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.copy}>
          <BivaqueText variant="eyebrow" tone="accent">
            {eyebrow}
          </BivaqueText>
          <BivaqueText variant="title">{title}</BivaqueText>
          <BivaqueText tone="muted">{description}</BivaqueText>
        </View>
        <BivaqueButton label="Voltar" variant="secondary" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: nativeTokens.color.background,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: nativeTokens.space[6],
  },
  copy: {
    gap: nativeTokens.space[4],
    paddingTop: nativeTokens.space[12],
  },
})
