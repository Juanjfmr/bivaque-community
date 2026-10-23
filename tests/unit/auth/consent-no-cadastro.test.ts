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
//
// PORT-003: a linha passou a ser um componente só (`entry-consent.tsx`), usado
// pelo cadastro e pelo passo Aceite do Google, e o envio deixou de depender de
// um botão desligado — a especificação valida no envio e explica o que falta. A
// cobertura não cai: o que se passa a exigir é a ORDEM, e ela é provada na
// função pura (`entry-form.test.ts`).

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
const consentLine = read(
  "apps",
  "web",
  "app",
  "(preauth)",
  "login",
  "components",
  "entry-consent.tsx",
)
const consentForm = read("apps", "web", "app", "(preauth)", "consent", "consent-form.tsx")
const mobileEntry = read("apps", "mobile", "app", "(auth)", "acesso.tsx")
const consentRoute = read("apps", "web", "app", "api", "consent", "route.ts")
const proxy = read("apps", "web", "proxy.ts")

describe("o aceite aparece no cadastro, e só nele", () => {
  it("a web pede o aceite ao criar conta e não ao entrar", () => {
    // A linha existe num componente só, e é o cadastro que a monta.
    expect(webEntry).toContain('mode === "signup" && (')
    expect(webEntry).toContain("<EntryConsent")
    expect(consentLine).toContain("Li e aceito a")
    expect(consentLine).toContain('pathname: "/privacidade"')
    expect(consentLine).toContain('pathname: "/codigo-de-conduta"')
  })

  it("criar conta é barrado sem o aceite, antes de qualquer request", () => {
    // O protótipo deixa o botão ativo e explica no envio; o portão de verdade é
    // o servidor. O que precisa continuar impossível é criar conta sem aceite —
    // e a validação roda antes de o cliente do provedor ser criado.
    expect(webEntry).toContain("signupProblem({ accepted, email, name, password })")
    expect(webEntry.indexOf("signupProblem(")).toBeLessThan(
      webEntry.indexOf("supabase.auth.signUp("),
    )
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

  it("o passo Aceite do Google grava pelo mesmo caminho", () => {
    // PR #104: quem entrou pelo Google não passou pelo cadastro, e o aceite
    // dele é registrado aqui, com o mesmo `recordConsentAction`.
    expect(consentForm).toContain("recordConsentAction()")
    expect(consentForm).toContain("Concordar e continuar")
    expect(consentForm).toContain("Para continuar, aceite a Política de privacidade")
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
})

describe("o portão saiu do proxy", () => {
  it("nenhuma navegação é desviada para /consent", () => {
    expect(proxy).not.toContain('new URL("/consent", request.url)')
  })
})
