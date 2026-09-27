import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// TIPOGRAFIA DA HOME NO TELEFONE — a guarda de AUSÊNCIA dos dois reparos.
//
// O comportamento (uma linha de título, CTA nomeado, alvo de 44 px) é provado
// por e2e em tests/e2e/inicio-phone-typography.spec.ts. O que o e2e NÃO pega é o
// jeito ERRADO de fazer o mesmo: esconder o rótulo do CTA com `hidden` (que o
// tira da árvore de acessibilidade e deixa o link sem nome a 375), ou "resolver"
// a quebra do título com `truncate`/`line-clamp` em vez de dar largura a ele.
// São atalhos que passariam num e2e mais frouxo e degradam o produto em
// silêncio — por isso a ausência deles é asserção de fonte.
//
// LIMITE DESTA PROVA: leitura de fonte, não comportamento. Quem lê depois não
// deve supor que aqui houve medição de linha nenhuma.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const faixa = stripComments(read("apps", "web", "app", "(shell)", "inicio", "return-strip.tsx"))
const secao = stripComments(
  read("apps", "web", "app", "(shell)", "inicio", "community-section.tsx"),
)

describe("a faixa de retorno mantém o CTA acessível e com alvo de 44 px", () => {
  it("o rótulo do CTA sai da tela por sr-only, nunca por hidden", () => {
    // `hidden` remove o texto da árvore de acessibilidade: o link ficaria sem
    // nome a 375, que é o defeito de nome acessível que esta rodada corrige.
    expect(faixa).toContain("sr-only sm:not-sr-only")
    expect(faixa).not.toMatch(/hidden sm:inline/)
    expect(faixa).toContain("{strip.cta}")
  })

  it("o alvo do CTA continua com o mínimo de 44 px", () => {
    // Mostrar só o chevron encolheria o alvo para ~40 px sem esta classe.
    expect(faixa).toMatch(/min-h-11 min-w-11 shrink-0/)
  })
})

describe("o título da comunidade não disputa a linha com as abas", () => {
  it("título e 'Ver tudo' numa linha, abas numa linha própria abaixo", () => {
    // Desde 25/09/2026 a comunidade é uma prévia: o título divide a linha só com
    // "Ver tudo", e as abas ficam sozinhas logo abaixo — nada empilha a 375.
    expect(secao).toContain('id="na-comunidade-titulo"')
    expect(secao).toContain('href="/community"')
    expect(secao).toContain('className="border-b border-ui-line"')
  })

  it("o título não é truncado nem limitado por clamp", () => {
    const titulo = secao.slice(secao.indexOf('id="na-comunidade-titulo"') - 200)
    const linha = titulo.slice(0, titulo.indexOf(">"))
    expect(linha).not.toContain("truncate")
    expect(linha).not.toContain("line-clamp")
    expect(linha).not.toContain("whitespace-nowrap")
  })
})
