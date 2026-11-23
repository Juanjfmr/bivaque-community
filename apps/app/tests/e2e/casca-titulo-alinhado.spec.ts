import { expect, test } from "@playwright/test"
import { simularConversas } from "./conversas-ajuda"
import { aplicarStubMercado } from "./stub-mercado"
import { simularVoce } from "./voce-ajuda"

/**
 * REGUA-003: no computador, o título da barra do topo começa na borda esquerda
 * da coluna de conteúdo nas telas de Avisos, Conversas e Você — a cega de 23/11
 * achou o título solto à esquerda da coluna centrada. Abaixo de 1024 px a
 * barra é a do celular e a régua não se aplica.
 */
const TELAS = [
  ["/app/voce", "voce"],
  ["/app/bloqueados", "bloqueados"],
  ["/app/perfil/u-paulo", "perfil"],
  ["/app/salvos", "salvos"],
  ["/app/avisos", "avisos"],
  ["/app/conversas", "conversas"],
] as const

test("no computador o título da barra começa na borda da coluna", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, "barra do computador só a partir de 1024")
  aplicarStubMercado(page)
  await simularVoce(page)
  await simularConversas(page)
  await page.route(/\/api\/app\/avisos(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { avisos: [], proximo: null, naoLidos: 0 } }),
  )

  for (const [caminho, tela] of TELAS) {
    await page.goto(caminho)
    const coluna = page.locator(`[data-tela="${tela}"]`)
    await expect(coluna).toBeVisible()
    const titulo = page.locator('[data-topo="barra"] [data-titulo="topo"]')
    await expect(titulo).toBeVisible()
    const [bordaDoTitulo, bordaDaColuna] = await Promise.all([
      titulo.evaluate((elemento) => elemento.getBoundingClientRect().left),
      coluna.evaluate((elemento) => elemento.getBoundingClientRect().left),
    ])
    expect(Math.abs(bordaDoTitulo - bordaDaColuna), caminho).toBeLessThanOrEqual(2)
  }
})
