import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "../ui/source-scan"

// A4 do parecer R2: o formulário comunitário não tinha grade — dois Selects de
// 320 px flutuavam ao lado de campos de 1152 px, e o primário de 128 px ficava
// sozinho na ponta esquerda de uma linha larga, com ~1000 px vazios à direita.
//
// Medido a 1440 depois do reparo, em `dono-vila`: categoria e alcance com
// 268 px cada, x=416 e x=700, ambos em y=412 (e y=516 no estado de erro, quando
// a mensagem inline do campo infrator entra na terceira linha da grade).
// `grid-rows-subgrid` é o que garante isso: sem ele o rótulo longo do alcance
// quebra em duas linhas e empurra o Select irmão 15 px para baixo.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const page = read("apps", "web", "app", "(shell)", "recommendations", "page.tsx")
const code = stripComments(page)

/** O bloco do formulário comunitário, do `<form>` até o fechamento. */
function formBlock(source: string): string {
  const start = source.indexOf('<form className="flex flex-col gap-4" noValidate')
  expect(start).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf("</form>", start))
}

const form = formBlock(code)

describe("A4 — grade do formulário de pedido", () => {
  it("categoria e alcance dividem uma linha de grade", () => {
    expect(form).toContain("sm:grid-cols-2")
    expect(form).toContain("sm:grid-rows-[auto_auto_auto]")
    // As duas células são subgrades: rótulo, controle e mensagem caem na MESMA
    // linha da grade nas duas colunas.
    expect(form.match(/sm:grid-rows-subgrid/g)).toHaveLength(2)
    expect(form.match(/sm:row-span-3/g)).toHaveLength(2)
  })

  it("nenhum Select volta a flutuar em 320 px dentro do campo de leitura", () => {
    expect(form).not.toContain("max-w-xs")
    expect(form.match(/className="w-full"/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it("título e descrição ocupam a largura de leitura, sem limite próprio", () => {
    // Os dois campos de texto são filhos diretos da coluna de leitura: não
    // recebem `max-w` nenhum que os estreite além dela.
    expect(form).toContain('id="pedido-titulo"')
    expect(form).toContain('id="pedido-descricao"')
    expect(form).not.toMatch(/id="pedido-titulo"[\s\S]{0,200}max-w-/)
    expect(form).not.toMatch(/id="pedido-descricao"[\s\S]{0,200}max-w-/)
  })

  it("o primário fecha a linha na ponta direita, como na prancha 45", () => {
    const submit = form.slice(form.indexOf('type="submit"'))
    expect(submit).toContain("self-end")
    expect(submit).not.toContain("self-start")
  })

  it("a grade some abaixo de sm: em telas estreitas os campos empilham", () => {
    // Todo arranjo da grade é `sm:`/`lg:`; o padrão continua coluna única.
    const container = form.slice(0, form.indexOf("<span"))
    expect(container).toContain('className="grid gap-4')
    expect(container).not.toMatch(/(^|\s)grid-cols-2/)
  })
})
