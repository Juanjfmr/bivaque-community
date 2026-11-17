import { Text } from "@/components/ui/text"
import { SafeAreaView } from "react-native-safe-area-context"

// Provisório: EXP-007 (DeepSeek) constrói esta tela.
export default function TelaInicio() {
  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <Text variant="h3">Início</Text>
    </SafeAreaView>
  )
}
