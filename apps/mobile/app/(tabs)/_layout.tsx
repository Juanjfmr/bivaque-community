// apps/mobile/app/(tabs)/_layout.tsx
// Layout do navegador de tabs com os quatro containers do produto.
//
// Os containers derivam de docs/BIVAQUE.md §3.1 (três níveis de pertencimento)
// e §6.3 (os dois ciclos), e são EXATAMENTE quatro (VISUAL_GUIDE.md §0
// Navegação — teto de cinco, e o web tem quatro). Esta fundação espelha os
// rótulos e a ordem do bottom-nav do apps/web (apps/web/app/components/
// bivaque/bottom-nav.tsx), mas é implementação nativa própria — não há
// reembarque de UI web.
//
// Regra falsificável (ADR-20260816-shells-e-navegacao, regra 2): se um
// destino novo não couber em nenhum container, o destino está confuso —
// não falta aba. NÃO adicione uma quinta aba sem ADR.
import { Tabs } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { theme } from "../../src/theme"

interface TabIconProps {
  label: string
  focused: boolean
}

function TabIcon({ label, focused }: TabIconProps) {
  // Glifo unicode honesto para a fundação: o conteúdo das abas ainda
  // não existe, então o ícone também não. Mantemos um marcador simples,
  // acessível por VoiceOver/TalkBack via aria-label no Tabs.Screen abaixo.
  const glyph = label.charAt(0).toUpperCase()
  return (
    <View
      style={[
        tabStyles.iconWrap,
        {
          backgroundColor: focused ? theme.color.accentSoft : "transparent",
        },
      ]}
    >
      <Text
        style={[tabStyles.iconGlyph, { color: focused ? theme.color.accent : theme.color.muted }]}
      >
        {glyph}
      </Text>
    </View>
  )
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    minHeight: 28,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.base,
    paddingHorizontal: theme.space[2],
  },
  iconGlyph: {
    fontSize: theme.text.sm,
    fontWeight: "700",
  },
})

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.surface },
        headerTintColor: theme.color.foreground,
        headerTitleStyle: { fontWeight: "600" },
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.muted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          height: 64,
          paddingTop: theme.space[2],
          paddingBottom: theme.space[2],
        },
        tabBarLabelStyle: {
          fontSize: theme.text.xs,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="cidade"
        options={{
          title: "Cidade",
          tabBarLabel: "Cidade",
          tabBarAccessibilityLabel: "Cidade",
          tabBarIcon: ({ focused }) => <TabIcon label="Cidade" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Minha comunidade",
          tabBarLabel: "Minha comunidade",
          tabBarAccessibilityLabel: "Minha comunidade",
          tabBarIcon: ({ focused }) => <TabIcon label="Comunidade" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Grupos",
          tabBarLabel: "Grupos",
          tabBarAccessibilityLabel: "Grupos",
          tabBarIcon: ({ focused }) => <TabIcon label="Grupos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Eu",
          tabBarLabel: "Eu",
          tabBarAccessibilityLabel: "Eu",
          tabBarIcon: ({ focused }) => <TabIcon label="Eu" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
