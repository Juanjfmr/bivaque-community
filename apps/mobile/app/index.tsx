// apps/mobile/app/index.tsx
// Rota de entrada do expo-router: decide entre a apresentação e o conteúdo.
//
// Histórico das duas decisões erradas que este arquivo já teve, porque as duas
// eram a mesma decisão errada — redirecionar sem olhar o estado:
//
//   1. Sem match para "/", o app abria no "Unmatched Route" (emulador,
//      2026-09-03).
//   2. Redirecionando sempre para `(tabs)/cidade`, abria conteúdo que ninguém
//      sem sessão pode ver.
//   3. Redirecionando sempre para `(auth)/boas-vindas`, quem já tinha entrado
//      era mandado fazer login de novo a cada abertura — medido no emulador em
//      2026-09-06, logo depois de um login bem-sucedido.
//
// A sessão é a única coisa que responde a pergunta, e lê-la é assíncrono: o
// supabase-js precisa acordar o token do secure-store. Por isso existe um
// estado de espera aqui, e não um chute enquanto ela não chega.
import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { supabase } from "../src/auth/client"
import { theme } from "../src/theme"

type Destination = "loading" | "content" | "entry"

export default function Index() {
  const [destination, setDestination] = useState<Destination>("loading")

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setDestination(data.session ? "content" : "entry")
      })
      .catch(() => {
        // Storage corrompido, token ilegível, keychain indisponível: tratamos
        // como ausência de sessão. Mandar para a entrada é recuperável; abrir
        // conteúdo com sessão duvidosa não é.
        if (active) setDestination("entry")
      })

    return () => {
      active = false
    }
  }, [])

  if (destination === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.color.accent} />
      </View>
    )
  }

  return <Redirect href={destination === "content" ? "/(tabs)/cidade" : "/(auth)/boas-vindas"} />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.background,
  },
})
