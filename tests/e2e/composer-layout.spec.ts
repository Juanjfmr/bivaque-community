import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

test("o menu real de edição leva à rota addressável", async ({ page }) => {
  await signInAs(page.context(), "dono-vila@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/community", { waitUntil: "networkidle" })

  const card = page.locator("article").filter({ hasText: "Aviso da cidade para todas as vilas" })
  await expect(card).toBeVisible()
  await card.getByRole("button", { name: "Mais opções" }).click()
  await page.getByRole("menuitem", { name: "Editar publicação" }).click()
  await expect(page).toHaveURL(/\/publicacoes\/80000000-0000-4000-8000-000000000f01\/editar/)
  await expect(page.getByRole("heading", { level: 1, name: "Editar publicação" })).toBeVisible()
})

test("a rota de edição não abre o formulário para outro membro", async ({ page }) => {
  await signInAs(page.context(), "membro-1@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/publicacoes/80000000-0000-4000-8000-000000000f01/editar", {
    waitUntil: "networkidle",
  })

  await expect(page.getByText("Esta publicação não está disponível para edição.")).toBeVisible()
  await expect(page.locator('[data-composer-form="edit"]')).toHaveCount(0)
})

test("edição de texto com foto envia um tipo de postagem válido", async ({ page }) => {
  await signInAs(page.context(), "dono-vila@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/publicacoes/80000000-0000-4000-8000-000000000f01/editar", {
    waitUntil: "networkidle",
  })

  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  )
  await page.getByLabel("Selecionar nova foto").setInputFiles({
    name: "fixture.png",
    mimeType: "image/png",
    buffer: image,
  })
  await expect(page.getByText("Foto anexada", { exact: true })).toBeVisible()

  const patchResponsePromise = page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/rest/v1/posts") && candidate.request().method() === "PATCH",
    { timeout: 20_000 },
  )
  await page.getByTestId("edit-save-submit").click()
  const patchResponse = await patchResponsePromise
  expect(patchResponse.status()).toBeGreaterThanOrEqual(200)
  expect(patchResponse.status()).toBeLessThan(300)
  await expect(page).toHaveURL(/\/community/)

  await page.goto("/publicacoes/80000000-0000-4000-8000-000000000f01/editar", {
    waitUntil: "networkidle",
  })
  await expect(page.locator('[data-composer-form="edit"]')).toHaveAttribute(
    "data-post-type",
    "photo",
  )
  await expect(page.getByText("Foto anexada", { exact: true })).toBeVisible()
})

test("erro de edição preserva o texto e mantém a rota disponível", async ({ page }) => {
  await signInAs(page.context(), "dono-vila@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/publicacoes/80000000-0000-4000-8000-000000000f01/editar", {
    waitUntil: "networkidle",
  })

  const text = "Texto que deve continuar quando a edição falha."
  await page.getByLabel("Conteúdo").fill(text)
  await page.route("**/rest/v1/posts**", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "simulated editor failure" }),
      })
      return
    }
    await route.continue()
  })

  await page.getByTestId("edit-save-submit").click()
  await expect(page.getByTestId("edit-save-error")).toContainText(
    "Não foi possível salvar. Seu texto continua aqui.",
  )
  await expect(page.getByLabel("Conteúdo")).toHaveValue(text)
  await expect(page).toHaveURL(/\/publicacoes\/80000000-0000-4000-8000-000000000f01\/editar/)
})

test("sair com alteração exige confirmação antes de descartar", async ({ page }) => {
  await signInAs(page.context(), "dono-vila@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/publicacoes/80000000-0000-4000-8000-000000000f01/editar", {
    waitUntil: "networkidle",
  })

  await page.getByLabel("Conteúdo").fill("Alteração que não deve sair sem confirmação.")
  await page.getByRole("button", { name: "Cancelar", exact: true }).click()
  const confirmation = page.getByRole("dialog", { name: "Sair sem salvar?" })
  await expect(confirmation).toBeVisible()
  await expect(confirmation.getByRole("button", { name: "Continuar editando" })).toBeVisible()
  await expect(confirmation.getByRole("button", { name: "Descartar alterações" })).toBeVisible()
  await confirmation.getByRole("button", { name: "Descartar alterações" }).click()
  await expect(page).toHaveURL(/\/community/)
})

test("a rota de nova pergunta mantém a superfície addressável no desktop", async ({ page }) => {
  await signInAs(page.context(), "membro-1@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/publicacoes/nova", { waitUntil: "networkidle" })

  await expect(page.getByRole("heading", { level: 1, name: "Nova pergunta" })).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toBeVisible()
})

test("a edição tem rota addressável e não fica fora do viewport", async ({ page }) => {
  await signInAs(page.context(), "dono-vila@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/publicacoes/80000000-0000-4000-8000-000000000f01/editar", {
    waitUntil: "networkidle",
  })

  await expect(page.getByRole("heading", { level: 1, name: "Editar publicação" })).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByLabel("Selecionar nova foto")).toBeVisible()
  const form = page.locator('[data-composer-form="edit"]')
  await expect(form).toBeVisible()
  const geometry = await form.evaluate((element) => {
    const formWidth = element.getBoundingClientRect().width
    const fields = [...element.querySelectorAll("textarea")]
    return {
      formWidth,
      fields: fields.map((field) => field.getBoundingClientRect().width),
    }
  })
  for (const width of geometry.fields) {
    expect(width).toBeGreaterThanOrEqual(geometry.formWidth * 0.72)
  }
})

test("campos do compositor ocupam a coluna de formulário no desktop", async ({ page }) => {
  await signInAs(page.context(), "visual@bivaque.example.invalid")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/publicacoes/nova", { waitUntil: "networkidle" })

  const form = page.locator("[data-composer-form]")
  await expect(form).toBeVisible()
  const geometry = await form.evaluate((form) => {
    const formWidth = form.getBoundingClientRect().width
    const fields = [...form.querySelectorAll("textarea")]
    return {
      formWidth,
      fields: fields.map((field) => field.getBoundingClientRect().width),
    }
  })

  expect(geometry.fields).toHaveLength(2)
  for (const width of geometry.fields) {
    expect(width).toBeGreaterThanOrEqual(geometry.formWidth * 0.72)
  }
})
