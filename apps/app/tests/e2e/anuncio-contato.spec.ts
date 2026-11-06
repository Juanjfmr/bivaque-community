import { expect, test } from "@playwright/test"
import { aplicarStubMercado } from "./stub-mercado"

test("Anúncio: interesse abre editor e guarda rascunho sem enviar", async ({ page }) => {
  aplicarStubMercado(page)
  const interesses: string[] = []
  page.on("request", (requisicao) => {
    if (requisicao.url().endsWith("/interesse")) interesses.push(requisicao.method())
  })
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
  expect(interesses).toEqual([])
  await page.getByRole("button", { name: "Tenho interesse" }).click()
  await folha.getByRole("button", { name: "Abrir conversa", exact: true }).click()
  await expect(folha).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Conversa aberta" })).toBeVisible()
  expect(interesses).toEqual(["POST"])
  await page.getByRole("button", { name: "Ver conversa" }).click()
})

test("Anúncio: oferta exige valor e conserva uma proposta apenas local", async ({ page }) => {
  aplicarStubMercado(page)
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

test("Anúncio: falha ao abrir conversa preserva a mensagem e permite tentar novamente", async ({
  page,
}) => {
  aplicarStubMercado(page)
  await page.route(/\/api\/app\/mercado\/i3\/interesse$/, (rota) =>
    rota.fulfill({ status: 503, json: { erro: "indisponivel" } }),
  )
  await page.goto("/app/anuncio/i3")
  await page.getByRole("button", { name: "Tenho interesse" }).click()
  const folha = page.locator('[data-fluxo="rascunho-contato"]')
  const mensagem = folha.locator("#mensagem-contato")
  await mensagem.fill("Olá! Podemos combinar a retirada amanhã?")
  await folha.getByRole("button", { name: "Abrir conversa", exact: true }).click()
  await expect(folha.getByRole("alert")).toBeVisible()
  await expect(mensagem).toHaveValue("Olá! Podemos combinar a retirada amanhã?")
  await expect(page.locator('[data-estado="interesse-gravado"]')).toHaveCount(0)
  await page.unroute(/\/api\/app\/mercado\/i3\/interesse$/)
  await folha.getByRole("button", { name: "Abrir conversa", exact: true }).click()
  await expect(folha).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Conversa aberta" })).toBeVisible()
})
