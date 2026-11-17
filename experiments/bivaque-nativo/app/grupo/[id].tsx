import { Icone } from "@/components/icons"
import { BotaoAcao, type EstadoBotao, Entrada, EstadoVazio } from "@/components/motion"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { CartaoPost } from "@/components/telas/cartao-post"
import { useCores } from "@/components/telas/cores"
import { Text } from "@/components/ui/text"
import { POSTS, grupoPorId } from "@/lib/dados"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { FlatList, Image, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function TelaGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const grupo = grupoPorId(id)

  if (!grupo) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EstadoVazio
          ilustracao="vazio-comunidade"
          titulo="Grupo não encontrado"
          texto="Ele pode ter sido fechado ou o endereço está incompleto."
          acao={{ rotulo: "Voltar", aoPressionar: () => router.back() }}
        />
      </SafeAreaView>
    )
  }

  const publicacoes = POSTS.filter((post) => post.grupoId === grupo.id)

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <FlatList
        data={publicacoes}
        keyExtractor={(post) => post.id}
        contentContainerClassName="gap-3 pb-8"
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <CabecalhoTela
              titulo={grupo.nome}
              esquerda={
                <BotaoIcone nome="voltar" rotulo="Voltar" aoPressionar={() => router.back()} />
              }
            />
            <Image
              source={{ uri: grupo.capa }}
              accessibilityIgnoresInvertColors
              className="h-40 w-full bg-muted"
            />
            <View className="gap-2 px-4">
              <Text className="text-sm text-muted-foreground">
                {grupo.membros} membros · {grupo.bairro}
              </Text>
              <Text className="text-base leading-6">{grupo.descricao}</Text>
              <BotaoEntrar />
              <Text className="mt-2 text-xs font-semibold uppercase text-muted-foreground">
                No grupo
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EstadoVazio
            ilustracao="vazio-comunidade"
            titulo="Nada publicado ainda"
            texto="Seja a primeira pessoa a escrever neste grupo."
          />
        }
        renderItem={({ item, index }) => (
          <View className="px-4">
            <Entrada indice={index}>
              <CartaoPost post={item} />
            </Entrada>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

function BotaoEntrar() {
  const [estado, setEstado] = useState<EstadoBotao>("parado")

  useEffect(() => {
    if (estado === "enviando") {
      const relogio = setTimeout(() => setEstado("feito"), 1200)
      return () => clearTimeout(relogio)
    }
  }, [estado])

  return (
    <View className="flex-row items-center gap-2">
      <BotaoAcao
        rotulo={estado === "feito" ? "Você participa" : "Entrar no grupo"}
        estado={estado}
        aoPressionar={() => setEstado(estado === "parado" ? "enviando" : "parado")}
      />
      {estado === "feito" ? <IconeConfirmado /> : null}
    </View>
  )
}

function IconeConfirmado() {
  const cores = useCores()
  return <Icone nome="confirmar" tamanho={18} cor={cores.mutedForeground} />
}
