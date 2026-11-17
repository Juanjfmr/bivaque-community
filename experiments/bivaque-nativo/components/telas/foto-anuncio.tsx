import { Image, View } from "react-native"
import { Icone } from "@/components/icons"
import type { Anuncio } from "@/lib/dados"
import { useCores } from "./cores"

interface FotoAnuncioProps {
  anuncio: Anuncio
  className: string
  tamanhoIcone?: number
}

/** Foto do anúncio; o anúncio publicado na sessão, sem foto, mostra o ícone da categoria. */
export function FotoAnuncio({ anuncio, className, tamanhoIcone = 40 }: FotoAnuncioProps) {
  const cores = useCores()
  if (anuncio.foto) {
    return <Image source={anuncio.foto} accessibilityIgnoresInvertColors className={className} />
  }
  return (
    <View
      accessibilityLabel="Anúncio sem foto"
      className={`${className} items-center justify-center`}
    >
      <Icone
        nome={anuncio.categoria === "imovel" ? "imovel" : "desapego"}
        tamanho={tamanhoIcone}
        cor={cores.mutedForeground}
      />
    </View>
  )
}
