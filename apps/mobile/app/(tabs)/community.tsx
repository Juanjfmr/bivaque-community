// apps/mobile/app/(tabs)/community.tsx
// Container "Minha comunidade" (id `community`, rota canônica `/community` no
// web). Hospeda a home (feed da vila) e os dois ciclos (BIVAQUE.md §6.3).
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { theme } from "../../src/theme"

export default function CommunityScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Minha comunidade</Text>
        <Text style={styles.lead}>A vila onde os membros se encontram</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fundação</Text>
          <Text style={styles.cardBody}>Conteúdo chega com o contrato da jornada.</Text>
        </View>
      </ScrollView>
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
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  h1: {
    fontSize: theme.text.xl,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  lead: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.base,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space[4],
    gap: theme.space[2],
  },
  cardTitle: {
    fontSize: theme.text.base,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  cardBody: {
    fontSize: theme.text.sm,
    color: theme.color.muted,
    lineHeight: 1.5,
  },
})
