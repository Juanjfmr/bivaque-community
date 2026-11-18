import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

// Achado da captura cega de 18/11 (F09): a Conversa abria a denúncia com o id
// genérico "dialogo", e a casca desenhava, por cima, o placeholder provisório do
// protótipo ("Área da sobreposição em prova"). A pessoa via duas caixas.
//
// Regra: "dialogo" e "folha" são da casca e só servem às telas de prova e da
// galeria. Toda tela real abre a própria sobreposição com um id próprio, que a
// casca não desenha.

const RAIZ = join(import.meta.dirname, "..")
const PERMITIDOS = new Set(["src/telas/TelaDeProva.tsx", "src/galeria/TelaGaleria.tsx"])

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })
}

const GENERICO = /(useSobreposicaoDaEntrada|abrir)\(\s*"(dialogo|folha)"/

describe("sobreposição genérica da casca", () => {
  it("nenhuma tela real abre o diálogo ou a folha genéricos", () => {
    const usos = ["src", "components"]
      .flatMap((pasta) => arquivos(join(RAIZ, pasta)))
      .map((arquivo) => relative(RAIZ, arquivo).replaceAll("\\", "/"))
      .filter((arquivo) => !PERMITIDOS.has(arquivo))
      .filter((arquivo) => GENERICO.test(readFileSync(join(RAIZ, arquivo), "utf8")))
    expect(usos).toEqual([])
  })

  it("a casca não desenha nada para os ids da Conversa e da Participação", () => {
    const casca = readFileSync(join(RAIZ, "src", "casca", "Sobreposicoes.tsx"), "utf8")
    expect(casca).toContain('aberta === "conversa-denuncia"')
    expect(casca).toContain('aberta === "grupo-pedir"')
  })

  it("a varredura pega o padrão antigo", () => {
    expect(GENERICO.test('useSobreposicaoDaEntrada("dialogo")')).toBe(true)
    expect(GENERICO.test('navegacao.abrir("folha")')).toBe(true)
    expect(GENERICO.test('useSobreposicaoDaEntrada("conversa-denuncia")')).toBe(false)
  })
})
