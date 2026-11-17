import { router, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Icone } from "@/components/icons"
import { Entrada, EstadoVazio } from "@/components/motion"
import { AvatarPessoa } from "@/components/telas/avatar-pessoa"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { useCores } from "@/components/telas/cores"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { pessoaPorId, precoEmReais } from "@/lib/dados"
import { enviarMensagem, useAnuncio, useConversa } from "@/lib/dados/estado"

export default function TelaConversa() {
  const cores = useCores()
  const { id } = useLocalSearchParams<{ id: string }>()
  const conversa = useConversa(id)
  const anuncio = useAnuncio(conversa?.anuncioId ?? "")
  const pessoa = conversa ? pessoaPorId(conversa.pessoaId) : undefined
  const [texto, setTexto] = useState("")

  if (!conversa || !pessoa) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EstadoVazio
          ilustracao="vazio-conversas"
          titulo="Conversa não encontrada"
          texto="Ela pode ter sido apagada ou o endereço está incompleto."
          acao={{ rotulo: "Voltar", aoPressionar: () => router.back() }}
        />
      </SafeAreaView>
    )
  }

  function enviar() {
    if (!conversa) return
    enviarMensagem(conversa.id, texto)
    setTexto("")
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <CabecalhoTela
        titulo={pessoa.nome}
        subtitulo={pessoa.bairro}
        esquerda={<BotaoIcone nome="voltar" rotulo="Voltar" aoPressionar={() => router.back()} />}
        direita={<AvatarPessoa pessoa={pessoa} tamanho={32} />}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={conversa.mensagens}
          keyExtractor={(mensagem) => mensagem.id}
          contentContainerClassName="gap-2 px-4 pb-4 pt-2"
          ListHeaderComponent={
            anuncio ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Anúncio: ${anuncio.titulo}`}
                onPress={() => router.push(`/anuncio/${anuncio.id}`)}
                className="mb-2"
              >
                <Card className="flex-row items-center gap-3 rounded-xl border-border p-3">
                  <Image
                    source={{ uri: anuncio.foto }}
                    accessibilityIgnoresInvertColors
                    className="h-12 w-12 rounded-lg bg-muted"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold" numberOfLines={2}>
                      {anuncio.titulo}
                    </Text>
                    <Text className="text-sm font-semibold text-muted-foreground">
                      {precoEmReais(anuncio.preco)}
                    </Text>
                  </View>
                  <Icone nome="avancar" tamanho={18} cor={cores.mutedForeground} />
                </Card>
              </Pressable>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Entrada indice={index}>
              <View
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  item.deMim ? "self-end bg-primary" : "self-start bg-muted"
                }`}
              >
                <Text className={item.deMim ? "text-primary-foreground" : "text-foreground"}>
                  {item.texto}
                </Text>
                <Text
                  className={`mt-1 text-[10px] ${
                    item.deMim ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {item.hora}
                </Text>
              </View>
            </Entrada>
          )}
        />

        <View className="flex-row items-center gap-2 border-t border-border px-4 py-2">
          <Input
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva uma mensagem"
            accessibilityLabel="Escreva uma mensagem"
            className="flex-1"
            onSubmitEditing={enviar}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            onPress={enviar}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
          >
            <Icone nome="enviar" tamanho={20} cor={cores.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
