import { router, useLocalSearchParams } from "expo-router"
import { Image, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { BotaoAcao, EstadoVazio } from "@/components/motion"
import { AvatarPessoa } from "@/components/telas/avatar-pessoa"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { PERFIL, pessoaPorId, precoEmReais } from "@/lib/dados"
import { abrirOuCriarConversa, useAnuncio } from "@/lib/dados/estado"

export default function TelaAnuncio() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const anuncio = useAnuncio(id)
  const vendedor = anuncio ? pessoaPorId(anuncio.vendedorId) : undefined

  if (!anuncio || !vendedor) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EstadoVazio
          ilustracao="vazio-mercado"
          titulo="Anúncio não encontrado"
          texto="Ele pode ter sido vendido ou retirado do Mercado."
          acao={{ rotulo: "Voltar", aoPressionar: () => router.back() }}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela
        titulo="Anúncio"
        esquerda={<BotaoIcone nome="voltar" rotulo="Voltar" aoPressionar={() => router.back()} />}
      />

      <ScrollView contentContainerClassName="gap-4 pb-10">
        <Image
          source={{ uri: anuncio.foto }}
          accessibilityIgnoresInvertColors
          className="aspect-square w-full bg-muted"
        />

        <View className="gap-2 px-4">
          <Text variant="h3" className="text-2xl font-bold">
            {precoEmReais(anuncio.preco)}
          </Text>
          <Text className="text-lg font-semibold">{anuncio.titulo}</Text>
          <Text className="text-sm text-muted-foreground">
            {anuncio.bairro} · {anuncio.categoria === "imovel" ? "Imóvel" : "Desapego"}
          </Text>
          <Text className="text-base leading-6">{anuncio.descricao}</Text>
        </View>

        <View className="px-4">
          <Card className="flex-row items-center gap-3 rounded-xl border-border p-4">
            <AvatarPessoa pessoa={vendedor} />
            <View className="flex-1">
              <Text className="text-base font-semibold">{vendedor.nome}</Text>
              <Text className="text-xs text-muted-foreground">Vendedor em {vendedor.bairro}</Text>
            </View>
          </Card>
        </View>

        {anuncio.vendedorId === PERFIL.id ? null : (
          <View className="px-4">
            <BotaoAcao
              rotulo="Tenho interesse"
              estado="parado"
              aoPressionar={() => router.push(`/conversa/${abrirOuCriarConversa(anuncio)}`)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
