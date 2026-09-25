import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Este arquivo travava o contrato "entrada sem senha": proibia "Esqueci minha
// senha" e "Manter conectado" em apps/web/app, e exigia a copy "Sem senha para
// lembrar". Nenhuma ADR havia decidido aquilo — era um padrão implementado com
// um teste guardando.
//
// ADR-20260907-login-com-senha o substitui, por instrução do responsável pelo
// produto: o público mais velho não tem facilidade com e-mail nem com login sem
// senha. A cobertura não some, muda de alvo. O que passa a ser travado é o que
// pode se perder numa refatoração e custar caro:
//
//   1. a mesma resposta para senha errada e para conta inexistente;
//   2. a existência da recuperação, sem a qual senha vira armadilha;
//   3. a separação entre retomar conta e criar conta.

const root = join(import.meta.dirname, "..", "..", "..")
const appDir = join(root, "apps", "web", "app")
const loginComponent = join(appDir, "(preauth)", "login", "components", "bivaque-sign-in.tsx")
const signupPage = join(appDir, "(preauth)", "signup", "page.tsx")
const landingPage = join(appDir, "landing", "landing.tsx")
const classifier = join(root, "apps", "web", "lib", "auth", "password-auth.ts")
const recoverPage = join(appDir, "(preauth)", "recuperar-senha", "page.tsx")
const newPasswordPage = join(appDir, "(preauth)", "nova-senha", "nova-senha-client.tsx")
const newPasswordServerPage = join(appDir, "(preauth)", "nova-senha", "page.tsx")

function collectSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectSourceFiles(full))
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) files.push(full)
  }
  return files
}

const sourceFiles = collectSourceFiles(appDir)
const read = (path: string) => readFileSync(path, "utf8")

describe("login com senha não revela quem tem conta", () => {
  it("usa uma mensagem única para credencial inválida", () => {
    const source = read(classifier)
    expect(source).toContain("E-mail ou senha incorretos.")
    // O GoTrue devolve invalid_credentials tanto para senha errada quanto para
    // conta inexistente — medido em 2026-09-07. Tratar os dois no mesmo ramo é
    // o que impede a tela de distinguir.
    expect(source).toContain('code === "invalid_credentials"')
  })

  it("nenhuma tela diz que a conta não existe", () => {
    const proibidas = ["conta não encontrada", "e-mail não cadastrado", "usuário não existe"]
    for (const frase of proibidas) {
      const offenders = sourceFiles.filter((file) =>
        read(file).toLowerCase().includes(frase.toLowerCase()),
      )
      expect(offenders).toEqual([])
    }
  })

  it("o pedido de recuperação responde igual, tenha o e-mail conta ou não", () => {
    const source = read(recoverPage)
    expect(source).toContain("puder entrar no Bivaque")
    // O erro do provedor é deliberadamente ignorado nesse fluxo; só falha de
    // transporte muda a resposta.
    expect(source).toContain("setOffline(true)")
  })
})

describe("senha vem acompanhada de recuperação", () => {
  it("a tela de entrar oferece o caminho de recuperar", () => {
    expect(read(loginComponent)).toContain("Esqueci minha senha")
    expect(read(loginComponent)).toContain('pathname: "/recuperar-senha"')
  })

  it("a rota de definir senha nova existe e recusa link sem sessão", () => {
    const source = read(newPasswordPage)
    expect(source).toContain("Este link não vale mais")
    expect(source).toContain("Pedir outro link")
    expect(source).toContain("updatePasswordFromRecoveryAction")
    expect(source).not.toContain("createBrowserClient().auth.updateUser")
  })

  it("a tela server-side exige o intent de recuperação antes de renderizar o formulário", () => {
    const source = read(newPasswordServerPage)
    expect(source).toContain("RECOVERY_INTENT_COOKIE")
    expect(source).toContain("hasRecoveryIntent")
  })

  it("a política de senha espelha a do provedor, sem exigência inventada", () => {
    const source = read(classifier)
    expect(source).toContain("PASSWORD_MIN_LENGTH = 8")
    expect(source).not.toContain("símbolo")
    expect(source).not.toContain("maiúscula")
  })
})

describe("retomar conta e criar conta continuam separados", () => {
  it("cada caminho tem sua rota e sua operação no provedor", () => {
    const entrySource = read(loginComponent)
    expect(read(signupPage)).toContain('mode="signup"')
    expect(entrySource).toContain("signInWithPassword")
    expect(entrySource).toContain("signUp")
    expect(entrySource).toContain('alternateHref: "/signup"')
    expect(read(landingPage)).toContain('pathname: "/signup"')
  })
})
