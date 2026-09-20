import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "../ui/source-scan"

// A5 do parecer R2: geometria de controles incoerente na mesma tela — ícones de
// 10 px, campos de 15 px e primário em pílula de 30 px. Nenhum dos três valores
// é da escala do produto (DESIGN_SYSTEM §4.4: 6/10/14/20/pill).
//
// De onde vinham os valores errados, medido no CSS do vendor:
//   .select__trigger/.input/.textarea -> var(--field-radius) = calc(var(--radius) * 1.5) = 15 px
//   .button                           -> calc(var(--radius) * 3)                  = 30 px
// `--field-radius` é gancho que a biblioteca expõe: uma declaração na rota
// corrige todos os campos. O botão não tem gancho nenhum (nem prop `radius` na
// API do HeroUI v3) — o produto declara o token por elemento.
//
// Medido a 1440 depois do reparo, em `dono-vila`: campos e botões a 10 px,
// superfícies a 14 px, avatares em pílula, e ZERO elementos de conteúdo a 15 px
// ou 30 px. Os 15 px que restam na página pertencem ao cabeçalho do shell
// (busca global), fora de `allowed_paths`.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const ARQUIVOS: Array<[string, string]> = [
  ["page", read("apps", "web", "app", "(shell)", "recommendations", "page.tsx")],
  [
    "guide-first-request",
    read("apps", "web", "app", "components", "bivaque", "guide-first-request.tsx"),
  ],
  [
    "recommendation-requests",
    read("apps", "web", "app", "components", "bivaque", "recommendation-requests.tsx"),
  ],
]

const CONTROL = "rounded-[var(--semantic-radius-control)]"
const CARD = "rounded-[var(--semantic-radius-card)]"

describe("A5 — raios pelos tokens do produto", () => {
  it("a rota declara o gancho de raio de campo que a biblioteca expõe", () => {
    const [nome, page] = ARQUIVOS[0] as [string, string]
    expect(page, nome).toContain("[--field-radius:var(--semantic-radius-control)]")
  })

  it("nenhum raio bruto da escala do Tailwind sobra no fluxo", () => {
    for (const [nome, fonte] of ARQUIVOS) {
      expect(fonte, `${nome}: raio bruto`).not.toMatch(/rounded-(lg|xl|md|2xl|3xl)\b/)
    }
  })

  it("todo botão do fluxo lê o raio do token semântico de controle", () => {
    for (const [nome, fonte] of ARQUIVOS) {
      const botoes = [...fonte.matchAll(/<Button\b[^>]*>/g)].map((m) => m[0])
      expect(botoes.length, `${nome}: nenhum botão encontrado`).toBeGreaterThan(0)
      const semToken = botoes.filter((b) => !b.includes("semantic-radius-control"))
      expect(semToken, `${nome}: botão sem token`).toHaveLength(0)
    }
  })

  it("superfície usa o token de cartão, controle usa o de controle", () => {
    const codigo = ARQUIVOS.map(([, fonte]) => stripComments(fonte)).join("\n")
    expect(codigo).toContain(CARD)
    expect(codigo).toContain(CONTROL)
  })

  it("não mascara: sem !important e sem alcançar classe interna do vendor", () => {
    for (const [nome, fonte] of ARQUIVOS) {
      const codigo = stripComments(fonte)
      expect(codigo, `${nome}: !important`).not.toMatch(/!important/)
      expect(codigo, `${nome}: classe interna do vendor`).not.toContain("select__trigger")
      expect(codigo, `${nome}: variável de escala do vendor`).not.toMatch(/\[--radius(-|:)/)
    }
  })
})
