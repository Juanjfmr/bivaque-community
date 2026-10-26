import { expect, test } from "@playwright/test"

test("a busca tem uma entrada que filtra e limpa os resultados", async ({ page }) => {
  await page.goto("/app/busca")
  const campo = page.getByRole("searchbox", { name: "Buscar no Bivaque", exact: true })
  await expect(campo).toHaveCount(1)
  await campo.fill("berço")
  await expect(page.getByText("Berço com colchão", { exact: true })).toBeVisible()
  await campo.fill("zzzzsemresultado")
  await expect(page.getByRole("heading", { name: "Nada sobre “zzzzsemresultado”" })).toBeVisible()
  await page.getByRole("button", { name: "Limpar busca", exact: true }).click()
  await expect(campo).toHaveValue("")
  await expect(campo).toBeFocused()
  await expect(page.getByRole("heading", { name: "Sugestões", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "berço", exact: true }).click()
  await expect(campo).toHaveValue("berço")
  await expect(page.getByText("Berço com colchão", { exact: true })).toBeVisible()
})

test("cidade mantém a folha móvel e fica compacta e centralizada no desktop", async ({ page }) => {
  await page.goto("/app/inicio")
  const cidade = page.locator('[data-topo="barra"] [data-acao="cidade"]')
  await cidade.click()
  const painel = page.getByRole("dialog", { name: "Trocar de cidade", exact: true })
  await expect(painel).toBeVisible()
  const largura = page.viewportSize()?.width ?? 0
  await expect.poll(async () => (await painel.boundingBox())?.width ?? 0).toBeLessThanOrEqual(600)
  const caixa = await painel.boundingBox()
  expect(caixa).not.toBeNull()
  if (caixa) {
    expect(Math.abs(caixa.x + caixa.width / 2 - largura / 2)).toBeLessThan(2)
    if (largura < 720) expect(caixa.width).toBeCloseTo(largura, 0)
  }
  await page.getByRole("button", { name: "Cancelar", exact: true }).click()
  await expect(painel).toHaveCount(0)
  await expect(cidade).toBeFocused()
  await cidade.click()
  await page.getByLabel("Cidade", { exact: true }).fill("Recife")
  await page.getByRole("button", { name: "Ver esta cidade", exact: true }).click()
  await expect(cidade).toContainText("Recife")
  await expect(page.getByText("Você está conhecendo Recife.", { exact: false })).toBeVisible()
})

test("o topo preserva ações e mostra Encontro sem cortar em 375", async ({ page }) => {
  await page.goto("/app/evento/e1")
  const topo = page.locator('[data-topo="barra"]')
  const titulo = topo.locator('[data-titulo="topo"]')
  await expect(titulo).toHaveText("Encontro")
  for (const nome of ["Voltar", "Conversas", "Buscar"]) {
    const botao = topo.getByRole("button", { name: nome, exact: true })
    await expect(botao).toBeVisible()
    const caixa = await botao.boundingBox()
    expect(caixa?.width).toBeGreaterThanOrEqual(44)
    expect(caixa?.height).toBeGreaterThanOrEqual(44)
  }
  await expect(topo.locator('[data-acao="cidade"]')).toContainText("Manaus")
  expect(await titulo.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test("o topo da conversa acompanha a pessoa e não conserva nome ao sair", async ({ page }) => {
  await page.goto("/app/conversa/nao-existe")
  const topo = page.locator('[data-topo="barra"]')
  const titulo = topo.locator('[data-titulo="topo"]')
  await expect(
    page.getByRole("heading", { name: "Página indisponível", exact: true }),
  ).toBeVisible()
  await topo.getByRole("button", { name: "Conversas", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/conversas$/)
  await page.getByRole("button", { name: /^Paulo R\./ }).click()
  await expect(titulo).toHaveText("Paulo R.")
  expect(await titulo.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await topo.getByRole("button", { name: "Conversas", exact: true }).click()
  await expect(titulo).toHaveText("Conversas")
  await page.getByRole("button", { name: /^Amazon Climatização/ }).click()
  await expect(titulo).toHaveText("Amazon Climatização")
  expect(await titulo.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)

  // Saltos do histórico nativo mantêm a casca viva e trocam o ID sem recarregar.
  await page.evaluate(() => history.go(-2))
  await expect(page).toHaveURL(/\/app\/conversa\/t1$/)
  await expect(titulo).toHaveText("Paulo R.")
  await page.evaluate(() => history.go(2))
  await expect(page).toHaveURL(/\/app\/conversa\/t2$/)
  await expect(titulo).toHaveText("Amazon Climatização")
  await page.evaluate(() => history.go(-4))
  await expect(page).toHaveURL(/\/app\/conversa\/nao-existe$/)
  await expect(
    page.getByRole("heading", { name: "Página indisponível", exact: true }),
  ).toBeVisible()
  await expect(titulo).toHaveText("Conversa")
})
