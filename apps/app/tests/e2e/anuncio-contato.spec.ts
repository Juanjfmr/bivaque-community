import { expect, test } from "@playwright/test"

test("Anúncio: interesse abre editor e guarda rascunho sem enviar", async ({ page }) => {
  await page.goto("/app/anuncio/i3")
  await page.getByRole("button", { name: "Tenho interesse" }).click()
  const folha = page.locator('[data-fluxo="rascunho-contato"]')
  await expect(folha).toBeVisible()
  await expect(folha).toContainText("não será enviada")
  await folha
    .locator("#mensagem-contato")
    .fill("Olá! O berço ainda está disponível para retirada amanhã?")
  await folha.locator('[data-acao="guardar-contato"]').click()
  await expect(folha).toHaveCount(0)
  await expect(page.locator('[data-rascunho-contato="sim"]')).toContainText("não enviada")
  await page.reload()
  await expect(page.locator('[data-rascunho-contato="sim"]')).toContainText(
    "berço ainda está disponível",
  )
  await page.locator('[data-acao="excluir-contato"]').click()
  await expect(page.locator('[data-rascunho-contato="sim"]')).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Ver conversa demonstrativa sobre o anúncio" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Ver conversa demonstrativa sobre o anúncio" }).click()
  await expect(page).toHaveURL(/\/app\/conversa\/t1$/)
})

test("Anúncio: oferta exige valor e conserva uma proposta apenas local", async ({ page }) => {
  await page.goto("/app/anuncio/i2")
  await page.getByRole("button", { name: "Fazer uma oferta" }).click()
  const folha = page.locator('[data-fluxo="rascunho-contato"]')
  await expect(folha).toBeVisible()
  await expect(folha.locator("#valor-contato")).toBeVisible()
  await folha.locator("#valor-contato").fill("2850")
  await folha
    .locator("#mensagem-contato")
    .fill("Gostaria de propor este valor por mês, sujeito à visita.")
  await folha.locator('[data-acao="guardar-contato"]').click()
  await expect(folha).toHaveCount(0)
  await expect(page.locator('[data-rascunho-contato="sim"]')).toContainText("Oferta de R$ 2850")
  await expect(page.locator('[data-rascunho-contato="sim"]')).toContainText("não enviada")
  await expect(
    page.getByRole("button", { name: "Ver conversa demonstrativa sobre o anúncio" }),
  ).toHaveCount(0)
})
