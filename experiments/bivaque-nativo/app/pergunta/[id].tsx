import { Icone } from "@/components/icons"
import { Entrada, EstadoVazio } from "@/components/motion"
import { AvatarPessoa } from "@/components/telas/avatar-pessoa"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { CartaoPost } from "@/components/telas/cartao-post"
import { useCores } from "@/components/telas/cores"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import {
  type Resposta,
  postPorId,
  pessoaPorId,
  respostasDoPost,
} from "@/lib/dados"
import { router, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function TelaPergunta() {
  const cores = useCores()
  const { id } = useLocalSearchParams<{ id: string }>()
  const post = postPorId(id)

  const [enviadas, setEnviadas] = useState<Resposta[]>([])
  const [texto, setTexto] = useState("")

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EstadoVazio
          ilustracao="vazio-comunidade"
          titulo="Pergunta não encontrada"
          texto="Ela pode ter sido removida pela pessoa que perguntou."
          acao={{ rotulo: "Voltar", aoPressionar: () => router.back() }}
        />
      </SafeAreaView>
    )
  }

  const respostas = [...respostasDoPost(post.id), ...enviadas]

  function responder() {
    if (!post || texto.trim().length === 0) return
    setEnviadas((atuais) => [
      ...atuais,
      {
        id: `local-${atuais.length}`,
        postId: post.id,
        autorId: "eu",
        tempo: "agora",
        texto: texto.trim(),
      },
    ])
    setTexto("")
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela
        titulo="Pergunta"
        esquerda={<BotaoIcone nome="voltar" rotulo="Voltar" aoPressionar={() => router.back()} />}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={respostas}
          keyExtractor={(resposta) => resposta.id}
          contentContainerClassName="gap-3 px-4 pb-4 pt-2"
          ListHeaderComponent={
            <View className="gap-4">
              <CartaoPost post={post} />
              <Text className="text-xs font-semibold uppercase text-muted-foreground">
                {respostas.length} respostas
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Entrada indice={index}>
              <Card className="flex-row gap-3 rounded-xl border-border p-3">
                <AutorDaResposta autorId={item.autorId} />
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-semibold">
                      {pessoaPorId(item.autorId)?.nome ?? "Você"}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{item.tempo}</Text>
                  </View>
                  <Text className="text-sm leading-5">{item.texto}</Text>
                </View>
              </Card>
            </Entrada>
          )}
        />

        <View className="flex-row items-center gap-2 border-t border-border px-4 py-2">
          <Input
            value={texto}
            onChangeText={setTexto}
            placeholder="Responda para a cidade"
            accessibilityLabel="Responda para a cidade"
            className="flex-1"
            onSubmitEditing={responder}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar resposta"
            onPress={responder}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
          >
            <Icone nome="enviar" tamanho={20} cor={cores.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function AutorDaResposta({ autorId }: { autorId: string }) {
  const autor = pessoaPorId(autorId)
  return autor ? <AvatarPessoa pessoa={autor} tamanho={32} /> : null
}
