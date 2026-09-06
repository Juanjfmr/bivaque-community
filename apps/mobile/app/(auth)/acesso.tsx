// apps/mobile/app/(auth)/acesso.tsx
// Passo de e-mail da entrada nativa, no modo escolhido em boas-vindas.
//
// LIMITE DELIBERADO desta tarefa: a tela coleta e valida o endereço, mas NÃO
// envia nada. O envio depende de uma mudança no contrato de autenticação do
// mobile que ainda não foi feita — o cliente Supabase nativo roda com
// `detectSessionInUrl: false` (apps/mobile/src/auth/client.ts) e não há
// callback de deep link que conclua um magic link no aparelho. Ligar o envio
// aqui produziria um e-mail cujo link não volta para o app.
//
// Por isso a ação principal fica indisponível e a razão é dita à pessoa, em vez
// de simulada com um toast de sucesso (PROCESSO-DE-CONSTRUCAO §9 e §12.4).
import { useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import { entryCopy, isPlausibleEmail, parseEntryMode } from "../../src/auth/entry-mode"
import { Button } from "../../src/components/ui/Button"
import { TextField } from "../../src/components/ui/TextField"
import { bodyLineHeight, theme } from "../../src/theme"

const PENDING_NOTICE =
  "O envio do link de acesso ainda não está ligado no aplicativo. Enquanto isso, entre pelo Bivaque no navegador."

export default function AcessoScreen() {
  const params = useLocalSearchParams()
  const mode = parseEntryMode(params["modo"])
  const copy = entryCopy(mode)

  const [email, setEmail] = useState("")
  const [touched, setTouched] = useState(false)

  const valid = isPlausibleEmail(email)
  const showError = touched && email.length > 0 && !valid

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.lead}>{copy.description}</Text>
        </View>

        <TextField
          label={copy.fieldLabel}
          value={email}
          onChangeText={(value) => {
            setEmail(value)
            setTouched(true)
          }}
          error={showError ? "Confira o endereço: falta o @ ou o domínio." : undefined}
          inputProps={{
            placeholder: "nome@exemplo.com",
            keyboardType: "email-address",
            autoCapitalize: "none",
            autoCorrect: false,
            autoComplete: "email",
            textContentType: "emailAddress",
            returnKeyType: "done",
          }}
        />

        <View style={styles.notice} accessibilityRole="alert">
          <Text style={styles.noticeText}>{PENDING_NOTICE}</Text>
        </View>

        <Button label={copy.submit} disabled onPress={() => undefined} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  scroll: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[6],
  },
  heading: {
    gap: theme.space[2],
  },
  title: {
    fontSize: theme.text.xl,
    fontWeight: "700",
    color: theme.color.foreground,
    lineHeight: theme.text.xl * 1.25,
  },
  lead: {
    fontSize: theme.text.base,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.base),
  },
  notice: {
    backgroundColor: theme.color.accentSoft,
    borderRadius: theme.radius.base,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space[3],
  },
  noticeText: {
    fontSize: theme.text.sm,
    color: theme.color.foreground,
    lineHeight: bodyLineHeight(theme.text.sm),
  },
})
