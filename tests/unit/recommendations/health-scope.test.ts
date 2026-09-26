import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// A Onda F Task 7 criou "saúde começa em grupo". O dono retirou a trava e o
// aviso em 25/09/2026 (ADR-20260925-memoria-de-indicacoes): o pedido de
// pediatra pode ir para a cidade. O banco é a fonte; a tela não pode
// reintroduzir a trava escondendo a opção da cidade.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

describe("pedido de saúde para a cidade", () => {
  it("a migration retira a trava de saúde", () => {
    const source = read("supabase", "migrations", "20260926004501_memoria_de_indicacoes.sql")
    expect(source).toContain("drop constraint recommendation_health_needs_group")
  })

  it("o formulário antigo oferece a cidade para qualquer categoria, sem aviso", () => {
    const page = read("apps", "web", "app", "(shell)", "recommendations", "page.tsx")
    expect(page).not.toContain('requestCategory !== "saude_bem_estar"')
    expect(page).not.toMatch(/Saúde começam em grupo/)
  })
})
