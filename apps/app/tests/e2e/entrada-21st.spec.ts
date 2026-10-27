import { expect, test } from "@playwright/test"

test("cadastro exige aceite e permite simular análise de documento", async ({ page }) => {
  await page.goto("/app/entrar/conta")
  await expect(
    page.getByText("Jornada demonstrativa: nenhuma informação é enviada ou verificada."),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeDisabled()
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await page.getByRole("button", { name: "Criar conta" }).click()
  await expect(page.getByRole("heading", { name: "Confirme seu vínculo." })).toBeVisible()
  await page.getByRole("button", { name: "Simular consulta indisponível" }).click()
  await expect(
    page.getByRole("heading", { name: "Não foi possível concluir a consulta." }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Enviar identidade" }).click()
  await expect(page.getByRole("button", { name: "Enviar arquivo" })).toBeDisabled()
  await page.locator('input[type="file"]').setInputFiles({
    name: "identidade.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("exemplo"),
  })
  await page.getByRole("button", { name: "Enviar arquivo" }).click()
  await expect(page.getByRole("heading", { name: "Vínculo em análise." })).toBeVisible()
})

test("cadastro percorre vínculo confirmado, cidade e boas-vindas", async ({ page }) => {
  await page.goto("/app/entrar/conta")
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await page.getByRole("button", { name: "Criar conta" }).click()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Vínculo confirmado." })).toBeVisible()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Sua cidade e seu momento." })).toBeVisible()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Bem-vindo ao Bivaque." })).toBeVisible()
  await page.getByRole("button", { name: "Ir para o início" }).click()
  await expect(page).toHaveURL(/\/app\/(inicio)?$/)
})

test("cidade mostra campos adequados ao momento e mantém o layout", async ({ page }) => {
  await page.goto("/app/entrar/cidade")
  await page.getByLabel("Chegando", { exact: true }).check()
  await expect(page.getByLabel("Data de chegada")).toBeVisible()
  await page.getByLabel("Saindo", { exact: true }).check()
  await expect(page.getByLabel("Data de chegada")).toHaveCount(0)
  await expect(page.getByLabel("Data de saída")).toBeVisible()
  await expect(page.getByLabel("Cidade de destino")).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.getByLabel("Moro aqui", { exact: true }).check()
  await expect(page.getByLabel("Cidade de destino")).toHaveCount(0)
  await expect(page.getByLabel("Data de saída")).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test("recuperação informa que não houve envio e retorna ao login", async ({ page }) => {
  await page.goto("/app/entrar/login")
  await expect(page.getByRole("img", { name: "Bivaque" })).toBeVisible()
  await page.getByRole("button", { name: "Esqueci minha senha" }).click()
  await page.getByLabel("E-mail").fill("pessoa@example.invalid")
  await page.getByRole("button", { name: "Enviar instruções" }).click()
  await expect(page.getByRole("status")).toContainText("nenhum e-mail foi enviado")
  await page.getByRole("button", { name: "Voltar para entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
})
