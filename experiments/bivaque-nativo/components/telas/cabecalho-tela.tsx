import type { ReactNode } from "react"
import { View } from "react-native"
import { Text } from "@/components/ui/text"

interface CabecalhoTelaProps {
  titulo: string
  subtitulo?: string
  /** Ação à esquerda do título (voltar). */
  esquerda?: ReactNode
  /** Ações à direita (busca, conversas, publicar). */
  direita?: ReactNode
}

/** Cabeçalho de tela: título grande, ações alinhadas ao centro da linha. */
export function CabecalhoTela({ titulo, subtitulo, esquerda, direita }: CabecalhoTelaProps) {
  return (
    <View className="flex-row items-center gap-2 px-4 pb-2 pt-1">
      {esquerda}
      <View className="flex-1">
        <Text variant="h3" className="text-2xl font-bold" numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-1">{direita}</View>
    </View>
  )
}
