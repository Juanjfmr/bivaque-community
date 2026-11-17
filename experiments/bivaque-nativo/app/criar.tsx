import { Icone, type NomeIcone } from "@/components/icons"
import { BotaoAcao, type EstadoBotao } from "@/components/motion"
import { AvatarPessoa } from "@/components/telas/avatar-pessoa"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { useCores } from "@/components/telas/cores"
import { Separator } from "@/components/ui/separator"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { CIDADE, PERFIL } from "@/lib/dados"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const BLOCOS: { nome: NomeIcone; titulo: string; detalhe: string; exemplo: string }[] = [
  {
    nome: "comunidade",
    titulo: "Pergunta",
    detalhe: "Peça uma indicação para a cidade",
    exemplo: "Alguém indica um eletricista de confiança no bairro?",
  },
  {
    nome: "grupo",
    titulo: "Publicação em grupo",
    detalhe: "Escreva para um dos seus grupos",
    exemplo: "Combinado do grupo para o sábado…",
  },
  {
    nome: "evento",
    titulo: "Evento",
    detalhe: "Convide os vizinhos com data e local",
    exemplo: "Bazar de desapegos na praça, sábado às 8h…",
  },
  {
    nome: "desapego",
    titulo: "Anúncio",
    detalhe: "Venda ou doe algo no Mercado",
    exemplo: "Sofá de dois lugares em bom estado, retirada no local…",
  },
]

export default function TelaCriar() {
  const cores = useCores()
  const [texto, setTexto] = useState("")
  const [bloco, setBloco] = useState(BLOCOS[0])
  const [estado, setEstado] = useState<EstadoBotao>("parado")

  useEffect(() => {
    if (estado === "enviando") {
      const relogio = setTimeout(() => setEstado("feito"), 1200)
      return () => clearTimeout(relogio)
    }
    if (estado === "feito") {
      const relogio = setTimeout(() => router.back(), 600)
      return () => clearTimeout(relogio)
    }
  }, [estado])

  function publicar() {
    if (estado !== "parado" || texto.trim().length === 0) return
    setEstado("enviando")
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-2 py-2">
        <BotaoIcone nome="fechar" rotulo="Fechar" aoPressionar={() => router.back()} />
        <View className="flex-1">
          <Text className="text-sm font-semibold">{bloco.titulo}</Text>
          <Text className="text-xs text-muted-foreground">Público · {CIDADE}</Text>
        </View>
        <BotaoAcao rotulo="Publicar" estado={estado} aoPressionar={publicar} />
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-10">
        <View className="flex-row items-center gap-3">
          <AvatarPessoa pessoa={PERFIL} />
          <View>
            <Text className="text-base font-semibold">{PERFIL.nome}</Text>
            <Text className="text-xs text-muted-foreground">{PERFIL.bairro}</Text>
          </View>
        </View>

        <Textarea
          value={texto}
          onChangeText={setTexto}
          placeholder={bloco.exemplo}
          placeholderClassName="text-muted-foreground"
          accessibilityLabel="Texto da publicação"
          className="min-h-40"
        />

        {estado === "feito" ? (
          <Text className="text-sm text-muted-foreground">Publicado na sua cidade.</Text>
        ) : null}

        <Separator />

        <Text className="text-xs font-semibold uppercase text-muted-foreground">
          Comece por um tipo
        </Text>

        <View className="gap-2">
          {BLOCOS.map((item) => (
            <Pressable
              key={item.titulo}
              accessibilityRole="button"
              accessibilityLabel={item.titulo}
              accessibilityState={{ selected: item.titulo === bloco.titulo }}
              onPress={() => setBloco(item)}
              className={`flex-row items-center gap-3 rounded-xl border p-4 ${
                item.titulo === bloco.titulo ? "border-primary bg-secondary" : "border-border bg-card"
              }`}
            >
              <Icone nome={item.nome} tamanho={22} cor={cores.foreground} />
              <View className="flex-1">
                <Text className="text-base font-semibold">{item.titulo}</Text>
                <Text className="text-xs text-muted-foreground">{item.detalhe}</Text>
              </View>
              <Icone nome="avancar" tamanho={18} cor={cores.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
