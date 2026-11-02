import { abrir, esperarCaminho, expect, test } from "./apoio"

const FILTRO = '[data-filtro="ordenacao"]'

test.describe("filtros por entrada", () => {
  test("trocar de filtro não empilha entrada e não muda o endereço", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator('[data-aba="comunidade"]').click()
    await esperarCaminho(page, "/app/comunidade")

    const filtro = page.locator(FILTRO)
    await filtro.selectOption("preco-baixo")
    await expect(filtro).toHaveValue("preco-baixo")
    await filtro.selectOption("preco-alto")
    await expect(filtro).toHaveValue("preco-alto")

    expect(new URL(page.url()).search).toBe("")
    expect(new URL(page.url()).pathname).toBe("/app/comunidade")

    // Um único Voltar atravessa as duas trocas de filtro e volta de rota.
    await page.goBack()
    await esperarCaminho(page, "/app/inicio")
  })

  test("relê o filtro ao recarregar a entrada", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator('[data-aba="comunidade"]').click()
    await esperarCaminho(page, "/app/comunidade")

    await page.locator(FILTRO).selectOption("preco-baixo")
    await page.reload()
    await expect(page.locator(FILTRO)).toHaveValue("preco-baixo")
    expect(new URL(page.url()).pathname).toBe("/app/comunidade")
  })

  test("o filtro de uma entrada não vaza para a outra", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator('[data-aba="comunidade"]').click()
    await esperarCaminho(page, "/app/comunidade")
    await page.locator(FILTRO).selectOption("preco-baixo")

    await page.locator('[data-aba="inicio"]').click()
    await esperarCaminho(page, "/app/inicio")
    await expect(page.locator(FILTRO)).toHaveValue("recente")

    await page.goBack()
    await esperarCaminho(page, "/app/comunidade")
    await expect(page.locator(FILTRO)).toHaveValue("preco-baixo")
  })
})
