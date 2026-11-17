import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Icone, type NomeIcone } from "@/components/icons"
import { BotaoAcao, Chip, type EstadoBotao } from "@/components/motion"
import { AvatarPessoa } from "@/components/telas/avatar-pessoa"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { useCores } from "@/components/telas/cores"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { CIDADE, GRUPOS, PERFIL } from "@/lib/dados"
import { publicarAnuncio, publicarPost } from "@/lib/dados/estado"

type Chave = "pergunta" | "grupo" | "evento" | "anuncio"

type Bloco = {
  chave: Chave
  nome: NomeIcone
  titulo: string
  detalhe: string
  exemplo: string
}

const BLOCOS: Bloco[] = [
  {
    chave: "pergunta",
    nome: "comunidade",
    titulo: "Pergunta",
    detalhe: "Peça uma indicação para a cidade",
    exemplo: "Alguém indica um eletricista de confiança no bairro?",
  },
  {
    chave: "grupo",
    nome: "grupo",
    titulo: "Publicação em grupo",
    detalhe: "Escreva para um dos seus grupos",
    exemplo: "Combinado do grupo para o sábado…",
  },
  {
    chave: "evento",
    nome: "evento",
    titulo: "Evento",
    detalhe: "Convide os vizinhos com data e local",
    exemplo: "Bazar de desapegos na praça, sábado às 8h…",
  },
  {
    chave: "anuncio",
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
  const [destino, setDestino] = useState("")
  const [aviso, setAviso] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [titulo, setTitulo] = useState("")
  const [preco, setPreco] = useState("")
  const [data, setData] = useState("")

  const textoVazio = texto.trim().length === 0

  useEffect(() => {
    if (estado === "enviando") {
      const relogio = setTimeout(() => setEstado("feito"), 1200)
      return () => clearTimeout(relogio)
    }
    if (estado === "feito" && destino.length > 0) {
      const relogio = setTimeout(() => router.replace(destino), 600)
      return () => clearTimeout(relogio)
    }
  }, [estado, destino])

  /** Publica no destino do tipo escolhido e devolve a rota da publicação. */
  function publicarNoDestino(): string | undefined {
    if (bloco.chave === "anuncio") {
      if (titulo.trim().length === 0 || preco.trim().length === 0) {
        setAviso("Dê um título e um preço")
        return undefined
      }
      const anuncio = publicarAnuncio({
        titulo: titulo.trim(),
        preco: Number(preco.replace(/\D/g, "")) || 0,
        descricao: texto.trim(),
        categoria: "desapego",
      })
      return `/anuncio/${anuncio.id}`
    }

    if (bloco.chave === "grupo") {
      if (grupoId.length === 0) {
        setAviso("Escolha o grupo")
        return undefined
      }
      publicarPost({ texto: texto.trim(), tipo: "publicacao", grupoId })
      return `/grupo/${grupoId}`
    }

    if (bloco.chave === "evento") {
      if (titulo.trim().length === 0 || data.trim().length === 0) {
        setAviso("Dê um título e uma data")
        return undefined
      }
      const post = publicarPost({
        texto: `${titulo.trim()} · ${data.trim()}\n\n${texto.trim()}`,
        tipo: "publicacao",
      })
      return `/pergunta/${post.id}`
    }

    const post = publicarPost({ texto: texto.trim(), tipo: "pergunta" })
    return `/pergunta/${post.id}`
  }

  function publicar() {
    if (estado !== "parado" || textoVazio) return
    setAviso("")
    const rota = publicarNoDestino()
    if (!rota) return
    setDestino(rota)
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
        <View
          className={textoVazio ? "opacity-40" : ""}
          pointerEvents={textoVazio ? "none" : "auto"}
        >
          <BotaoAcao rotulo="Publicar" estado={estado} aoPressionar={publicar} />
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-4 pb-10">
        <View className="flex-row items-center gap-3">
          <AvatarPessoa pessoa={PERFIL} />
          <View>
            <Text className="text-base font-semibold">{PERFIL.nome}</Text>
            <Text className="text-xs text-muted-foreground">{PERFIL.bairro}</Text>
          </View>
        </View>

        {bloco.chave === "grupo" ? (
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Em qual grupo
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GRUPOS.map((grupo) => (
                <Chip
                  key={grupo.id}
                  rotulo={grupo.nome}
                  ativo={grupoId === grupo.id}
                  aoAlternar={() => {
                    setGrupoId(grupoId === grupo.id ? "" : grupo.id)
                    setAviso("")
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {bloco.chave === "anuncio" || bloco.chave === "evento" ? (
          <Input
            value={titulo}
            onChangeText={setTitulo}
            placeholder={bloco.chave === "anuncio" ? "Título do anúncio" : "Título do evento"}
            accessibilityLabel="Título"
          />
        ) : null}

        {bloco.chave === "anuncio" ? (
          <Input
            value={preco}
            onChangeText={setPreco}
            placeholder="Preço em reais (0 para doação)"
            accessibilityLabel="Preço em reais"
            keyboardType="numeric"
          />
        ) : null}

        {bloco.chave === "evento" ? (
          <Input
            value={data}
            onChangeText={setData}
            placeholder="Quando, em texto (sábado às 8h)"
            accessibilityLabel="Data do evento"
          />
        ) : null}

        <Textarea
          value={texto}
          onChangeText={setTexto}
          placeholder={bloco.exemplo}
          placeholderClassName="text-muted-foreground"
          accessibilityLabel="Texto da publicação"
          className="min-h-40"
        />

        {aviso.length > 0 ? (
          <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
            {aviso}
          </Text>
        ) : null}

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
              onPress={() => {
                setBloco(item)
                setAviso("")
              }}
              className={`flex-row items-center gap-3 rounded-xl border p-4 ${
                item.titulo === bloco.titulo
                  ? "border-primary bg-secondary"
                  : "border-border bg-card"
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
