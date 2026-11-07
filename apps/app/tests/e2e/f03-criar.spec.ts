import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import { simularCriar } from "./criar-ajuda"

test.beforeEach(async ({ page }) => simularCriar(page))

async function capturar(page: Page, etapa: string) {
  const pasta = join(process.cwd(), "../..", ".visual", "run-015")
  mkdirSync(pasta, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.screenshot({ path: join(pasta, `mobile-375-${etapa}-${tema}.png`), fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
  await page.emulateMedia({ colorScheme: "light" })
}

test("pergunta: rascunho, revisão, falha com texto preservado e detalhe gravado", async ({
  page,
}) => {
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="ask"]').click()
  const form = page.locator('[data-fluxo="perguntar"]')
  const titulo = "Indicam um serviço de manutenção de bicicletas?"
  await form.locator("#nova-pergunta").fill(titulo)
  await form.locator("#topico-pergunta").fill("Serviços")
  // O tópico é a lista fechada (ADR-20261107 item 5): escolhido, vira categoria.
  await form.getByLabel("Filtrar por Serviços").click()
  await form.getByRole("button", { name: "Salvar rascunho" }).click()
  await expect(form.getByRole("status")).toContainText("Rascunho salvo")
  // Recarregar restaura a entrada com a sobreposição aberta: o rascunho volta no formulário.
  await page.reload()
  await expect(form.locator("#nova-pergunta")).toHaveValue(titulo)
  await expect(form.getByLabel("Filtrar por Serviços")).toHaveAttribute("data-estado", "on")
  const falhar = /\/api\/app\/perguntas$/
  await page.route(falhar, (rota) =>
    rota.request().method() === "POST"
      ? rota.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } })
      : rota.fallback(),
  )
  await form.getByRole("button", { name: "Revisar pergunta" }).click()
  await expect(form.locator('[data-revisao="pergunta"]')).toContainText(titulo)
  await capturar(page, "pergunta-revisao")
  await form.getByRole("button", { name: "Publicar pergunta" }).click()
  await expect(form.getByRole("alert")).toContainText("Seu texto foi mantido")
  await expect(form.locator("#topico-pergunta")).toHaveValue("Serviços")
  await page.unroute(falhar)
  await form.getByRole("button", { name: "Revisar pergunta" }).click()
  await form.getByRole("button", { name: "Publicar pergunta" }).click()
  await expect(page).toHaveURL(/\/app\/pergunta\/90000000-/)
  await expect(page.getByText(titulo, { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText(titulo, { exact: true })).toBeVisible()
})

test("desapego: rascunho com foto, revisão, falha preservada e meus anúncios", async ({ page }) => {
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="create-item"]').click()
  const form = page.locator('[data-formulario-criacao="create-item"]')
  const titulo = "Mesa com quatro cadeiras seminova"
  await form.locator("#criacao-titulo").fill(titulo)
  await form.locator("#criacao-complemento").fill("Flores")
  await form.locator("#criacao-preco").fill("750.50")
  await form
    .locator("#criacao-descricao")
    .fill("Mesa de madeira em bom estado. Retirada a combinar.")
  await form.locator("#criacao-foto").setInputFiles({
    name: "item.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT1sAAAAASUVORK5CYII=",
      "base64",
    ),
  })
  await expect(form.getByAltText("Foto escolhida para o anúncio")).toBeVisible()
  await form.getByRole("button", { name: "Salvar rascunho" }).click()
  await page.reload()
  await page.locator('[data-escolha="create-item"]').click()
  await expect(form.locator("#criacao-titulo")).toHaveValue(titulo)
  await expect(form.getByAltText("Foto escolhida para o anúncio")).toBeVisible()
  const falhar = /\/api\/app\/mercado$/
  await page.route(falhar, (rota) =>
    rota.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } }),
  )
  await form.getByRole("button", { name: "Revisar anúncio" }).click()
  await expect(form.locator('[data-revisao="desapego"]')).toContainText(titulo)
  await capturar(page, "desapego-revisao")
  await form.getByRole("button", { name: "Publicar anúncio" }).click()
  await expect(form.getByRole("alert")).toContainText("campos e a foto foram mantidos")
  await expect(form.locator("#criacao-preco")).toHaveValue("750.50")
  await expect(form.getByAltText("Foto escolhida para o anúncio")).toBeVisible()
  await page.unroute(falhar)
  await form.getByRole("button", { name: "Revisar anúncio" }).click()
  await form.getByRole("button", { name: "Publicar anúncio" }).click()
  await expect(page).toHaveURL(/\/app\/anuncio\/[0-9a-f-]+$/)
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible()
  await page.goto("/app/meus-anuncios")
  await expect(page.locator('[data-cartao="anuncio"]')).toContainText(titulo)
})

test("Meus anúncios: vazio honesto, erro recuperável e acesso negado", async ({ page }) => {
  await page.goto("/app/meus-anuncios")
  await expect(page.getByText("Você ainda não anunciou nada")).toBeVisible()
  const rotaMeus = /\/api\/app\/mercado\/meus(?:\?|$)/
  await page.route(rotaMeus, (rota) =>
    rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } }),
  )
  await page.reload()
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible()
  await expect(page.getByText("Você ainda não anunciou nada")).toHaveCount(0)
  await page.unroute(rotaMeus)
  await page.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(page.getByText("Você ainda não anunciou nada")).toBeVisible()
  await page.route(rotaMeus, (rota) => rota.fulfill({ status: 403, json: { erro: "recusado" } }))
  await page.reload()
  await expect(page.locator('[data-tela="meus-anuncios"]')).toContainText("acesso")
})
