import { router } from "expo-router"
import { useState } from "react"
import { FlatList, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Chip, Entrada, EstadoVazio } from "@/components/motion"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { CartaoAnuncio } from "@/components/telas/cartao-anuncio"
import { Input } from "@/components/ui/input"
import type { Anuncio } from "@/lib/dados"
import { useAnuncios } from "@/lib/dados/estado"

const FILTROS = ["Tudo", "Desapegos", "Imóveis", "Grátis"] as const

type Filtro = (typeof FILTROS)[number]

function filtra(anuncios: Anuncio[], filtro: Filtro, busca: string): Anuncio[] {
  const termo = busca.trim().toLowerCase()

  return anuncios
    .filter((anuncio) => {
      if (filtro === "Desapegos") return anuncio.categoria === "desapego"
      if (filtro === "Imóveis") return anuncio.categoria === "imovel"
      if (filtro === "Grátis") return anuncio.preco === 0
      return true
    })
    .filter((anuncio) => anuncio.titulo.toLowerCase().includes(termo))
}

export default function TelaMercado() {
  const [filtro, setFiltro] = useState<Filtro>("Tudo")
  const [busca, setBusca] = useState("")
  const todos = useAnuncios()
  const anuncios = filtra(todos, filtro, busca)

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela titulo="Mercado" subtitulo="Desapegos e imóveis perto de você" />

      <View className="gap-3 px-4 pb-2">
        <Input
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar no Mercado"
          accessibilityLabel="Buscar no Mercado"
          returnKeyType="search"
        />
        <View className="flex-row flex-wrap items-center gap-2">
          {FILTROS.map((rotulo) => (
            <Chip
              key={rotulo}
              rotulo={rotulo}
              ativo={filtro === rotulo}
              aoAlternar={() => setFiltro(rotulo)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={anuncios}
        keyExtractor={(anuncio) => anuncio.id}
        numColumns={2}
        columnWrapperClassName="gap-3"
        contentContainerClassName="gap-3 px-4 pb-8 pt-1"
        ListEmptyComponent={
          <EstadoVazio
            ilustracao="vazio-mercado"
            titulo="Nada encontrado por aqui"
            texto="Tente outra palavra ou veja tudo o que está anunciado na cidade."
            acao={{
              rotulo: "Ver tudo",
              aoPressionar: () => {
                setBusca("")
                setFiltro("Tudo")
              },
            }}
          />
        }
        renderItem={({ item, index }) => (
          <View className="flex-1">
            <Entrada indice={index}>
              <CartaoAnuncio
                anuncio={item}
                aoPressionar={() => router.push(`/anuncio/${item.id}`)}
              />
            </Entrada>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
