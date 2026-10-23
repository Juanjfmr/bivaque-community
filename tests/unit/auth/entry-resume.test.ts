import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ENTRY_RESUME_PATH, shouldShowEntryResume } from "web/lib/auth/entry-progress"

// PORT-003 (frente A do lote 4): "Você já começou", o item 5 do
// ADR-20261022-entrada-do-prototipo. A decisão é uma regra só, e é ela que este
// arquivo trava: sessão sem membership = entrada em andamento. O resto da prova
// é a costura no servidor (as duas páginas) e a tela em si (os dois caminhos e o
// diálogo de confirmação), que ficam logo abaixo em contrato de fonte.
//
// A regra antiga, que este arquivo substitui, era "não existe retomada": quem
// voltasse à entrada via o formulário de novo e a conta já criada ficava
// indistinguível de uma nova. Era o defeito 5 do mapeamento protótipo × Next.

describe("quando mostrar Você já começou", () => {
  it("sessão sem membership é entrada em andamento", () => {
    expect(shouldShowEntryResume({ accountKind: null, hasSession: true })).toBe(true)
  })

  it("sem sessão a tela é a entrada normal", () => {
    expect(shouldShowEntryResume({ accountKind: null, hasSession: false })).toBe(false)
  })

  it("membro e prestador não retomam a entrada de membro", () => {
    expect(shouldShowEntryResume({ accountKind: "member", hasSession: true })).toBe(false)
    expect(shouldShowEntryResume({ accountKind: "provider", hasSession: true })).toBe(false)
  })

  it("continuar de onde parei entrega o funil, e o proxy resolve o passo", () => {
    // O passo real (CPF, análise ou cidade) é estado do servidor: a tela não
    // adivinha, e o endereço é o mesmo que o proxy já interpreta.
    expect(ENTRY_RESUME_PATH).toBe("/onboarding")
  })
})

const root = join(process.cwd())
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const loginPage = read("apps", "web", "app", "(preauth)", "login", "page.tsx")
const signupPage = read("apps", "web", "app", "(preauth)", "signup", "page.tsx")
const resume = read("apps", "web", "app", "(preauth)", "login", "components", "entry-resume.tsx")
const session = read("apps", "web", "lib", "auth", "entry-session.ts")

describe("a tela mora nas duas portas da entrada", () => {
  it("login e cadastro perguntam ao servidor antes de desenhar", () => {
    // Quem decide é o servidor: a sessão vem dos cookies e o tipo da conta do
    // banco. Estado de cliente aqui seria a tela negando ou liberando a
    // retomada com informação que ela não tem.
    for (const page of [loginPage, signupPage]) {
      expect(page).toContain("readEntrySession")
      expect(page).toContain("shouldShowEntryResume")
      expect(page).toContain("<EntryResume")
    }
  })

  it("o cadastro continua montando o formulário de criar conta", () => {
    // O caminho positivo da tela não pode desaparecer no meio da decisão.
    expect(signupPage).toContain('mode="signup"')
    expect(loginPage).toContain("<BivaqueSignIn />")
  })

  it("sem sessão a decisão não chega a ser consultada", () => {
    expect(session).toContain("hasSession: false")
    expect(session).toContain("auth.getUser()")
    // O tipo da conta vem do mesmo RPC que o proxy usa, pelo usuário da sessão
    // — nunca por id vindo da tela.
    expect(session).toContain('rpc("my_account_kind")')
    expect(session).not.toContain("searchParams")
  })
})

describe("a tela oferece continuar ou começar com outra conta", () => {
  it("continuar é link de verdade para o ponto onde a pessoa parou", () => {
    expect(resume).toContain("Continuar de onde parei")
    expect(resume).toContain("href={ENTRY_RESUME_PATH}")
  })

  it("começar com outra conta abre a confirmação antes de sair", () => {
    expect(resume).toContain("Começar com outra conta")
    expect(resume).toContain("MaterialConfirmDialog")
    expect(resume).toContain('title="Começar com outra conta?"')
  })

  it("confirmar sai da conta e volta ao cadastro", () => {
    const confirm = resume.slice(resume.indexOf("const handleRestart"))
    expect(confirm).toContain("auth.signOut()")
    expect(confirm.indexOf("signOut()")).toBeLessThan(
      confirm.indexOf('window.location.assign("/signup")'),
    )
  })

  it("a conta em andamento aparece pelo nome e pelo e-mail", () => {
    expect(resume).toContain("Conta de ")
    expect(resume).toContain("email: string | null")
    expect(resume).toContain("name: string | null")
  })
})
