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
// PORT-003: a entrada deixou de ter folha própria. A pele vem da casca da
// PORT-002 (`components/entry/entry.css`), e o que faltava nela mora em
// `entry-auth.css`, no mesmo diretório do componente.
const entryShellCss = read("apps", "web", "app", "components", "entry", "entry.css")
const entryFormsCss = read(
  "apps",
  "web",
  "app",
  "(preauth)",
  "login",
  "components",
  "entry-auth.css",
)
const brandTokens = read("apps", "web", "app", "brand-tokens.css")
const mobileIndex = read("apps", "mobile", "app", "index.tsx")
const mobileWelcome = read("apps", "mobile", "app", "(auth)", "boas-vindas.tsx")
const mobileAccess = read("apps", "mobile", "app", "(auth)", "acesso.tsx")
const mobileCallback = read("apps", "mobile", "app", "auth-callback.tsx")
const mobileLayout = read("apps", "mobile", "app", "_layout.tsx")

describe("web entry screen", () => {
  // Expectativas atualizadas em 2026-09-07 contra a prancha 36-web-auth-entrada,
  // e de novo em 2026-10-22 contra a entrada do protótipo (PORT-003,
  // ADR-20261022-entrada-do-prototipo). A anterior travava a troca por abas
  // (modeSwitch + aria-current); a prancha aprovada não tem abas — cada tela é um
  // destino com título próprio. Agora os dois destinos são os da especificação.
  it("offers both paths as navigation to their own routes", () => {
    expect(webEntry).toContain('alternateHref: "/signup"')
    expect(webEntry).toContain('alternateHref: "/login"')
  })

  it("leads each path with the heading from the reference", () => {
    expect(webEntry).toContain("Que bom ter você de volta.")
    expect(webEntry).toContain("Vamos começar.")
  })

  it("keeps the footer at the minimum touch target", () => {
    // O pé da entrada passou a ser botão de texto do Material, e a altura mínima
    // é a do componente nos tokens da marca — não uma regra local que cada tela
    // repetiria. O `flex-wrap` mantém os dois botões lado a lado em 1440 e um por
    // linha em 375.
    expect(brandTokens).toMatch(/--md-text-button-container-height:\s*44px/)
    expect(entryShellCss).toContain(".bv-entry .en-foot {")
    expect(entryFormsCss).toContain("flex-wrap: wrap")
  })

  it("uses the brand token for the visible ring, not a loose colour", () => {
    // O anel de foco é o da casca, desenhado com o token da marca; nenhuma regra
    // da entrada pinta foco com cor solta (o teste de escopo também recusa `#`).
    expect(entryShellCss).toMatch(/\.bv-entry :focus-visible \{[^}]*var\(--md-sys-color-primary\)/)
    for (const css of [entryShellCss, entryFormsCss]) {
      expect(css).not.toMatch(/outline:\s*\d+px solid rgb\(/)
    }
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

  // Substituída duas vezes em dois dias, e as duas por decisão registrada.
  // Em 06/09 travava um botão desligado, contrato certo enquanto o envio não
  // existia. Em 07/09 travava o envio de link, que ADR-20260907-login-com-senha
  // tirou da tela por instrução do responsável: e-mail e senha para todos.
  // O que a tela faz agora é entrar, e é isso que passa a ser travado.
  it("entra com e-mail e senha, sem enviar link", () => {
    expect(mobileAccess).toContain("signInWithPassword")
    expect(mobileAccess).toContain("supabase.auth.signUp")
    expect(mobileAccess).not.toContain("signInWithOtp")
    expect(mobileAccess).not.toContain("localhost:3000")
  })

  it("keeps the native send under the same anti-enumeration rule as the web", () => {
    // O classificador mudou de nome junto com o mecanismo; a regra não mudou.
    // Senha errada e conta inexistente chegam com o mesmo código do GoTrue, e a
    // tela não pode ramificar copy por causa da resposta do servidor.
    expect(mobileAccess).toContain("classifySignIn")
    expect(mobileAccess).not.toContain("não encontrado")
    expect(mobileAccess).not.toContain("crie sua conta")
    expect(mobileAccess).not.toContain("senha incorreta")
  })

  it("a infraestrutura de deep link continua, porque o Google precisa dela", () => {
    // Tirar o link mágico da tela não torna o retorno por deep link descartável:
    // OAuth nativo volta pelo mesmo caminho. Apagar isso junto com o link seria
    // jogar fora o que a próxima tarefa precisa.
    expect(mobileCallback).toContain("useAuthCallback")
    expect(mobileLayout).toContain('<Stack.Screen name="auth-callback"')
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
