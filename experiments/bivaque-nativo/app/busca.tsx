import { router } from "expo-router"
import { useState } from "react"
import { FlatList, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Entrada, EstadoVazio } from "@/components/motion"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { CartaoAnuncio } from "@/components/telas/cartao-anuncio"
import { CartaoGrupo } from "@/components/telas/cartao-grupo"
import { CartaoPost } from "@/components/telas/cartao-post"
import { Input } from "@/components/ui/input"
import { type Anuncio, GRUPOS, type Grupo, type Post } from "@/lib/dados"
import { useAnuncios, usePosts } from "@/lib/dados/estado"

type Resultado =
  | { tipo: "post"; post: Post }
  | { tipo: "grupo"; grupo: Grupo }
  | { tipo: "anuncio"; anuncio: Anuncio }

function chaveDe(resultado: Resultado): string {
  if (resultado.tipo === "post") return `post-${resultado.post.id}`
  if (resultado.tipo === "grupo") return `grupo-${resultado.grupo.id}`
  return `anuncio-${resultado.anuncio.id}`
}

function buscar(termo: string, posts: Post[], anuncios: Anuncio[]): Resultado[] {
  const alvo = termo.trim().toLowerCase()
  const contem = (texto: string) => texto.toLowerCase().includes(alvo)

  return [
    ...posts
      .filter((post) => contem(post.texto))
      .map((post): Resultado => ({ tipo: "post", post })),
    ...GRUPOS.filter((grupo) => contem(grupo.nome) || contem(grupo.descricao)).map(
      (grupo): Resultado => ({ tipo: "grupo", grupo }),
    ),
    ...anuncios
      .filter((anuncio) => contem(anuncio.titulo) || contem(anuncio.descricao))
      .map((anuncio): Resultado => ({ tipo: "anuncio", anuncio })),
  ]
}

export default function TelaBusca() {
  const [termo, setTermo] = useState("")
  const posts = usePosts()
  const anuncios = useAnuncios()
  const resultados = buscar(termo, posts, anuncios)

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela
        titulo="Buscar"
        subtitulo="Perguntas, grupos e anúncios da cidade"
        esquerda={<BotaoIcone nome="voltar" rotulo="Voltar" aoPressionar={() => router.back()} />}
      />

      <View className="px-4 pb-2">
        <Input
          value={termo}
          onChangeText={setTermo}
          placeholder="O que você procura?"
          accessibilityLabel="Buscar na cidade"
          returnKeyType="search"
          autoFocus
        />
      </View>

      <FlatList
        data={resultados}
        keyExtractor={chaveDe}
        contentContainerClassName="gap-3 px-4 pb-8 pt-2"
        ListEmptyComponent={
          <EstadoVazio
            ilustracao="vazio-comunidade"
            titulo="Nada encontrado por aqui"
            texto="Tente outra palavra ou procure pelo nome do bairro."
          />
        }
        renderItem={({ item, index }) => (
          <Entrada indice={index}>
            {item.tipo === "post" ? (
              <CartaoPost
                post={item.post}
                aoPressionar={() => router.push(`/pergunta/${item.post.id}`)}
              />
            ) : item.tipo === "grupo" ? (
              <CartaoGrupo
                grupo={item.grupo}
                aoPressionar={() => router.push(`/grupo/${item.grupo.id}`)}
              />
            ) : (
              <View className="w-1/2">
                <CartaoAnuncio
                  anuncio={item.anuncio}
                  aoPressionar={() => router.push(`/anuncio/${item.anuncio.id}`)}
                />
              </View>
            )}
          </Entrada>
        )}
      />
    </SafeAreaView>
  )
}
