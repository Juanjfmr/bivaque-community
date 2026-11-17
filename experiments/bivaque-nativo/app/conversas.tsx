import { router } from "expo-router"
import { FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Entrada } from "@/components/motion"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"
import { LinhaConversa } from "@/components/telas/linha-conversa"
import { Separator } from "@/components/ui/separator"
import { useConversas } from "@/lib/dados/estado"

export default function TelaConversas() {
  const conversas = useConversas()

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela
        titulo="Conversas"
        esquerda={<BotaoIcone nome="voltar" rotulo="Voltar" aoPressionar={() => router.back()} />}
      />
      <FlatList
        data={conversas}
        keyExtractor={(conversa) => conversa.id}
        ItemSeparatorComponent={Separator}
        contentContainerClassName="pb-8"
        renderItem={({ item, index }) => (
          <Entrada indice={index}>
            <LinhaConversa
              conversa={item}
              aoPressionar={() => router.push(`/conversa/${item.id}`)}
            />
          </Entrada>
        )}
      />
    </SafeAreaView>
  )
}
