import { expect, test } from "@playwright/test"

const CASOS = [
  {
    id: "create-request",
    nome: "Pedir um serviço",
    titulo: "Instalação e limpeza de ar-condicionado",
    extra: "Ponta Negra",
  },
  {
    id: "create-item",
    nome: "Desapego",
    titulo: "Mesa com quatro cadeiras seminova",
    extra: "Flores",
  },
  {
    id: "indicate",
    nome: "Indicação de negócio",
    titulo: "Oficina automotiva de confiança",
    extra: "Manutenção automotiva",
  },
  {
    id: "create-event",
    nome: "Encontro",
    titulo: "Café de boas-vindas da comunidade",
    extra: "Centro de convivência",
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
    if (caso.id === "create-item") await form.locator("#criacao-preco").fill("750")
    if (caso.id === "create-event") await form.locator("#criacao-horario").fill("2027-02-12T18:30")

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
  await page.locator('[data-fluxo="perguntar"] button[type="submit"]').click()
  await expect(page).toHaveURL(/\/app\/pergunta\/pergunta-demo-/)
})

test("As sete escolhas do Criar têm destinos ou formulário, sem ação silenciosa", async ({
  page,
}) => {
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await expect(page.locator("[data-escolha]")).toHaveCount(7)
  for (const id of ["create-request", "create-item", "indicate", "create-event", "my-biz"]) {
    await page.locator(`[data-escolha="${id}"]`).click()
    await expect(page.locator(`[data-formulario-criacao="${id}"]`)).toBeVisible()
    await page.getByRole("button", { name: "Voltar" }).click()
  }
  await page.locator('[data-escolha="create-property"]').click()
  await expect(page).toHaveURL(/\/app\/imoveis$/)
  await expect(page.locator('[data-fluxo="rascunho-imovel"]')).toBeVisible()
})
