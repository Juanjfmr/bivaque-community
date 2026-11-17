import { Icone, type NomeIcone } from "@/components/icons"
import { Entrada, Esqueleto } from "@/components/motion"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { CartaoPost } from "@/components/telas/cartao-post"
import { useCores } from "@/components/telas/cores"
import { Text } from "@/components/ui/text"
import { CIDADE, POSTS } from "@/lib/dados"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { FlatList, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const ATALHOS: { nome: NomeIcone; rotulo: string }[] = [
  { nome: "evento", rotulo: "Eventos" },
  { nome: "guia", rotulo: "Guia" },
  { nome: "negocio", rotulo: "Negócios" },
]

export default function TelaInicio() {
  const cores = useCores()
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const relogio = setTimeout(() => setCarregando(false), 400)
    return () => clearTimeout(relogio)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela
        titulo={CIDADE}
        direita={
          <>
            <BotaoIcone nome="busca" rotulo="Buscar na cidade" aoPressionar={() => undefined} />
            <BotaoIcone
              nome="conversas"
              rotulo="Abrir conversas"
              aoPressionar={() => router.push("/conversas")}
            />
          </>
        }
      />

      {carregando ? (
        <View className="gap-3 px-4 pt-2">
          <View className="flex-row gap-3">
            {ATALHOS.map((atalho) => (
              <Esqueleto key={atalho.rotulo} largura="31%" altura={76} />
            ))}
          </View>
          {[0, 1, 2].map((chave) => (
            <Esqueleto key={chave} largura="100%" altura={148} />
          ))}
        </View>
      ) : (
        <FlatList
          data={POSTS}
          keyExtractor={(post) => post.id}
          contentContainerClassName="gap-3 px-4 pb-8 pt-2"
          ListHeaderComponent={
            <View className="flex-row gap-3">
              {ATALHOS.map((atalho) => (
                <View
                  key={atalho.rotulo}
                  className="flex-1 items-center gap-2 rounded-xl bg-card p-3"
                >
                  <Icone nome={atalho.nome} tamanho={24} cor={cores.foreground} />
                  <Text className="text-xs font-medium">{atalho.rotulo}</Text>
                </View>
              ))}
            </View>
          }
          renderItem={({ item, index }) => (
            <Entrada indice={index}>
              <CartaoPost post={item} />
            </Entrada>
          )}
        />
      )}
    </SafeAreaView>
  )
}
