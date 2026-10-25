import type { Page } from "@playwright/test"
import { abrir, esperarCaminho, expect, test, tituloDaTela } from "./apoio"

const DIALOGO = '[data-sobreposicao="dialogo"]'
const FOLHA = '[data-sobreposicao="folha"]'
const MENU = '[data-sobreposicao="menu-criar"]'
const VEU = '[data-scrim="sobreposicao"]'
const ABRIR_DIALOGO = '[data-acao="abrir-dialogo"][data-valor="prova"]'
const ABRIR_FOLHA = '[data-acao="abrir-folha"][data-valor="prova"]'
const RECOLHER = '[data-acao="fechar-sobreposicao"]'

/**
 * Entra em Salvos pelo app: deixa uma entrada anterior na pilha (para o Voltar
 * ter para onde ir) e uma tela que tem botão de Voltar no topo.
 */
async function entrarEmSalvos(page: Page): Promise<void> {
  await abrir(page, "/app/comunidade")
  await page.locator('[data-acao="abrir-salvos"][data-valor="prova"]').click()
  await esperarCaminho(page, "/app/salvos")
}

async function sobreposicaoAberta(page: Page, seletor: string): Promise<void> {
  await expect(page.locator(seletor)).toBeVisible()
  const dentro = await page.evaluate(
    () => document.activeElement?.closest("[data-sobreposicao]") !== null,
  )
  expect(dentro).toBe(true)
}

test.describe("diálogo, folha e menu", () => {
  test("Voltar do navegador fecha o diálogo antes de trocar de rota", async ({ page }) => {
    await entrarEmSalvos(page)
    await page.locator(ABRIR_DIALOGO).click()
    await sobreposicaoAberta(page, DIALOGO)

    await page.goBack()
    await expect(page.locator(DIALOGO)).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe("/app/salvos")

    // Uma sobreposição, uma entrada: o Voltar seguinte troca de rota de verdade.
    await page.goBack()
    await esperarCaminho(page, "/app/comunidade")
  })

  test("Voltar do navegador fecha a folha antes de trocar de rota", async ({ page }) => {
    await entrarEmSalvos(page)
    await page.locator(ABRIR_FOLHA).click()
    await sobreposicaoAberta(page, FOLHA)

    await page.goBack()
    await expect(page.locator(FOLHA)).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe("/app/salvos")
    await page.goBack()
    await esperarCaminho(page, "/app/comunidade")
  })

  test("Voltar do navegador fecha o menu Criar antes de trocar de rota", async ({ page }) => {
    await entrarEmSalvos(page)
    await page.locator('[data-acao="criar"]').click()
    await sobreposicaoAberta(page, MENU)

    await page.goBack()
    await expect(page.locator(MENU)).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe("/app/salvos")
    await page.goBack()
    await esperarCaminho(page, "/app/comunidade")
  })

  test("Escape fecha, devolve o foco e não deixa entrada fantasma", async ({ page }) => {
    await entrarEmSalvos(page)
    await page.locator(ABRIR_DIALOGO).click()
    await sobreposicaoAberta(page, DIALOGO)

    await page.keyboard.press("Escape")
    await expect(page.locator(DIALOGO)).toHaveCount(0)
    await expect(page.locator(ABRIR_DIALOGO)).toBeFocused()
    expect(new URL(page.url()).pathname).toBe("/app/salvos")

    await page.goBack()
    await esperarCaminho(page, "/app/comunidade")
  })

  test("clicar fora fecha a folha, devolve o foco e não deixa entrada fantasma", async ({
    page,
  }) => {
    await entrarEmSalvos(page)
    await page.locator(ABRIR_FOLHA).click()
    await sobreposicaoAberta(page, FOLHA)

    // O véu começa abaixo da barra do topo; o ponto escolhido não tem painel em cima.
    await page.locator(VEU).click({ position: { x: 10, y: 10 } })
    await expect(page.locator(FOLHA)).toHaveCount(0)
    await expect(page.locator(ABRIR_FOLHA)).toBeFocused()
    expect(new URL(page.url()).pathname).toBe("/app/salvos")

    await page.goBack()
    await esperarCaminho(page, "/app/comunidade")
  })

  test("o botão Fechar da sobreposição devolve o foco", async ({ page }) => {
    await entrarEmSalvos(page)
    await page.locator(ABRIR_DIALOGO).click()
    await sobreposicaoAberta(page, DIALOGO)

    await page.locator(RECOLHER).click()
    await expect(page.locator(DIALOGO)).toHaveCount(0)
    await expect(page.locator(ABRIR_DIALOGO)).toBeFocused()
    await expect(tituloDaTela(page)).not.toBeFocused()

    await page.goBack()
    await esperarCaminho(page, "/app/comunidade")
  })
})
