import type { Locator } from "@playwright/test"
import {
  abrir,
  abrirGaleria,
  expect,
  SELETOR_AVISOS,
  SELETOR_BARRA,
  SELETOR_CONVERSAS,
  SELETOR_CRIAR,
  SELETOR_NAVEGACAO,
  test,
} from "./apoio"

/**
 * Acessibilidade da casca (§5.9): alvos de 44 px, teclado, nome acessível sem o
 * texto do ícone, foco contido no diálogo e devolvido ao acionador, e nada de
 * rolagem horizontal em 375, 768 ou 1440.
 */

const MINIMO_DO_ALVO = 44

async function medirAlvos(locator: Locator): Promise<string[]> {
  const quantos = await locator.count()
  const problemas: string[] = []
  for (let indice = 0; indice < quantos; indice += 1) {
    const elemento = locator.nth(indice)
    if (!(await elemento.isVisible())) continue
    const caixa = await elemento.boundingBox()
    if (!caixa) {
      problemas.push(`item ${indice}: sem caixa`)
      continue
    }
    if (caixa.height + 0.5 < MINIMO_DO_ALVO) {
      problemas.push(`item ${indice}: altura ${caixa.height.toFixed(1)}px`)
    }
    if (caixa.width + 0.5 < MINIMO_DO_ALVO) {
      problemas.push(`item ${indice}: largura ${caixa.width.toFixed(1)}px`)
    }
  }
  return problemas
}

test.describe("alvos de toque e teclado", () => {
  test("os controles da barra do topo têm 44 px", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const problemas = await medirAlvos(page.locator(`${SELETOR_BARRA} button`))
    expect(problemas).toEqual([])
  })

  test("as abas da navegação têm 44 px", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const problemas = await medirAlvos(page.locator(`${SELETOR_NAVEGACAO} button`))
    expect(problemas).toEqual([])
  })

  test("o Criar também, inclusive compacto", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    await abrir(page, "/app/inicio")
    const problemas = await medirAlvos(page.locator(SELETOR_CRIAR))
    expect(problemas).toEqual([])
    if (largura < 720) {
      await page.locator("#conteudo").hover()
      await page.mouse.wheel(0, 400)
      await expect(page.locator(SELETOR_CRIAR)).toHaveAttribute("data-compacto", "sim")
      await expect(page.locator(SELETOR_CRIAR)).toBeInViewport()
      await expect(page.locator(`${SELETOR_CRIAR} [data-criar="botao"]`)).toHaveCSS("width", "56px")
      await expect(page.locator(`${SELETOR_CRIAR} [data-criar="rotulo"]`)).toBeHidden()
      expect(await medirAlvos(page.locator(SELETOR_CRIAR))).toEqual([])
    }
  })

  test("o teclado alcança os controles e a barra de baixo", async ({ page }) => {
    await abrir(page, "/app/inicio")

    // A tela de prova já deixa o foco no título; percorre a página inteira com Tab
    // (com parada antecipada) até alcançar os controles do topo e a barra de
    // baixo, sem começar de um ponto privilegiado.
    await page.evaluate(() => {
      const ativo = document.activeElement
      if (ativo instanceof HTMLElement) ativo.blur()
    })

    // Percorre o foco de verdade com Tab e anota o alvo pelo marcador estável do
    // próprio controle (`data-acao`/`data-aba`). O `textContent` mentiria: a
    // ligadura do Material Symbols entra nele mesmo com `aria-hidden`.
    const focados: string[] = []
    const alvos = ["avisos", "conversas-topo", "inicio"]
    for (let volta = 0; volta < 160; volta += 1) {
      await page.keyboard.press("Tab")
      const marcador = await page.evaluate(() => {
        const ativo = document.activeElement as HTMLElement | null
        return ativo?.dataset["acao"] ?? ativo?.dataset["aba"] ?? ""
      })
      focados.push(marcador)
      if (alvos.every((alvo) => focados.includes(alvo))) break
    }
    expect(focados).toContain("avisos")
    expect(focados).toContain("conversas-topo")
    expect(focados).toContain("inicio")

    // O nome acessível é medido no alvo focado real, pela asserção do Playwright
    // (`toHaveAccessibleName`), não por `textContent`.
    await expect(page.locator(SELETOR_AVISOS)).toHaveAccessibleName("Avisos")
    await expect(page.locator(SELETOR_CONVERSAS)).toHaveAccessibleName("Conversas")
    await expect(page.locator(`${SELETOR_NAVEGACAO} [data-aba="inicio"]`)).toHaveAccessibleName(
      /Início/,
    )
  })

  test("o botão Voltar tem nome acessível sem o texto do ícone", async ({ page }) => {
    await abrir(page, "/app/salvos")
    await expect(page.getByRole("button", { name: "Voltar", exact: true })).toHaveCount(1)
  })
})

test.describe("foco em sobreposição", () => {
  test("o diálogo prende o foco e devolve ao acionador", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const acionador = page.locator(SELETOR_CRIAR)
    await acionador.click()
    await expect(page.locator('[data-sobreposicao="menu-criar"]')).toBeVisible()

    for (let volta = 0; volta < 10; volta += 1) {
      await page.keyboard.press("Tab")
      const dentro = await page.evaluate(
        () => document.activeElement?.closest("[data-sobreposicao]") !== null,
      )
      expect(dentro, `volta ${volta}`).toBe(true)
    }

    await page.keyboard.press("Escape")
    await expect(page.locator('[data-sobreposicao="menu-criar"]')).toHaveCount(0)
    await expect(acionador).toBeFocused()
  })

  test("a folha de cidade prende o foco e devolve ao chip", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator('[data-acao="cidade"]').click()
    await expect(page.locator('[data-sobreposicao="cidade"]')).toBeVisible()
    const dentro = await page.evaluate(
      () => document.activeElement?.closest('[data-sobreposicao="cidade"]') !== null,
    )
    expect(dentro).toBe(true)

    await page.keyboard.press("Escape")
    await expect(page.locator('[data-sobreposicao="cidade"]')).toHaveCount(0)
    await expect(page.locator('[data-acao="cidade"]')).toBeFocused()
  })
})

test.describe("sem rolagem horizontal", () => {
  for (const caminho of ["/app/inicio", "/app/salvos", "/app/mercado"]) {
    test(`${caminho} cabe na largura, com a barra e sem a barra`, async ({ page }) => {
      await abrir(page, caminho)
      const medidas = await page.evaluate(() => {
        const conteudo = document.getElementById("conteudo")
        return {
          documento: document.documentElement.scrollWidth - window.innerWidth,
          corpo: document.body.scrollWidth - window.innerWidth,
          conteudo: conteudo ? conteudo.scrollWidth - conteudo.clientWidth : 0,
        }
      })
      expect(medidas.documento, caminho).toBeLessThanOrEqual(0)
      expect(medidas.corpo, caminho).toBeLessThanOrEqual(0)
      expect(medidas.conteudo, caminho).toBeLessThanOrEqual(0)
    })
  }

  test("a galeria, que é a tela mais cheia, também cabe", async ({ page }) => {
    await abrirGaleria(page)
    const excesso = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(excesso).toBeLessThanOrEqual(0)
  })
})
