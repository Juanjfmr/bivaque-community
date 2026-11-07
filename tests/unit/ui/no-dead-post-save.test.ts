import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const appDir = join(root, "apps", "web", "app")
const telaSalvos = join(root, "apps", "app", "src", "telas", "Salvos.tsx")
const dadosDosGrupos = join(root, "apps", "app", "lib", "dados", "grupos.ts")

function collectSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full))
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      files.push(full)
    }
  }
  return files
}

/**
 * Quem pode tocar `post_saves`: a rota que grava a ação e a que alimenta a tela
 * Salvos. Um arquivo novo nesta lista é um "salvar" novo — e ele só entra junto
 * do destino que o mostra à pessoa. A guarda existe para que o botão de salvar
 * nunca volte a gravar num lugar que ninguém consegue abrir.
 */
const PERMITIDOS = [
  "api/app/grupos/_comum.ts",
  "api/app/grupos/publicacoes/[id]/acoes/route.ts",
  "api/app/grupos/salvas/route.ts",
]

const sourceFiles = collectSourceFiles(appDir)

describe("o salvar de publicação tem destino", () => {
  it("só a ação e a rota de salvos tocam post_saves", () => {
    const offenders = sourceFiles
      .filter((file) => readFileSync(file, "utf8").includes("post_saves"))
      .map((file) => relative(appDir, file).split(sep).join("/"))
      .sort()
    expect(offenders).toEqual([...PERMITIDOS].sort())
  })

  it("a tela Salvos lista as publicações salvas e leva à publicação", () => {
    const tela = readFileSync(telaSalvos, "utf8")
    expect(tela).toContain("lerPublicacoesSalvas")
    expect(tela).toContain('irPara("publicacao"')
    expect(readFileSync(dadosDosGrupos, "utf8")).toContain('"/api/app/grupos/salvas"')
  })

  it("never exposes the bookmark toggle props", () => {
    const offenders = sourceFiles.filter((file) => {
      const content = readFileSync(file, "utf8")
      return content.includes("onBookmarkToggle") || content.includes("isBookmarked")
    })
    expect(offenders).toEqual([])
  })
})
