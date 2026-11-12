// O andaime de prova nao pode aparecer no build publicado.
//
// O parecer cego de 12/12 pegou o rodape de depuracao da casca ("Liberar cargas
// pendentes", "Ir para o Mercado", "Abrir item-N") em toda rota sem jornada do
// build de producao. Este spec roda contra o servidor de desenvolvimento, onde o
// modo de prova e legitimo, e confere os dois estados: com o modo ligado o
// andaime existe; sem ele o rodape da casca nao e o estado da rota e o de
// primeira entrada. E confere no fonte que o modo so liga em `import.meta.env.DEV`,
// que e o que garante o mesmo resultado no build de producao.
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { expect, test } from "./apoio"

const ler = (caminho: string) => readFileSync(join(process.cwd(), caminho), "utf8")

test.describe("andaime de prova", () => {
  test("o modo de prova so liga no servidor de desenvolvimento", () => {
    const fonte = ler("apps/app/src/modo-de-prova.ts")
    expect(fonte).toContain("export const ANDAIME_DISPONIVEL = import.meta.env.DEV")
    expect(fonte).toContain("if (!ANDAIME_DISPONIVEL) return false")
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
    await expect(page.locator('[data-estado="primeira-entrada"]')).toBeVisible()
    await expect(page.locator('[data-prova="controles-do-app"]')).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Liberar cargas pendentes" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Abrir item-/ })).toHaveCount(0)
  })
})
