import { expect, test } from "@playwright/test"

/**
 * Regressão do card APP-SOBREPOSICAO-ENTRADA-CORRIDA.
 * Sem aguardar a estabilização do histórico: toca assim que o chip aparece.
 * O usuário não deve perder o diálogo para o replace da entrada inicial.
 */
test("trocar de cidade no primeiro quadro não perde a sobreposição", async ({ page }) => {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    await page.goto("/app/inicio")
    const chip = page.locator('[data-acao="cidade"]')
    await chip.click()
    const painel = page.locator('[data-sobreposicao="cidade"]')
    await expect(painel, `tentativa ${tentativa + 1}`).toBeVisible()
    await expect(painel.locator('[data-campo="cidade"]')).toBeVisible()

    await page.goBack()
    await expect(painel).toHaveCount(0)
    await expect(chip).toBeFocused()
    await expect(page).toHaveURL(/\/app\/inicio$/)
  }
})
