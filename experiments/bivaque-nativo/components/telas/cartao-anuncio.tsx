import { Image, Pressable, View } from "react-native"
import { Text } from "@/components/ui/text"
import { type Anuncio, precoEmReais } from "@/lib/dados"

interface CartaoAnuncioProps {
  anuncio: Anuncio
  aoPressionar: () => void
}

/** Cartão da grade do Mercado: foto quadrada, título, preço · bairro. */
export function CartaoAnuncio({ anuncio, aoPressionar }: CartaoAnuncioProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${anuncio.titulo}, ${precoEmReais(anuncio.preco)}, ${anuncio.bairro}`}
      onPress={aoPressionar}
      className="flex-1 gap-1.5"
    >
      <Image
        source={{ uri: anuncio.foto }}
        accessibilityIgnoresInvertColors
        className="aspect-square w-full rounded-lg bg-muted"
      />
      <Text className="text-sm font-medium" numberOfLines={2}>
        {anuncio.titulo}
      </Text>
      <View className="flex-row items-center gap-1">
        <Text className="text-sm font-semibold">{precoEmReais(anuncio.preco)}</Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          · {anuncio.bairro}
        </Text>
      </View>
    </Pressable>
  )
}
