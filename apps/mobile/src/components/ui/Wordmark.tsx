// apps/mobile/src/components/ui/Wordmark.tsx
// Marca textual do Bivaque, em verde profundo — a mesma leitura do guia visual
// de 06/09/2026. É texto, não imagem: escala com a fonte do sistema e é lida
// uma vez só por leitor de tela.
import { StyleSheet, Text } from "react-native"
import { productName, theme } from "../../theme"

export function Wordmark() {
  return (
    <Text style={styles.wordmark} accessibilityRole="header">
      {productName.toUpperCase()}
    </Text>
  )
}

const styles = StyleSheet.create({
  wordmark: {
    fontSize: theme.text.xl,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: theme.color.accent,
  },
})
