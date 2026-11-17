import { router, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { EstadoVazio } from "@/components/motion"
import { BotaoIcone } from "@/components/telas/botao-icone"
import { CabecalhoTela } from "@/components/telas/cabecalho-tela"

const TEXTOS: Record<string, string> = {
  eventos:
    "As feiras, encontros e mutirões do seu bairro vão aparecer aqui, com data, local e quem vai.",
  guia: "O guia de serviços indicados pelos vizinhos: eletricista, escola, farmácia e o que mais a cidade confiar.",
  negocios: "Os negócios do bairro, com contato direto de quem atende perto de você.",
}

export default function TelaEmBreve() {
  const { tema } = useLocalSearchParams<{ tema?: string }>()
  const texto =
    (tema ? TEXTOS[tema] : undefined) ??
    "Esta parte da cidade ainda está sendo preparada, com calma e com a ajuda dos vizinhos."

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <CabecalhoTela
        titulo="Em breve"
        esquerda={<BotaoIcone nome="voltar" rotulo="Voltar" aoPressionar={() => router.back()} />}
      />
      <EstadoVazio
        ilustracao="boas-vindas"
        titulo="Chega em breve"
        texto={texto}
        acao={{ rotulo: "Voltar", aoPressionar: () => router.back() }}
      />
    </SafeAreaView>
  )
}
