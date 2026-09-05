// apps/mobile/app/(tabs)/cidade.tsx
// Container "Cidade" (id `cidade`, rota canônica `/localidade` no web).
//
// Fundação: a tela é um placeholder honesto. O conteúdo real — eventos da
// cidade, guia de chegada, vitrine, busca de prestador — chega com o
// contrato da jornada, em ondas posteriores (ver VISUAL_GUIDE.md §0).
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { theme } from "../../src/theme"

export default function CidadeScreen() {
  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Cidade</Text>
        <Text style={styles.lead}>O nível da localidade</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fundação</Text>
          <Text style={styles.cardBody}>Conteúdo chega com o contrato da jornada.</Text>
        </View>
      </ScrollView>
    </View>
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
