import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// ADR-20260907-consentimento-no-cadastro: o aceite é uma linha do formulário de
// cadastro, com link para a versão completa. Não é tela, não é portão, e não
// reaparece depois.
//
// O que precisa de trava aqui não é a aparência da linha — é o que a torna
// legítima: o registro no servidor antes de a pessoa seguir, e o autor vindo do
// token e nunca do corpo. Sem isso o aceite existe na tela e não existe como
// prova, que é o pior dos dois mundos.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const webEntry = read(
  "apps",
  "web",
  "app",
  "(preauth)",
  "login",
  "components",
  "bivaque-sign-in.tsx",
)
const mobileEntry = read("apps", "mobile", "app", "(auth)", "acesso.tsx")
const consentRoute = read("apps", "web", "app", "api", "consent", "route.ts")
const consentActions = read("apps", "web", "app", "(preauth)", "consent", "actions.ts")
const callbackRoute = read("apps", "web", "app", "auth", "callback", "route.ts")
const signupIntent = read("apps", "web", "lib", "auth", "signup-intent.ts")
const proxy = read("apps", "web", "proxy.ts")

describe("o aceite aparece no cadastro, e só nele", () => {
  it("a web pede o aceite ao criar conta e não ao entrar", () => {
    expect(webEntry).toContain('mode === "signup" && (')
    expect(webEntry).toContain("Li e aceito a")
    expect(webEntry).toContain('pathname: "/privacidade"')
    expect(webEntry).toContain('pathname: "/codigo-de-conduta"')
  })

  it("criar conta fica bloqueado enquanto o aceite não é marcado", () => {
    expect(webEntry).toContain('mode === "signup" && !accepted')
    expect(mobileEntry).toContain("name.trim().length > 0 && accepted")
  })

  it("o mobile pede o mesmo aceite, com a versão completa fora do app", () => {
    expect(mobileEntry).toContain("Li e aceito a")
    expect(mobileEntry).toContain('openDocument("privacidade")')
    expect(mobileEntry).toContain('openDocument("codigo-de-conduta")')
    // MOB-001 proíbe leitor embutido: documento longo abre no navegador do
    // sistema. A trava é sobre o import, não sobre a palavra no comentário.
    expect(mobileEntry).toContain("Linking.openURL")
    expect(mobileEntry).not.toContain("react-native-webview")
    expect(mobileEntry).not.toContain("expo-web-browser")
  })
})

describe("o aceite é registrado no servidor, não só na tela", () => {
  it("a web grava antes de navegar", () => {
    expect(webEntry).toContain("recordConsentAction()")
    // A gravação precisa acontecer no ramo de sucesso do cadastro, antes do
    // push. Um aceite marcado e não gravado é um aceite que ninguém prova.
    const signupBranch = webEntry.slice(
      webEntry.indexOf("classifySignUp(error)"),
      webEntry.indexOf("} else {"),
    )
    expect(signupBranch).toContain("recordConsentAction()")
    expect(signupBranch.indexOf("recordConsentAction()")).toBeLessThan(
      signupBranch.indexOf('router.push("/onboarding")'),
    )
  })

  it("o mobile grava pelo contrato HTTP, porque Server Action não serve o app", () => {
    expect(mobileEntry).toContain("/api/consent")
    expect(mobileEntry).toContain("recordConsent()")
  })

  it("o endpoint resolve o autor pelo token, nunca pelo corpo", () => {
    expect(consentRoute).toContain("authHeader.slice(7)")
    expect(consentRoute).toContain("p_user_id: user.id")
    // Aceitar o id do corpo deixaria qualquer pessoa registrar aceite em nome
    // de outra, e aceite falso é pior do que aceite ausente.
    expect(consentRoute).not.toContain("body.user_id")
    expect(consentRoute).not.toContain("request.json()")
  })

  it("as versões vêm do contrato compartilhado, não de quem chama", () => {
    expect(consentRoute).toContain("p_consent_version: CONSENT_VERSION")
    expect(consentRoute).toContain("p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION")
  })

  it("Google no cadastro inicia um intent server-side antes do OAuth", () => {
    expect(consentActions).toContain("prepareSignupConsentAction")
    expect(consentActions).toContain("httpOnly: true")
    expect(webEntry).toContain("await prepareSignupConsentAction()")
    expect(webEntry).toContain("&flow=signup")
    expect(webEntry).not.toContain("consent=")
    expect(webEntry.indexOf("await prepareSignupConsentAction()")).toBeLessThan(
      webEntry.indexOf("signInWithOAuth"),
    )
    expect(webEntry.indexOf("await prepareSignupConsentAction()")).toBeLessThan(
      webEntry.indexOf("supabase.auth.signUp"),
    )
  })

  it("o callback só registra o aceite quando o marker ou o intent server-side existe", () => {
    expect(signupIntent).toContain("SIGNUP_CONSENT_INTENT_COOKIE")
    expect(signupIntent).toContain("hasSignupConsentIntent")
    expect(callbackRoute).toContain('searchParams.get("flow") === "signup"')
    expect(callbackRoute).toContain("hasSignupConsentIntent")
    expect(callbackRoute).toContain(
      'cookieStore.delete({ name: SIGNUP_CONSENT_INTENT_COOKIE, path: "/auth" })',
    )
  })
})

describe("o portão saiu do proxy", () => {
  it("nenhuma navegação é desviada para /consent", () => {
    expect(proxy).not.toContain('new URL("/consent", request.url)')
  })
})
