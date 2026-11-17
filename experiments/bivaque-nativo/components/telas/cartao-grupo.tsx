import { Icone } from "@/components/icons"
import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import type { Grupo } from "@/lib/dados"
import { Image, Pressable, View } from "react-native"
import { useCores } from "./cores"

interface CartaoGrupoProps {
  grupo: Grupo
  aoPressionar: () => void
}

/** Grupo da Comunidade: capa pequena, nome, membros e o que se discute ali. */
export function CartaoGrupo({ grupo, aoPressionar }: CartaoGrupoProps) {
  const cores = useCores()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${grupo.nome}, ${grupo.membros} membros`}
      onPress={aoPressionar}
      className="flex-1"
    >
      <Card className="flex-row items-center gap-3 rounded-xl border-border p-3">
        <Image
          source={{ uri: grupo.capa }}
          accessibilityIgnoresInvertColors
          className="h-16 w-16 rounded-lg bg-muted"
        />
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold" numberOfLines={1}>
            {grupo.nome}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {grupo.descricao}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icone nome="grupo" tamanho={14} cor={cores.mutedForeground} />
            <Text className="text-xs text-muted-foreground">
              {grupo.membros} membros · {grupo.bairro}
            </Text>
          </View>
        </View>
        <Icone nome="avancar" tamanho={18} cor={cores.mutedForeground} />
      </Card>
    </Pressable>
  )
}
