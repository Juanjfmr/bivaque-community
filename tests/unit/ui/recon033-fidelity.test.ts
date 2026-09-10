import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-033 — fidelidade das telas de operação (pranchas 57/58) e das
// divergências obrigatórias da fila. O Vitest da casa roda em node, sem DOM,
// então a prova é na fonte, no padrão dos guardas de auditoria já existentes
// (audience-reset.test.ts). Cada asserção abaixo é uma regressão medida no
// handoff de 09/09 que não pode voltar.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8")

const adminLayout = read("apps", "web", "app", "(admin)", "layout.tsx")
const operatorShell = read("apps", "web", "app", "components", "shell", "operator-shell.tsx")
const reportsPage = read("apps", "web", "app", "(admin)", "reports", "page.tsx")
const communityScreen = read(
  "apps",
  "web",
  "app",
  "(shell)",
  "communities",
  "[id]",
  "community-detail-screen.tsx",
)
const reportButton = read("apps", "web", "app", "components", "bivaque", "report-button.tsx")
const reportActions = read("apps", "web", "app", "components", "bivaque", "report-actions.ts")

describe("shell da operação (pranchas 57/58)", () => {
  it("as telas de operação usam o shell com cabeçalho do produto", () => {
    expect(adminLayout).toContain("OperatorShell")
    expect(adminLayout).not.toContain("Painel do operador")
  })

  it("a navegação da operação é coluna lateral com as três entradas da prancha", () => {
    expect(operatorShell).toContain('label: "Admissões"')
    expect(operatorShell).toContain('label: "Denúncias"')
    expect(operatorShell).toContain('label: "Comunidades"')
    expect(operatorShell).toContain('aria-label="Operação"')
  })

  it("o rodapé dá as duas saídas, presentes nas duas telas", () => {
    expect(operatorShell).toContain("Voltar ao Bivaque")
    expect(operatorShell).toContain("Sair da operação")
    expect(operatorShell).toContain("supabase.auth.signOut")
  })

  it("a lateral usa o wordmark canônico, sem símbolo nem descritivo inventado", () => {
    expect(operatorShell).toContain("brandTokens.productName")
    expect(operatorShell).not.toContain("COMUNIDADES DO BRASIL")
  })
})

describe("fila de denúncias (prancha 58)", () => {
  it("o chip de atraso que a prancha não desenha não volta", () => {
    expect(reportsPage).not.toContain("isOverSla")
    expect(reportsPage).not.toContain("SUPPORT_SLA_HOURS")
  })

  it("o motivo é a lista fechada canônica, não busca em texto livre", () => {
    expect(reportsPage).toContain("MOTIVO_OPTIONS")
    expect(reportsPage).toMatch(/<select[^>]*name="motivo"/)
    expect(reportsPage).not.toMatch(/type="search"[\s\S]{0,80}name="motivo"/)
  })
})

describe("comunidade — pedido pendente (prancha 43)", () => {
  it("o rail Sobre a comunidade aparece também no pedido pendente", () => {
    expect(communityScreen).toMatch(
      /function PendingBody[\s\S]*?<CommunityAboutRail[\s\S]*?memberCount=\{null\}/,
    )
  })
})

describe("denúncia — lista fechada validada no servidor", () => {
  it("o modal do membro consome a lista canônica e grava pela action", () => {
    expect(reportButton).toContain("REPORT_REASONS")
    expect(reportButton).toContain("submitReportAction")
    expect(reportButton).not.toContain('from("reports").insert')
  })

  it("a action recusa categoria fora da lista antes de qualquer escrita", () => {
    expect(reportActions).toContain("isReportReasonValue")
    expect(reportActions).toContain('error: "invalid-reason"')
    expect(reportActions).toContain("EXPLANATION_MAX")
  })
})
