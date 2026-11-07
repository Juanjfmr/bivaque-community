import { expect, test } from "@playwright/test"
import { simularGrupos } from "./grupos-ajuda"

test.beforeEach(async ({ page }) => {
  await simularGrupos(page, { membro: true })
})

test("publica, comenta, responde e relê as ações gravadas", async ({ page }) => {
  await page.goto("/app/grupo/g-pets")
  await page.getByRole("button", { name: "Escrever", exact: true }).click()
  await page.getByLabel("Sua publicação").fill("Publicação da comunidade")
  await page.getByRole("button", { name: "Publicar", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/publicacao\/p-real-/)
  await page.getByLabel("Seu comentário").fill("Meu comentário")
  await page.getByRole("button", { name: "Comentar", exact: true }).last().click()
  const raiz = page.locator("[data-comentario]").first()
  await expect(raiz).toContainText("Meu comentário")
  await raiz.getByRole("button", { name: "Responder", exact: true }).click()
  await page.getByLabel("Seu comentário").fill("Uma resposta no fio")
  await page.getByRole("button", { name: "Enviar resposta", exact: true }).click()
  await expect(page.locator('[data-resposta="sim"]')).toContainText("Uma resposta no fio")
  await raiz.getByRole("button", { name: "Útil (0)", exact: true }).click()
  await expect(raiz.getByRole("button", { name: "Útil (1)", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.getByRole("button", { name: "Opções da publicação" }).click()
  await page.getByRole("button", { name: "Salvar publicação", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Publicação salva")
  await page.reload()
  await expect(page.locator("[data-comentario]")).toHaveCount(2)
  await expect(raiz.getByRole("button", { name: "Útil (1)", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.getByRole("button", { name: "Opções da publicação" }).click()
  await expect(page.getByRole("button", { name: "Tirar dos salvos" })).toBeVisible()
})

test("ocultar permite desfazer; denúncia usa motivo e mostra o envio", async ({ page }) => {
  await page.goto("/app/grupo/g-pets")
  await page.getByRole("button", { name: "Opções da publicação" }).click()
  await page.getByRole("button", { name: "Ocultar publicação" }).click()
  await expect(page.locator('[data-cartao="publicacao"]')).toHaveCount(0)
  await page.getByRole("button", { name: "Ocultadas", exact: true }).click()
  await page.getByRole("button", { name: "Opções da publicação" }).click()
  await page.getByRole("button", { name: "Mostrar novamente" }).click()
  await page.getByRole("button", { name: "Recentes", exact: true }).click()
  await page.getByRole("button", { name: "Opções da publicação" }).click()
  await page.getByRole("button", { name: "Denunciar publicação", exact: true }).click()
  await page.getByLabel("Spam", { exact: true }).check()
  await page.getByRole("button", { name: "Enviar denúncia" }).click()
  await expect(page.getByRole("status")).toContainText("Denúncia enviada")
})

test("falhas preservam publicação e comentário e oferecem nova leitura", async ({ page }) => {
  await page.goto("/app/publicacao/p-pets")
  const escrita = /\/api\/app\/grupos\/publicacoes\/[^/]+\/comentarios$/
  await page.route(escrita, (rota) => rota.fulfill({ status: 503, json: {} }))
  await page.getByLabel("Seu comentário").fill("Texto preservado")
  await page
    .locator('[data-compositor-publicacao="sim"]')
    .getByRole("button", { name: "Comentar", exact: true })
    .click()
  await expect(page.getByRole("alert")).toContainText("Seu texto foi mantido")
  await expect(page.getByLabel("Seu comentário")).toHaveValue("Texto preservado")
  await page.unroute(escrita)
  const acao = /\/api\/app\/grupos\/publicacoes\/[^/]+\/acoes$/
  await page.route(acao, (rota) => rota.fulfill({ status: 503, json: {} }))
  await page.locator('[data-acao="util"]').click()
  await expect(page.getByRole("alert").first()).toContainText("gravar a ação")
  await expect(page.locator('[data-acao="util"]')).toHaveAttribute("aria-pressed", "false")
  const leitura = /\/api\/app\/grupos\/publicacoes\/[^/?]+(?:\?.*)?$/
  await page.route(leitura, (rota) => rota.fulfill({ status: 503, json: {} }))
  await page.reload()
  await expect(page.locator('[data-estado="erro"]')).toBeVisible()
  await page.unroute(leitura)
  await page.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(page.getByLabel("Seu comentário")).toBeVisible()
})
