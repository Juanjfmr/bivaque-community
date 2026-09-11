import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-018 — contrato das telas de entrada e confirmação (pranchas 36/37).
// Este arquivo trava o que uma refatoração silenciosa costuma perder: o
// endereço fora da URL, o painel expirado sem material vencido reenviável, o
// destino validado pós-entrada e o guarda anti-duplicação. As funções puras
// têm teste próprio (recon-018-resend-clock.test.ts); aqui é a costura.

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
const confirmarClient = read(
  "apps",
  "web",
  "app",
  "auth",
  "confirmar-email",
  "confirmar-email-client.tsx",
)
const confirmarPage = read("apps", "web", "app", "auth", "confirmar-email", "page.tsx")
const recoverPage = read("apps", "web", "app", "(preauth)", "recuperar-senha", "page.tsx")
const newPasswordPage = read("apps", "web", "app", "(preauth)", "nova-senha", "page.tsx")
const callbackRoute = read("apps", "web", "app", "auth", "callback", "route.ts")
const captureScript = read("scripts", "visual", "capture.mjs")

describe("entrada — destino pós-entrada só interno (R02)", () => {
  it("lê o redirect anotado pelo proxy e passa pelo sanitizador", () => {
    expect(webEntry).toContain('searchParams.get("redirect")')
    expect(webEntry).toContain("sanitizeNext")
    expect(webEntry).toContain("const destinoCadastro = destination()")
    expect(webEntry).toContain("window.location.assign(destinoCadastro)")
  })

  it("o Google leva o mesmo destino validado, não um hardcoded", () => {
    expect(webEntry).toMatch(/next=\$\{encodeURIComponent\(destination\(\) \?\? "\/onboarding"\)\}/)
  })

  it("envio em andamento não duplica", () => {
    expect(webEntry).toContain("if (loading !== null) return")
  })
})

describe("cadastro — R03 leva a R04 quando o provedor exige confirmação", () => {
  it("sem sessão após signUp, o caminho é a tela de confirmação", () => {
    expect(webEntry).toContain("if (!data.session) {")
    expect(webEntry).toContain('router.push("/auth/confirmar-email")')
    expect(webEntry).toContain("writePendingConfirmation")
  })

  it("com sessão, o aceite continua gravado na mesma hora", () => {
    expect(webEntry).toContain("recordConsentAction()")
  })

  it("o marcador do aceite viaja no link assinado pelo servidor, não em cookie forjável", () => {
    expect(webEntry).toContain("next=/auth/confirmar-email&consent=")
    expect(callbackRoute).toContain("shouldRecordSignupConsent")
    expect(callbackRoute).toContain("record_consent_acceptance")
    expect(callbackRoute).toContain("p_user_id: userId")
  })
})

describe("confirmação — prancha 37 sem as caixas de código", () => {
  it("mostra o cartão da referência: título, eco do endereço, alterar e reenvio", () => {
    expect(confirmarClient).toContain("Confira seu e-mail")
    expect(confirmarClient).toContain("Alterar e-mail")
    expect(confirmarClient).toContain("Reenviar em")
    expect(confirmarClient).toContain("emailEcho")
  })

  it("não há campo de dígito nenhum: o mecanismo é o link (R04)", () => {
    expect(confirmarClient).not.toContain("<input")
    expect(confirmarClient).not.toContain("maxLength={1}")
  })

  it("estado expirado oferece envio novo, sem reenviar material vencido", () => {
    expect(confirmarClient).toContain("Este link expirou ou já foi usado")
    expect(confirmarClient).toContain("Enviar novo link")
    expect(confirmarClient).toContain('searchParams.get("estado") === "expirado"')
  })

  it("o reenvio só anda depois de o servidor aceitar, e o 429 do servidor manda", () => {
    expect(confirmarClient).toContain("classifyResend")
    expect(confirmarClient).toContain('view.outcome === "sent"')
    expect(confirmarClient).toContain("serverSeconds: view.retryAfterSeconds")
  })

  it("nenhum endereço vaza em query, título ou caminho de redirect", () => {
    for (const source of [confirmarClient, confirmarPage, webEntry, callbackRoute]) {
      expect(source).not.toContain("?email=")
      expect(source).not.toContain("email=${")
    }
    expect(confirmarPage).toContain('title: "Confira seu e-mail — Bivaque"')
  })
})

describe("recuperação — neutra, mas distinguível (R07)", () => {
  it("usa o classificador compartilhado anti-enumeração", () => {
    expect(recoverPage).toContain("classifyEntrySend")
    expect(recoverPage).toContain("puder entrar no Bivaque")
  })

  it("limite e rede não se disfarçam de enviado", () => {
    expect(recoverPage).toContain('view.outcome === "rate-limited"')
    expect(recoverPage).toContain("setOffline(true)")
    expect(recoverPage).toMatch(/Aguarde \$\{formatCountdown\(cooldown\)\}/)
  })
})

describe("senha nova — devolve ao destino autorizado, não ao portão morto (R08)", () => {
  it("não manda mais para /consent", () => {
    expect(newPasswordPage).not.toContain('router.push("/consent")')
    expect(newPasswordPage).toContain('router.push("/")')
  })
})

describe("captura — as rotas tocadas estão cadastradas no capturador", () => {
  it("registra login, signup, recuperar, nova-senha e os três painéis da confirmação", () => {
    for (const needle of [
      '"/login"',
      '"/signup"',
      '"/recuperar-senha"',
      '"/nova-senha"',
      '"/auth/confirmar-email"',
      '"/auth/confirmar-email?estado=expirado"',
      "auth-confirmar-email-pendente",
      "pendingEmail",
    ]) {
      expect(captureScript).toContain(needle)
    }
  })
})
