import { router, Tabs } from "expo-router"
import { useColorScheme } from "nativewind"
import { type ColorValue, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icone, type NomeIcone } from "@/components/icons"
import { BotaoCriar } from "@/components/motion"
import { HEX } from "@/lib/theme"

// Navegação do Bivaque: Início · Comunidade · [Criar] · Mercado · Você; Conversas no topo.
const ABAS: { rota: string; titulo: string; icone: NomeIcone }[] = [
  { rota: "index", titulo: "Início", icone: "inicio" },
  { rota: "comunidade", titulo: "Comunidade", icone: "comunidade" },
  { rota: "mercado", titulo: "Mercado", icone: "mercado" },
  { rota: "voce", titulo: "Você", icone: "voce" },
]

export default function LayoutAbas() {
  const { colorScheme } = useColorScheme()
  const recuo = useSafeAreaInsets()
  const cores = HEX[colorScheme ?? "light"]

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.foreground,
        tabBarInactiveTintColor: cores.mutedForeground,
        tabBarStyle: {
          backgroundColor: cores.card,
          borderTopColor: cores.border,
          height: 64 + recuo.bottom,
          paddingBottom: recuo.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {ABAS.slice(0, 2).map((aba) => (
        <Tabs.Screen key={aba.rota} name={aba.rota} options={opcoes(aba.titulo, aba.icone)} />
      ))}
      <Tabs.Screen
        name="criar-atalho"
        options={{
          title: "Criar",
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <BotaoCriar aoPressionar={() => router.push("/criar")} />
            </View>
          ),
        }}
      />
      {ABAS.slice(2).map((aba) => (
        <Tabs.Screen key={aba.rota} name={aba.rota} options={opcoes(aba.titulo, aba.icone)} />
      ))}
    </Tabs>
  )
}

function opcoes(titulo: string, icone: NomeIcone) {
  return {
    title: titulo,
    tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <Icone nome={icone} cor={color} ativo={focused} tamanho={24} />
    ),
  }
}
