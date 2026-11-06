import { expect, test } from "@playwright/test"
import { simularCriar } from "./criar-ajuda"

test.beforeEach(async ({ page }) => simularCriar(page))

const CASOS = [
  {
    id: "indicate",
    nome: "Indicação de negócio",
    titulo: "Oficina automotiva de confiança",
    extra: "Manutenção automotiva",
  },
  {
    id: "my-biz",
    nome: "Meu negócio",
    titulo: "Serviços residenciais e pintura",
    extra: "Manutenção residencial",
  },
] as const

for (const caso of CASOS) {
  test(`Criar: ${caso.id} gera rascunho consultável sem publicação`, async ({ page }) => {
    await page.goto("/app/inicio")
    await page.locator('[data-acao="criar"]').click()
    await page.locator(`[data-escolha="${caso.id}"]`).click()
    const form = page.locator(`[data-formulario-criacao="${caso.id}"]`)
    await expect(form).toBeVisible()
    await form.locator("#criacao-titulo").fill(caso.titulo)
    await form.locator("#criacao-complemento").fill(caso.extra)
    await form
      .locator("#criacao-descricao")
      .fill("Atendimento a combinar com a comunidade, somente uma prévia demonstrativa.")

    const limites = await form.boundingBox()
    const largura = page.viewportSize()?.width ?? 375
    expect(limites).not.toBeNull()
    if (limites) {
      expect(limites.x).toBeGreaterThanOrEqual(-1)
      expect(limites.x + limites.width).toBeLessThanOrEqual(largura + 1)
    }

    await form.locator('[data-acao="salvar-rascunho-criacao"]').click()
    await expect(page.locator('[data-criar-etapa="concluido"]')).toBeVisible()
    await page.getByRole("button", { name: "Ver meus rascunhos" }).click()
    await expect(page).toHaveURL(/\/app\/meus-anuncios$/)
    const item = page.locator(`[data-rascunho-criacao="${caso.id}"]`)
    await expect(item).toContainText(caso.titulo)
    await expect(item).toContainText(caso.extra)
    await expect(page.locator('[data-rascunhos-criacao="sim"]')).toContainText("não publicados")

    await item.locator('[data-acao="detalhes-rascunho"]').click()
    await expect(item).toContainText("Atendimento a combinar")
    await page.reload()
    await expect(page.locator(`[data-rascunho-criacao="${caso.id}"]`)).toBeVisible()
    await page
      .locator(`[data-rascunho-criacao="${caso.id}"] [data-acao="detalhes-rascunho"]`)
      .click()
    await page
      .locator(`[data-rascunho-criacao="${caso.id}"] [data-acao="excluir-rascunho-criacao"]`)
      .click()
    await page
      .locator(`[data-rascunho-criacao="${caso.id}"] [data-acao="confirmar-exclusao-rascunho"]`)
      .click()
    await expect(page.locator(`[data-rascunho-criacao="${caso.id}"]`)).toHaveCount(0)
  })
}

test("Criar > Pedir indicação navega e abre formulário de perguntas existente", async ({
  page,
}) => {
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="ask"]').click()
  await expect(page).toHaveURL(/\/app\/comunidade$/)
  await expect(page.locator('[data-fluxo="perguntar"]')).toBeVisible()
  await page
    .locator('[data-fluxo="perguntar"] input#nova-pergunta')
    .fill("Indicam um serviço de manutenção de bicicletas?")
  await page.getByRole("button", { name: "Revisar pergunta" }).click()
  await page.getByRole("button", { name: "Publicar pergunta" }).click()
  await expect(page).toHaveURL(/\/app\/pergunta\/90000000-/)
})

test("As sete escolhas do Criar têm destinos ou formulário, sem ação silenciosa", async ({
  page,
}) => {
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await expect(page.locator("[data-escolha]")).toHaveCount(7)
  for (const id of ["create-item", "indicate", "my-biz"]) {
    await page.locator(`[data-escolha="${id}"]`).click()
    await expect(page.locator(`[data-formulario-criacao="${id}"]`)).toBeVisible()
    await page.getByRole("button", { name: "Voltar" }).click()
  }
  await page.locator('[data-escolha="create-event"]').click()
  await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
  await page.getByRole("button", { name: "Fechar", exact: true }).click()
  await page.locator('[data-escolha="create-request"]').click()
  await expect(page).toHaveURL(/\/app\/negocios$/)
  // Negócios é rota filha: a barra com o Criar só existe nas raízes no celular.
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="create-property"]').click()
  await expect(page).toHaveURL(/\/app\/imoveis$/)
  await expect(page.locator('[data-fluxo="rascunho-imovel"]')).toBeVisible()
})
