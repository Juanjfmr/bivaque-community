import { Pressable, Share, View } from "react-native"
import { Icone, type NomeIcone } from "@/components/icons"
import { Pressionavel } from "@/components/motion"
import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { type Post, pessoaPorId } from "@/lib/dados"
import { alternarUtil, useUtil } from "@/lib/dados/estado"
import { AvatarPessoa } from "./avatar-pessoa"
import { BotaoIcone } from "./botao-icone"
import { useCores } from "./cores"

interface CartaoPostProps {
  post: Post
  /** Tocar no cartão, em Comentar, abre o detalhe da publicação. */
  aoPressionar?: () => void
}

/** Cartão do feed: autor, bairro · tempo, texto e ações em pílulas. */
export function CartaoPost({ post, aoPressionar }: CartaoPostProps) {
  const cores = useCores()
  const util = useUtil(post.id)
  const autor = pessoaPorId(post.autorId)

  if (!autor) return null

  return (
    <Card className="gap-3 rounded-xl border-border p-4">
      <Pressionavel
        className="gap-3"
        disabled={!aoPressionar}
        onPress={aoPressionar}
        accessibilityRole={aoPressionar ? "button" : undefined}
        accessibilityLabel={post.texto}
      >
        <View className="flex-row items-center gap-3">
          <AvatarPessoa pessoa={autor} />
          <View className="flex-1">
            <Text className="text-base font-semibold">{autor.nome}</Text>
            <Text className="text-xs text-muted-foreground">
              {post.bairro} · {post.tempo}
            </Text>
          </View>
        </View>
        <Text className="text-base leading-6">{post.texto}</Text>
      </Pressionavel>

      <View className="flex-row items-center">
        <Pilula
          nome="util"
          rotulo={`Útil ${post.uteis + (util ? 1 : 0)}`}
          ativo={util}
          cor={util ? cores.foreground : cores.mutedForeground}
          aoPressionar={() => alternarUtil(post.id)}
        />
        <Pilula
          nome="comentar"
          rotulo={`Comentar ${post.comentarios}`}
          cor={cores.mutedForeground}
          aoPressionar={() => aoPressionar?.()}
        />
        <View className="flex-1" />
        <BotaoIcone
          nome="compartilhar"
          rotulo="Compartilhar publicação"
          aoPressionar={() => {
            void Share.share({ message: post.texto }).catch(() => undefined)
          }}
        />
      </View>
    </Card>
  )
}

interface PilulaProps {
  nome: NomeIcone
  rotulo: string
  ativo?: boolean
  cor: string
  aoPressionar: () => void
}

function Pilula({ nome, rotulo, ativo = false, cor, aoPressionar }: PilulaProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativo }}
      onPress={aoPressionar}
      className="mr-1 h-11 flex-row items-center gap-1.5 rounded-full bg-muted px-3"
    >
      <Icone nome={nome} tamanho={18} cor={cor} ativo={ativo} />
      <Text className="text-sm text-muted-foreground">{rotulo}</Text>
    </Pressable>
  )
}
