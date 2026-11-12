// O andaime de prova não pode aparecer no build publicado.
//
// O parecer cego de 12/12 pegou o rodapé de depuração da casca ("Liberar cargas
// pendentes", "Ir para o Mercado", "Abrir item-N") em toda rota sem jornada do
// build de produção. Este spec roda contra o servidor de desenvolvimento, onde o
// modo de prova é legítimo, e confere os dois estados: com o modo ligado o
// andaime existe; sem ele o rodapé da casca some e a rota mostra o estado de
// primeira entrada. E confere no fonte que o modo só liga em `import.meta.env.DEV`,
// que é o que garante o mesmo resultado no build de produção.
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

  test("sem o modo de prova, a rota sem jornada mostra o estado de primeira entrada", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const janela = window as unknown as { __BIVAQUE_MODO_DE_PROVA__?: boolean }
      janela.__BIVAQUE_MODO_DE_PROVA__ = false
    })
    await page.goto("/app/salvos")
    await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
    const estado = page.locator('[data-estado="primeira-entrada"]')
    await expect(estado).toBeVisible()
    await expect(estado).not.toContainText("Manaus")
    await expect(page.locator('[data-prova="controles-do-app"]')).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Liberar cargas pendentes" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Abrir item-/ })).toHaveCount(0)
  })
})
