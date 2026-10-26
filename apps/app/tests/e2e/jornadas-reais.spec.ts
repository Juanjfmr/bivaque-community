import { expect, test } from "@playwright/test"

// Sem o fixture de apoio: estes casos exercitam as telas usadas pela pessoa.
test("o Início normal mostra conteúdo e não o andaime de navegação", async ({ page }) => {
  await page.goto("/app/inicio")
  await expect(
    page.getByRole("heading", { name: "Serviços recomendados", exact: true }),
  ).toBeVisible()
  await expect(page.locator('[data-prova="controles-do-app"]')).toHaveCount(0)
})

test("enviar indicação mantém a resposta visível na sessão", async ({ page }) => {
  await page.goto("/app/pergunta/a1")
  const campo = page.getByLabel("Sua resposta")
  const enviar = page.getByRole("button", { name: "Enviar indicação", exact: true })
  await campo.fill("   ")
  await expect(enviar).toBeDisabled()
  for (let vezes = 1; vezes <= 2; vezes++) {
    await campo.fill("Indicação sintética da revisão")
    await enviar.click()
    await expect(page.getByText("Indicação sintética da revisão", { exact: true })).toHaveCount(
      vezes,
    )
    await expect(campo).toHaveValue("")
    await expect(enviar).toBeDisabled()
  }
})

for (const rota of [
  "anuncio",
  "negocio",
  "pergunta",
  "grupo",
  "publicacao",
  "evento",
  "conversa",
]) {
  test(`${rota}: ID inexistente termina em indisponível`, async ({ page }) => {
    await page.goto(`/app/${rota}/id-inexistente`)
    await expect(
      page.getByRole("heading", { name: "Página indisponível", exact: true }),
    ).toBeVisible()
    await expect(page.locator('[data-esqueleto="lista"]')).toHaveCount(0)
    await page.getByRole("button", { name: "Ir para o início", exact: true }).click()
    await expect(page).toHaveURL(/\/app\/inicio$/)
    await expect(
      page.getByRole("heading", { name: "Serviços recomendados", exact: true }),
    ).toBeVisible()
  })
}

test("Voltar fecha a paleta antes de sair da página", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, "a paleta pertence ao desktop")
  await page.goto("/app/inicio")
  const mercado = page.locator('[data-nav="principal"] [data-aba="mercado"]')
  await mercado.click()
  await expect(page).toHaveURL(/\/app\/mercado$/)
  await expect(page.getByRole("heading", { name: "Desapegos", exact: true })).toBeFocused()
  await mercado.focus()
  await expect(mercado).toBeFocused()
  await page.keyboard.press("Control+k")
  const paleta = page.getByRole("dialog", { name: "Buscar e ir para", exact: true })
  await expect(paleta).toBeVisible()
  await page.keyboard.press("Shift+Tab")
  await expect(paleta.locator(":focus")).toHaveCount(1)
  await page.goBack()
  await expect(paleta).toHaveCount(0)
  await expect(page).toHaveURL(/\/app\/mercado$/)
  await expect(mercado).toBeFocused()
  await page.goBack()
  await expect(page).toHaveURL(/\/app\/inicio$/)
})

test("escolher na paleta não deixa camada fantasma no histórico", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024, "a paleta pertence ao desktop")
  await page.goto("/app/inicio")
  await page.keyboard.press("Control+k")
  const paleta = page.getByRole("dialog", { name: "Buscar e ir para", exact: true })
  await paleta.getByLabel("Buscar ou ir para").fill("Salvos")
  await paleta.getByRole("button", { name: /Salvos/ }).click()
  await expect(page).toHaveURL(/\/app\/salvos$/)
  await expect(paleta).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/app\/inicio$/)
  await expect(paleta).toHaveCount(0)
})
