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

  it("o formulário novo publica na cidade para qualquer assunto, sem aviso", () => {
    const ask = read("apps", "web", "app", "components", "indications", "ask-indication.tsx")
    expect(ask).toContain("locality_id: localityId")
    expect(ask).not.toContain("saude_bem_estar")
    expect(ask).not.toMatch(/começam em grupo/)
  })
})
