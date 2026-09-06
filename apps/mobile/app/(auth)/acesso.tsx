// apps/mobile/app/(auth)/acesso.tsx
// Passo de e-mail da entrada nativa, no modo escolhido em boas-vindas.
//
// O envio é o mesmo mecanismo da web — `signInWithOtp` — mas o retorno é
// diferente: em vez de uma URL que o navegador abre, o GoTrue redireciona para
// o scheme do app, e o listener de app/_layout.tsx troca o `code` por sessão.
// Por isso `emailRedirectTo` aponta para o deep link, e não para localhost.
//
// A classificação do resultado segue a mesma regra da web
// (apps/web/lib/auth/entry-send.ts): a resposta visível não pode depender de o
// endereço ter conta. Aqui a regra é reimplementada em vez de importada porque
// web e mobile são builds separados — a mesma razão registrada em
// src/auth/publish-error.ts.
import * as Linking from "expo-linking"
import { useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import { supabase } from "../../src/auth/client"
import { AUTH_CALLBACK_PATH } from "../../src/auth/deep-link"
import { entryCopy, isPlausibleEmail, parseEntryMode } from "../../src/auth/entry-mode"
import { classifyEntrySend, type EntrySendView } from "../../src/auth/entry-send"
import { Button } from "../../src/components/ui/Button"
import { TextField } from "../../src/components/ui/TextField"
import { bodyLineHeight, theme } from "../../src/theme"

export default function AcessoScreen() {
  const params = useLocalSearchParams()
  const mode = parseEntryMode(params["modo"])
  const copy = entryCopy(mode)

  const [email, setEmail] = useState("")
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<EntrySendView | null>(null)

  const valid = isPlausibleEmail(email)
  const showError = touched && email.length > 0 && !valid

  const send = async () => {
    setTouched(true)
    if (!valid || sending) return
    setSending(true)
    setResult(null)

    let caught: unknown = null
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Linking.createURL respeita o scheme declarado em app.json e o
          // formato do Expo Go em desenvolvimento. O caminho tem que bater com
          // `additional_redirect_urls` no supabase/config.toml.
          emailRedirectTo: Linking.createURL(AUTH_CALLBACK_PATH),
          shouldCreateUser: mode === "criar-conta",
        },
      })
      caught = error
    } catch (thrown) {
      caught = thrown
    }

    setResult(classifyEntrySend(caught))
    setSending(false)
  }

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
            setResult(null)
          }}
          error={showError ? "Confira o endereço: falta o @ ou o domínio." : undefined}
          inputProps={{
            placeholder: "nome@exemplo.com",
            keyboardType: "email-address",
            autoCapitalize: "none",
            autoCorrect: false,
            autoComplete: "email",
            textContentType: "emailAddress",
            returnKeyType: "send",
            onSubmitEditing: () => void send(),
            editable: !sending,
          }}
        />

        {result && (
          <View
            style={[styles.notice, result.outcome === "sent" ? styles.noticeOk : styles.noticeWarn]}
            accessibilityRole="alert"
          >
            <Text style={styles.noticeTitle}>
              {result.outcome === "sent" ? "Confira seu e-mail" : "Não deu para enviar"}
            </Text>
            <Text style={styles.noticeText}>{result.message}</Text>
          </View>
        )}

        <Button
          label={copy.submit}
          loading={sending}
          loadingLabel="Enviando..."
          disabled={!valid}
          onPress={() => void send()}
        />

        {result?.outcome === "sent" && (
          <Text style={styles.footnote}>
            Abra o link neste aparelho para entrar. Ele vale uma vez só.
          </Text>
        )}
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
    borderRadius: theme.radius.base,
    borderWidth: 1,
    padding: theme.space[3],
    gap: theme.space[1],
  },
  noticeOk: {
    backgroundColor: theme.color.accentSoft,
    borderColor: theme.color.border,
  },
  noticeWarn: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.danger,
  },
  noticeTitle: {
    fontSize: theme.text.sm,
    fontWeight: "600",
    color: theme.color.foreground,
  },
  noticeText: {
    fontSize: theme.text.sm,
    color: theme.color.foreground,
    lineHeight: bodyLineHeight(theme.text.sm),
  },
  footnote: {
    fontSize: theme.text.xs,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.xs),
  },
})
