import { router } from "expo-router"
import { useState } from "react"
import { FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Entrada } from "@/components/motion"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { CartaoGrupo } from "@/components/telas/cartao-grupo"
import { CartaoPost } from "@/components/telas/cartao-post"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Text } from "@/components/ui/text"
import { GRUPOS } from "@/lib/dados"
import { usePosts } from "@/lib/dados/estado"

export default function TelaComunidade() {
  const [aba, setAba] = useState("perguntas")
  const perguntas = usePosts().filter((post) => post.tipo === "pergunta")

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela titulo="Comunidade" subtitulo="Perguntas e grupos da sua cidade" />

      <Tabs value={aba} onValueChange={setAba} className="flex-1 px-4">
        <TabsList className="mb-2 h-11 w-full bg-muted">
          <TabsTrigger value="perguntas" className="h-full flex-1">
            <Text className="text-sm font-semibold">Perguntas</Text>
          </TabsTrigger>
          <TabsTrigger value="grupos" className="h-full flex-1">
            <Text className="text-sm font-semibold">Grupos</Text>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perguntas" className="flex-1">
          <FlatList
            data={perguntas}
            keyExtractor={(post) => post.id}
            contentContainerClassName="gap-3 pb-8 pt-2"
            renderItem={({ item, index }) => (
              <Entrada indice={index}>
                <CartaoPost post={item} aoPressionar={() => router.push(`/pergunta/${item.id}`)} />
              </Entrada>
            )}
          />
        </TabsContent>

        <TabsContent value="grupos" className="flex-1">
          <FlatList
            data={GRUPOS}
            keyExtractor={(grupo) => grupo.id}
            contentContainerClassName="gap-3 pb-8 pt-2"
            renderItem={({ item, index }) => (
              <Entrada indice={index}>
                <CartaoGrupo grupo={item} aoPressionar={() => router.push(`/grupo/${item.id}`)} />
              </Entrada>
            )}
          />
        </TabsContent>
      </Tabs>
    </SafeAreaView>
  )
}
