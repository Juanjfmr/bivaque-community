// apps/mobile/app/(auth)/acesso.tsx
// Entrar e criar conta com e-mail e senha, no modo escolhido em boas-vindas.
//
// ADR-20260907-login-com-senha: e-mail e senha para todos, simples como nos
// produtos que o público já usa. O envio de link saiu da tela; o mecanismo
// continua no servidor.
//
// A classificação do erro é a mesma regra da web (src/auth/password-auth.ts):
// senha errada e conta inexistente chegam com o mesmo código do GoTrue, e a
// tela não tem como distinguir — que é justamente o que impede alguém de
// descobrir quem é membro digitando endereços.

import * as Linking from "expo-linking"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { supabase } from "../../src/auth/client"
import { entryCopy, isPlausibleEmail, parseEntryMode } from "../../src/auth/entry-mode"
import {
  classifySignIn,
  classifySignUp,
  type PasswordAuthView,
  passwordProblem,
} from "../../src/auth/password-auth"
import { Button } from "../../src/components/ui/Button"
import { TextField } from "../../src/components/ui/TextField"
import { bodyLineHeight, theme } from "../../src/theme"

export default function AcessoScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const mode = parseEntryMode(params["modo"])
  const criando = mode === "criar-conta"
  const copy = entryCopy(mode)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PasswordAuthView | null>(null)

  const emailOk = isPlausibleEmail(email)
  const showEmailError = touched && email.length > 0 && !emailOk
  const canSubmit =
    emailOk && password.length > 0 && (!criando || (name.trim().length > 0 && accepted))

  const submit = async () => {
    setTouched(true)
    if (!canSubmit || busy) return

    // A senha só é conferida no cadastro. No login, recusar o formato aqui
    // contaria que a senha digitada não é a atual.
    if (criando) {
      const problem = passwordProblem(password)
      if (problem) {
        setResult({ outcome: "weak-password", message: problem, diagnostic: "local" })
        return
      }
    }

    setBusy(true)
    setResult(null)

    try {
      const view = criando
        ? classifySignUp(
            (
              await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { display_name: name.trim() } },
              })
            ).error,
          )
        : classifySignIn(
            (await supabase.auth.signInWithPassword({ email: email.trim(), password })).error,
          )

      if (view.outcome === "ok") {
        // O aceite é condição de existir a conta, então é gravado antes de a
        // pessoa seguir. Server Action não serve o nativo; o contrato é
        // POST /api/consent, que resolve o autor pelo token.
        if (criando) {
          const recorded = await recordConsent()
          if (!recorded) {
            setResult({
              outcome: "failed",
              message: "Conta criada, mas não foi possível registrar o aceite. Tente entrar.",
              diagnostic: "consent",
            })
            return
          }
        }
        router.replace("/(tabs)/cidade")
        return
      }
      setResult(view)
    } catch (thrown) {
      setResult(criando ? classifySignUp(thrown) : classifySignIn(thrown))
    } finally {
      setBusy(false)
    }
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

        {criando && (
          <TextField
            label="Como podemos chamar você?"
            value={name}
            onChangeText={setName}
            inputProps={{
              placeholder: "Seu nome",
              autoComplete: "name",
              textContentType: "name",
              editable: !busy,
            }}
          />
        )}

        <TextField
          label={copy.fieldLabel}
          value={email}
          onChangeText={(value) => {
            setEmail(value)
            setTouched(true)
            setResult(null)
          }}
          error={showEmailError ? "Confira o endereço: falta o @ ou o domínio." : undefined}
          inputProps={{
            placeholder: "nome@exemplo.com",
            keyboardType: "email-address",
            autoCapitalize: "none",
            autoCorrect: false,
            autoComplete: "email",
            textContentType: "emailAddress",
            editable: !busy,
          }}
        />

        <TextField
          label="Sua senha"
          value={password}
          onChangeText={(value) => {
            setPassword(value)
            setResult(null)
          }}
          hint={criando ? "Ao menos 8 caracteres, com letras e números." : undefined}
          inputProps={{
            placeholder: criando ? "Ao menos 8 caracteres" : "Sua senha",
            secureTextEntry: !showPassword,
            autoCapitalize: "none",
            autoCorrect: false,
            autoComplete: criando ? "new-password" : "current-password",
            textContentType: criando ? "newPassword" : "password",
            returnKeyType: "go",
            onSubmitEditing: () => void submit(),
            editable: !busy,
          }}
        />

        {/* Ver a senha digitada é acessibilidade antes de ser conveniência:
            quem tem dificuldade motora ou visual erra mais em campo mascarado,
            e este é o público que a decisão de senha quer atender. */}
        <Pressable
          onPress={() => setShowPassword((shown) => !shown)}
          accessibilityRole="switch"
          accessibilityState={{ checked: showPassword }}
          accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
          style={styles.reveal}
        >
          <Text style={styles.revealText}>{showPassword ? "Ocultar senha" : "Mostrar senha"}</Text>
        </Pressable>

        {criando && (
          <Pressable
            onPress={() => setAccepted((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="Li e aceito a Política de privacidade e o Código de conduta"
            style={styles.consentRow}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
              {accepted && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              Li e aceito a{" "}
              <Text style={styles.consentLink} onPress={() => void openDocument("privacidade")}>
                Política de privacidade
              </Text>{" "}
              e o{" "}
              <Text
                style={styles.consentLink}
                onPress={() => void openDocument("codigo-de-conduta")}
              >
                Código de conduta
              </Text>
              .
            </Text>
          </Pressable>
        )}

        {result && result.outcome !== "ok" && (
          <View style={styles.notice} accessibilityRole="alert">
            <Text style={styles.noticeText}>{result.message}</Text>
            {result.suggestSignIn && (
              <Pressable onPress={() => router.replace("/(auth)/acesso?modo=entrar")}>
                <Text style={styles.noticeLink}>Entrar com esta conta</Text>
              </Pressable>
            )}
          </View>
        )}

        <Button
          label={criando ? "Criar conta" : "Entrar"}
          loading={busy}
          loadingLabel={criando ? "Criando..." : "Entrando..."}
          disabled={!canSubmit}
          onPress={() => void submit()}
        />

        {!criando && (
          <Text style={styles.footnote}>
            Esqueceu a senha? Abra o Bivaque no navegador para criar uma nova.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// A versão completa abre no navegador do sistema: são documentos longos, e o
// app não tem (nem deve ter) leitor embutido — MOB-001 proíbe WebView.
const WEB_ORIGIN = process.env["EXPO_PUBLIC_WEB_ORIGIN"] ?? "https://bivaque.com.br"

async function openDocument(slug: "privacidade" | "codigo-de-conduta") {
  await Linking.openURL(`${WEB_ORIGIN}/${slug}`)
}

async function recordConsent(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return false
  try {
    const response = await fetch(`${WEB_ORIGIN}/api/consent`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.ok
  } catch {
    return false
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.background },
  scroll: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  heading: { gap: theme.space[2], marginBottom: theme.space[2] },
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space[3],
    minHeight: 44,
    paddingVertical: theme.space[2],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.color.controlBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: theme.color.accent,
    borderColor: theme.color.accent,
  },
  checkboxMark: {
    color: theme.color.accentForeground,
    fontSize: theme.text.sm,
    fontWeight: "700",
  },
  consentText: {
    flex: 1,
    fontSize: theme.text.sm,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.sm),
  },
  consentLink: {
    color: theme.color.accent,
    fontWeight: "600",
  },
  reveal: {
    minHeight: 44,
    justifyContent: "center",
  },
  revealText: {
    fontSize: theme.text.sm,
    fontWeight: "600",
    color: theme.color.accent,
  },
  notice: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.base,
    borderWidth: 1,
    borderColor: theme.color.danger,
    padding: theme.space[3],
    gap: theme.space[2],
  },
  noticeText: {
    fontSize: theme.text.sm,
    color: theme.color.foreground,
    lineHeight: bodyLineHeight(theme.text.sm),
  },
  noticeLink: {
    fontSize: theme.text.sm,
    fontWeight: "600",
    color: theme.color.accent,
  },
  footnote: {
    fontSize: theme.text.xs,
    color: theme.color.muted,
    lineHeight: bodyLineHeight(theme.text.xs),
  },
})
