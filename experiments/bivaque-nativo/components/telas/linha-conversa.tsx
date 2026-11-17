import { Text } from "@/components/ui/text"
import { type Conversa, pessoaPorId } from "@/lib/dados"
import { Pressable, View } from "react-native"
import { AvatarPessoa } from "./avatar-pessoa"

interface LinhaConversaProps {
  conversa: Conversa
  aoPressionar: () => void
}

/** Linha da lista de Conversas: pessoa, última mensagem, hora e não lidas. */
export function LinhaConversa({ conversa, aoPressionar }: LinhaConversaProps) {
  const pessoa = pessoaPorId(conversa.pessoaId)
  const ultima = conversa.mensagens[conversa.mensagens.length - 1]

  if (!pessoa || !ultima) return null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conversa com ${pessoa.nome}`}
      onPress={aoPressionar}
      className="flex-row items-center gap-3 px-4 py-3"
    >
      <AvatarPessoa pessoa={pessoa} tamanho={48} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center">
          <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
            {pessoa.nome}
          </Text>
          <Text className="text-xs text-muted-foreground">{ultima.hora}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text
            className={`flex-1 text-sm ${conversa.naoLidas > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
            numberOfLines={1}
          >
            {ultima.deMim ? "Você: " : ""}
            {ultima.texto}
          </Text>
          {conversa.naoLidas > 0 ? (
            <View className="h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
              <Text className="text-xs font-semibold text-primary-foreground">
                {conversa.naoLidas}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}
