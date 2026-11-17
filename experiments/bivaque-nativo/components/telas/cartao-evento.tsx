import { Icone } from "@/components/icons"
import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import type { Evento } from "@/lib/dados"
import { Image, Pressable, View } from "react-native"
import { useCores } from "./cores"

interface CartaoEventoProps {
  evento: Evento
  aoPressionar: () => void
}

/** Evento do bairro: capa, título, quando e onde. */
export function CartaoEvento({ evento, aoPressionar }: CartaoEventoProps) {
  const cores = useCores()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${evento.titulo}, ${evento.quando}, ${evento.local}`}
      onPress={aoPressionar}
      className="flex-1"
    >
      <Card className="flex-row items-center gap-3 rounded-xl border-border p-3">
        <Image
          source={{ uri: evento.capa }}
          accessibilityIgnoresInvertColors
          className="h-16 w-16 rounded-lg bg-muted"
        />
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold" numberOfLines={1}>
            {evento.titulo}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icone nome="evento" tamanho={14} cor={cores.mutedForeground} />
            <Text className="text-xs text-muted-foreground">{evento.quando}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icone nome="local" tamanho={14} cor={cores.mutedForeground} />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {evento.local} · {evento.participantes} confirmados
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  )
}
