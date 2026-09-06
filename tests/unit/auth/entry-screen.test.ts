import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// A primeira tela de entrada existe nas duas superfícies e precisa oferecer a
// mesma escolha explícita — entrar ou criar conta — apontando para as rotas
// certas. Estas asserções travam essa distinção contra uma regressão silenciosa
// (PROCESSO-DE-CONSTRUCAO §12.3).
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
const webEntryStyles = read(
  "apps",
  "web",
  "app",
  "(preauth)",
  "login",
  "components",
  "bivaque-sign-in.module.css",
)
const mobileIndex = read("apps", "mobile", "app", "index.tsx")
const mobileWelcome = read("apps", "mobile", "app", "(auth)", "boas-vindas.tsx")
const mobileAccess = read("apps", "mobile", "app", "(auth)", "acesso.tsx")
const mobileCallback = read("apps", "mobile", "app", "auth-callback.tsx")
const mobileLayout = read("apps", "mobile", "app", "_layout.tsx")

describe("web entry screen", () => {
  it("offers both paths as navigation to their own routes", () => {
    expect(webEntry).toContain('{ mode: "login", label: "Entrar", href: "/login" }')
    expect(webEntry).toContain('{ mode: "signup", label: "Criar conta", href: "/signup" }')
  })

  it("marks the active path for assistive technology", () => {
    expect(webEntry).toContain('aria-current={entry.mode === mode ? "page" : undefined}')
    expect(webEntry).toContain('aria-label="Escolha como entrar no Bivaque"')
  })

  it("keeps the switch options at the minimum touch target", () => {
    const option = webEntryStyles.match(/\.modeOption \{[^}]*\}/)?.[0] ?? ""
    expect(option).toContain("min-height: 44px")
  })

  it("uses the focus tokens for the visible ring, not the action colour", () => {
    expect(webEntryStyles).toContain("outline: 2px solid var(--semantic-focus-outer)")
    expect(webEntryStyles).not.toContain("outline: 2px solid var(--semantic-action-primary)")
  })
})

describe("mobile entry screen", () => {
  // Esta expectativa mudou em 2026-09-06, e não para ficar verde. A anterior
  // travava um redirecionamento incondicional para boas-vindas, que era certo
  // enquanto o app não tinha login. Com o login entregue, ela virou defeito:
  // medido no emulador, quem já tinha entrado era mandado fazer login de novo
  // a cada abertura. A cobertura sobe em vez de cair — antes bastava o destino
  // fixo, agora exige que a decisão venha da sessão.
  it("decides the entry from the session, never blindly", () => {
    expect(mobileIndex).toContain("supabase.auth")
    expect(mobileIndex).toContain("getSession()")
    expect(mobileIndex).toContain('"/(tabs)/cidade"')
    expect(mobileIndex).toContain('"/(auth)/boas-vindas"')
  })

  it("does not open content while the session is still unknown", () => {
    // Chutar o destino enquanto o secure-store responde é o que produz o
    // pisca-pisca de tela e, na direção errada, conteúdo para quem não entrou.
    expect(mobileIndex).toContain('destination === "loading"')
    expect(mobileIndex).toContain("ActivityIndicator")
  })

  it("treats an unreadable session as absent, not as access", () => {
    expect(mobileIndex).toMatch(/catch\([\s\S]*?setDestination\("entry"\)/)
  })

  it("carries the chosen mode to the e-mail step", () => {
    expect(mobileWelcome).toContain('router.push("/(auth)/acesso?modo=criar-conta")')
    expect(mobileWelcome).toContain('router.push("/(auth)/acesso?modo=entrar")')
  })

  it("does not turn account creation into community access", () => {
    expect(mobileWelcome).toContain(
      "Criar conta não concede participação em uma comunidade privada.",
    )
  })

  // Também substituída em 2026-09-06. A anterior travava a honestidade de um
  // botão desligado, o que era o contrato certo enquanto o envio não existia.
  // O envio agora existe e foi exercitado no emulador contra o GoTrue real, e
  // o que precisa de trava passa a ser o destino do retorno.
  it("sends through the real provider and returns to the app, not to the web", () => {
    expect(mobileAccess).toContain("supabase.auth.signInWithOtp")
    expect(mobileAccess).toContain("Linking.createURL(AUTH_CALLBACK_PATH)")
    expect(mobileAccess).not.toContain("localhost:3000")
    expect(mobileAccess).toContain('shouldCreateUser: mode === "criar-conta"')
  })

  it("keeps the native send under the same anti-enumeration rule as the web", () => {
    expect(mobileAccess).toContain("classifyEntrySend")
    // A tela não pode ramificar copy por causa da resposta do servidor: quem
    // decide o texto é o classificador, e ele colapsa conta inexistente em
    // "enviado". Ver src/auth/entry-send.ts.
    expect(mobileAccess).not.toContain("não encontrado")
    expect(mobileAccess).not.toContain("crie sua conta")
  })

  it("gives the deep-link return a real route, not a listener at the root", () => {
    // O listener na raiz fazia a troca e mesmo assim deixava a pessoa no
    // "Unmatched Route" do expo-router — provado no emulador em 2026-09-06.
    expect(mobileCallback).toContain("useAuthCallback")
    expect(mobileCallback).toContain('<Redirect href="/(tabs)/cidade" />')
    expect(mobileLayout).toContain('<Stack.Screen name="auth-callback"')
    expect(mobileLayout).not.toContain("useAuthDeepLink")
  })

  it("explains a failed return instead of leaving a blank screen", () => {
    expect(mobileCallback).toContain("Não deu para entrar")
    expect(mobileCallback).toContain("Pedir outro link")
  })
})
