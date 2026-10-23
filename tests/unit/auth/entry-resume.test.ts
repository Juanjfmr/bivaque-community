import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ENTRY_RESUME_PATH,
  entryResumeTarget,
  shouldShowEntryResume,
} from "web/lib/auth/entry-progress"

// PORT-003 (frente A do lote 4): "Você já começou", o item 5 do
// ADR-20261022-entrada-do-prototipo. A decisão é uma regra só, e é ela que este
// arquivo trava: sessão sem membership = entrada em andamento. O resto da prova
// é a costura no servidor (as duas páginas) e a tela em si (os dois caminhos e o
// diálogo de confirmação), que ficam logo abaixo em contrato de fonte.
//
// A regra antiga, que este arquivo substitui, era "não existe retomada": quem
// voltasse à entrada via o formulário de novo e a conta já criada ficava
// indistinguível de uma nova. Era o defeito 5 do mapeamento protótipo × Next.
//
// A revisão independente de 22/10/2026 acrescentou a segunda metade: retomar não
// pode pular o aceite pendente. Entrar pelo Google, sair antes do aceite e
// escolher "Continuar de onde parei" levava a `/onboarding`, onde a conferência
// do CPF respondia `403 consent is required`.

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
})

describe("para onde a retomada leva", () => {
  it("sem nenhum aceite gravado, retoma no passo Aceite", () => {
    // O caminho da reprodução: Google, saída antes do aceite, "Continuar de
    // onde parei". O CPF recusaria o passo seguinte com 403.
    expect(entryResumeTarget(false)).toBe("/consent")
  })

  it("com aceite gravado, segue o funil e o proxy resolve o passo", () => {
    // O passo real (CPF, análise ou cidade) é estado do servidor: a tela não
    // adivinha, e o endereço é o mesmo que o proxy já interpreta.
    expect(entryResumeTarget(true)).toBe(ENTRY_RESUME_PATH)
    expect(ENTRY_RESUME_PATH).toBe("/onboarding")
  })

  it("a decisão é a do callback, pela mesma função, não por uma cópia", () => {
    const progress = read("apps", "web", "lib", "auth", "entry-progress.ts")
    expect(progress).toContain('from "../../app/auth/callback/redirect-plan"')
    expect(progress).toContain("consentStepTarget(hasAnyAcceptance, ENTRY_RESUME_PATH)")
  })

  it("leitura inconclusiva não inventa aceite pendente", () => {
    // "Não sei" não pode virar "não aceitou": repetir a tela de aceite para quem
    // já aceitou é o defeito que o ADR-20260907 fechou. Quem não aceitou de
    // fato encontra a recusa do servidor no passo do CPF.
    expect(entryResumeTarget(null)).toBe(ENTRY_RESUME_PATH)
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
      // O destino também é decidido no servidor, com o fato do aceite.
      expect(page).toContain("entryResumeTarget(session.hasAnyAcceptance)")
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

  it("o aceite gravado é lido do servidor, escopado pelo usuário da sessão", () => {
    // A tabela é do service_role; o id vem de `getUser()`, nunca da tela.
    expect(session).toContain('from("consent_acceptances")')
    expect(session).toMatch(/\.eq\("user_id",\s*userId\)/)
    // O teste positivo e o negativo da leitura: aceite e ausência dele.
    expect(session).toContain("return (count ?? 0) > 0")
    expect(session).toMatch(/if \(error\) return null/)
  })
})

describe("a tela oferece continuar ou começar com outra conta", () => {
  it("continuar é link de verdade para o ponto onde a pessoa parou", () => {
    expect(resume).toContain("Continuar de onde parei")
    expect(resume).toContain("href={resumeHref}")
    // O componente não recalcula o destino: ele recebe a decisão do servidor.
    expect(resume).toContain("resumeHref: string")
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
