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

/**
 * REGUA-003 (rodada 3, achado A4): a partir de 768 px os controles da barra do
 * topo se alinham às bordas da coluna de conteúdo, não às da janela. O último
 * controle da direita termina na borda direita da coluna; abaixo de 1024 px o
 * primeiro da esquerda (marca ou voltar) começa na borda esquerda dela. No
 * computador a esquerda é a do título (teste acima).
 */
test("a partir de 768 os controles da barra se alinham às bordas da coluna", async ({ page }) => {
  const largura = page.viewportSize()?.width ?? 0
  test.skip(largura < 768, "no celular a coluna ocupa a largura da tela")
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
    const medidas = await page.evaluate((nome) => {
      const caixa = document.querySelector(`[data-tela="${nome}"]`)?.getBoundingClientRect()
      const barra = document.querySelector('[data-topo="barra"]')
      const controles = [...(barra?.children ?? [])]
        .filter((filho) => {
          const r = filho.getBoundingClientRect()
          return r.width > 0 && getComputedStyle(filho).visibility !== "hidden"
        })
        .filter((filho) => !filho.classList.contains("grow"))
        .map((filho) => filho.getBoundingClientRect())
      return {
        colunaEsquerda: caixa?.left ?? 0,
        colunaDireita: caixa?.right ?? 0,
        primeiro: controles[0]?.left ?? 0,
        ultimo: controles.at(-1)?.right ?? 0,
      }
    }, tela)
    expect(
      Math.abs(medidas.ultimo - medidas.colunaDireita),
      `${caminho} direita`,
    ).toBeLessThanOrEqual(4)
    if (largura < 1024)
      expect(
        Math.abs(medidas.primeiro - medidas.colunaEsquerda),
        `${caminho} esquerda`,
      ).toBeLessThanOrEqual(4)
  }
})
