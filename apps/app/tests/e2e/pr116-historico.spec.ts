import { expect, test } from "@playwright/test"
import { simularGrupos } from "./grupos-ajuda"
import { aplicarStubMercado } from "./stub-mercado"

for (const caso of [
  { escolha: "create-property", caminho: "/app/imoveis", painel: '[data-fluxo="rascunho-imovel"]' },
  { escolha: "ask", caminho: "/app/comunidade", painel: '[data-fluxo="perguntar"]' },
]) {
  test(`Criar > ${caso.escolha} abre uma única entrada de diálogo`, async ({ page }) => {
    await page.goto("/app/inicio")
    await page.locator('[data-acao="criar"]').click()
    await page.locator(`[data-escolha="${caso.escolha}"]`).click()
    await expect(page.locator(caso.painel)).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`${caso.caminho}$`))
    await expect(page.locator(caso.painel)).toBeHidden()
    await page.goForward()
    await expect(page.locator(caso.painel)).toBeVisible()
  })
}

for (const caso of [
  {
    caminho: "/app/imoveis",
    botao: "Anunciar imóvel",
    painel: '[data-fluxo="rascunho-imovel"]',
    campo: "#imovel-titulo",
  },
  {
    caminho: "/app/comunidade",
    botao: "Perguntar",
    painel: '[data-fluxo="perguntar"]',
    campo: "#nova-pergunta",
  },
  {
    caminho: "/app/anuncio/a-1",
    botao: "Tenho interesse",
    painel: '[data-fluxo="rascunho-contato"]',
    campo: "#mensagem-contato",
  },
  {
    caminho: "/app/anuncio/i2",
    botao: "Fazer uma oferta",
    painel: '[data-fluxo="rascunho-contato"]',
    campo: "#mensagem-contato",
  },
]) {
  test(`Voltar fecha ${caso.botao} antes de sair da rota e Avançar reabre`, async ({ page }) => {
    aplicarStubMercado(page)
    await page.goto("/app/inicio")
    await page.goto(caso.caminho)
    const acionador = page.getByRole("button", { name: caso.botao, exact: true }).first()
    await acionador.click()
    const painel = page.locator(caso.painel)
    await expect(painel).toBeVisible()
    await painel.locator(caso.campo).fill("Conteúdo ainda não salvo")
    await page.screenshot({ path: test.info().outputPath("dialogo-aberto.png") })
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`${caso.caminho}$`))
    await expect(painel).toBeHidden()
    await expect(acionador).toBeFocused()
    await page.goForward()
    await expect(painel).toBeVisible()
    await expect(painel.locator(caso.campo)).toHaveValue("Conteúdo ainda não salvo")
    await page.keyboard.press("Escape")
    await expect(painel).toBeHidden()
    await expect(acionador).toBeFocused()
  })
}

test("Voltar fecha escrever/sair do grupo e preserva o texto", async ({ page }) => {
  await simularGrupos(page)
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="grupo-participar"]').click()
  const escrever = page.locator('[data-acao="escrever-grupo"]')
  await escrever.click()
  const painel = page.locator('[data-dialogo="escrever-grupo"]')
  await painel.locator("#texto-grupo").fill("Publicação ainda não salva")
  await page.screenshot({ path: test.info().outputPath("grupo-escrever.png") })
  await page.goBack()
  await expect(page).toHaveURL(/\/app\/grupo\/g-pets$/)
  await expect(painel).toBeHidden()
  await expect(escrever).toBeFocused()
  await page.goForward()
  await expect(painel.locator("#texto-grupo")).toHaveValue("Publicação ainda não salva")
  await page.keyboard.press("Escape")
  await expect(painel).toBeHidden()
  await expect(escrever).toBeFocused()
  const sair = page.locator('[data-acao="sair-grupo"]')
  await sair.click()
  await expect(page.locator('[data-dialogo="sair-grupo"]')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath("grupo-sair.png") })
  await page.goBack()
  await expect(page.locator('[data-dialogo="sair-grupo"]')).toBeHidden()
  await expect(sair).toBeFocused()
  await expect(page.locator('[data-estado-participacao="membro"]')).toBeVisible()
})

test("limite do grupo avisa dentro do diálogo e mantém o texto digitado", async ({ page }) => {
  await simularGrupos(page, { membro: true })
  await page.addInitScript(() => {
    sessionStorage.setItem("bivaque:grupo-previa:manaus:g-pets:estado", "membro")
    sessionStorage.setItem(
      "bivaque:grupo-previa:manaus:g-pets:rascunhos",
      JSON.stringify(Array.from({ length: 10 }, (_, i) => `Publicação anterior ${i}`)),
    )
  })
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="escrever-grupo"]').click()
  const painel = page.locator('[data-dialogo="escrever-grupo"]')
  await painel.locator("#texto-grupo").fill("Nova publicação ainda não salva")
  await painel.getByRole("button", { name: "Salvar rascunho", exact: true }).click()
  await expect(painel.getByRole("alert")).toContainText("Limite de 10 rascunhos")
  await expect(painel.locator("#texto-grupo")).toHaveValue("Nova publicação ainda não salva")
  await page.keyboard.press("Escape")
  await expect(page.locator('[data-rascunho-grupo="sim"]')).toHaveCount(10)
  await expect(page.getByText("Publicação anterior 0", { exact: true })).toBeVisible()
})
