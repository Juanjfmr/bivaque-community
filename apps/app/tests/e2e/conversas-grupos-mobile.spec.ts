import { expect, test } from "@playwright/test"

test("Conversas: origem do anúncio real pode ser aberta sem rota genérica", async ({ page }) => {
  await page.goto("/app/conversas")
  const thread = page.locator('[data-thread="t1"]')
  await expect(thread).toContainText("Paulo R.")
  await expect(thread).toContainText("Berço com colchão")
  await thread.getByRole("button", { name: "Ver origem: Berço com colchão" }).click()
  await expect(page).toHaveURL(/\/app\/anuncio\/i3$/)
  await page.goto("/app/conversas")
  await page.locator('[data-thread="t1"] > button').click()
  await expect(page).toHaveURL(/\/app\/conversa\/t1$/)
  const contexto = page.locator('[data-tela="conversa"] [data-contexto-conversa="anuncio"]')
  await expect(contexto).toContainText("Berço com colchão")
  await contexto.click()
  await expect(page).toHaveURL(/\/app\/anuncio\/i3$/)
})

test("Conversa: compositor mobile, resposta rápida e histórico de prévias por sessão", async ({
  page,
}) => {
  await page.goto("/app/conversa/t2")
  const caixa = page.locator('[data-compositor-conversa="sim"]')
  await expect(caixa).toBeVisible()
  await expect(page.locator('[data-contexto-conversa="negocio"]')).toContainText(
    "Amazon Climatização",
  )
  await caixa.getByRole("button", { name: "Podemos combinar a retirada?" }).click()
  await expect(caixa.locator("#mensagem-da-conversa")).toHaveValue("Podemos combinar a retirada?")
  await caixa.locator('[data-acao="adicionar-previa-conversa"]').click()
  await expect(page.locator('[data-mensagem-previa="sim"]')).toContainText(
    "Podemos combinar a retirada?",
  )
  await expect(page.locator('[data-mensagem-previa="sim"]')).toContainText("não enviada")
  const medidas = await caixa.boundingBox()
  const largura = page.viewportSize()?.width ?? 375
  expect(medidas).not.toBeNull()
  if (medidas) {
    expect(medidas.x).toBeGreaterThanOrEqual(-1)
    expect(medidas.x + medidas.width).toBeLessThanOrEqual(largura + 1)
  }
  await page.reload()
  await expect(page.locator('[data-mensagem-previa="sim"]')).toHaveCount(1)
  await page.goto("/app/conversas")
  await expect(page.locator('[data-thread="t2"]')).toContainText("Prévia não enviada")
  await expect(page.locator('[data-thread="t2"]')).toContainText("Podemos combinar a retirada?")
})

test("Conversa sem anúncio associado mostra somente a origem informativa", async ({ page }) => {
  await page.goto("/app/conversa/t3")
  await expect(page.locator('[data-contexto-conversa="informativo"]')).toContainText(
    "Escola no 3º ano",
  )
  await expect(page.getByRole("button", { name: /Ver origem:/ })).toHaveCount(0)
})

test("Grupo fechado: requer solicitação e não mostra publicações enquanto fora", async ({
  page,
}) => {
  await page.goto("/app/grupo/g-cmm")
  await expect(page.locator('[data-controles-grupo="sim"]')).toBeVisible()
  await expect(page.locator('[data-compositor-grupo="sim"]')).toHaveCount(0)
  await expect(page.getByText("conteúdo dos grupos fechados")).toBeVisible()
  await page.locator('[data-regras-grupo="sim"] summary').click()
  await expect(page.locator('[data-regras-grupo="sim"]')).toContainText(
    "Assuntos da escola e das turmas",
  )
  await page.locator('[data-acao="grupo-participar"]').click()
  await expect(page.locator('[data-estado-participacao="pendente"]')).toContainText(
    "Nada foi enviado",
  )
  await page.reload()
  await expect(page.locator('[data-estado-participacao="pendente"]')).toBeVisible()
  await page.locator('[data-acao="cancelar-solicitacao"]').click()
  await expect(page.locator('[data-acao="grupo-participar"]')).toBeVisible()
})

test("Grupo aberto: entrar, escrever rascunho, excluir e sair com confirmação", async ({
  page,
}) => {
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="grupo-participar"]').click()
  await expect(page.locator('[data-estado-participacao="membro"]')).toBeVisible()
  await page.locator('[data-acao="escrever-grupo"]').click()
  const dialogo = page.locator('[data-dialogo="escrever-grupo"]')
  await expect(dialogo).toBeVisible()
  await dialogo.locator("#texto-grupo").fill("Procuro veterinário que atenda à noite na região.")
  await dialogo.locator('[data-acao="salvar-rascunho-grupo"]').click()
  await expect(dialogo).toHaveCount(0)
  await expect(page.locator('[data-rascunho-grupo="sim"]')).toContainText("Procuro veterinário")
  await page.reload()
  await expect(page.locator('[data-rascunho-grupo="sim"]')).toHaveCount(1)
  await page.locator('[data-acao="excluir-rascunho-grupo"]').click()
  await expect(page.locator('[data-rascunho-grupo="sim"]')).toHaveCount(0)
  await page.locator('[data-acao="sair-grupo"]').click()
  await expect(page.locator('[data-dialogo="sair-grupo"]')).toBeVisible()
  await page.locator('[data-dialogo="sair-grupo"] [data-acao="confirmar-saida-grupo"]').click()
  await expect(page.locator('[data-acao="grupo-participar"]')).toBeVisible()
})

test("Grupo com administrador mostra pedidos, mas não oferece aprovação fictícia", async ({
  page,
}) => {
  await page.goto("/app/grupo/g-futebol")
  const pedidos = page.locator('[data-pedidos-entrada="sim"]')
  await expect(pedidos).toBeVisible()
  await pedidos.locator("summary").click()
  await expect(pedidos).toContainText("Bruno C.")
  await expect(pedidos).toContainText("Thiago S.")
  await expect(pedidos).toContainText("requerem o servidor")
  await expect(page.locator('[data-compositor-grupo="sim"]')).toBeVisible()
})
