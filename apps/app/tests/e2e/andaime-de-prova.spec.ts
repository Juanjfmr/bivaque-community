// O andaime de prova não pode aparecer no build publicado.
//
// O parecer cego de 12/12 pegou o rodapé de depuração da casca ("Liberar cargas
// pendentes", "Ir para o Mercado", "Abrir item-N") em toda rota sem jornada do
// build de produção. Este spec confere no fonte que o modo só liga em
// `import.meta.env.DEV`; a prova contra o build publicado, com o global ligado,
// fica em `andaime.publicado.spec.ts` (projeto `publicado`).
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { expect, test } from "./apoio"

// O Playwright do app roda com apps/app como diretório atual, como os specs vizinhos.
const ler = (caminho: string) => readFileSync(join(process.cwd(), caminho), "utf8")

test.describe("andaime de prova", () => {
  test("o modo de prova só liga no servidor de desenvolvimento", () => {
    const fonte = ler(join("src", "modo-de-prova.ts"))
    expect(fonte).toContain("export const ANDAIME_DISPONIVEL = import.meta.env.DEV")
    expect(fonte).toMatch(/if\s*\(\s*!ANDAIME_DISPONIVEL\s*\)\s*return false/)
  })
})
