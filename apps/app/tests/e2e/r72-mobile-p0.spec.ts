import { expect, test } from "@playwright/test"

test("R72 P0: Home contém carrosséis operáveis e prévia do próximo cartão", async ({ page }) => {
  await page.goto("/app/inicio")
  const trilhos = page.locator('[data-tela="inicio"] [data-grade="carrossel-mobile"]')
  await expect(trilhos).toHaveCount(2)
  await expect(trilhos.first().locator("[data-cartao]").first()).toBeVisible()
  if ((page.viewportSize()?.width ?? 0) >= 720) return
  const dimensoes = await trilhos.first().evaluate((elemento) => {
    const cartao = elemento.querySelector("[data-cartao]")
    return {
      largura: elemento.clientWidth,
      rolagem: elemento.scrollWidth,
      cartao: cartao?.getBoundingClientRect().width ?? 0,
    }
  })
  expect(dimensoes.rolagem).toBeGreaterThan(dimensoes.largura)
  expect(dimensoes.cartao).toBeLessThan(dimensoes.largura * 0.9)
  await trilhos.first().evaluate((elemento) => {
    elemento.scrollLeft = elemento.clientWidth
  })
  await expect.poll(() => trilhos.first().evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
})

test("R72 P0: Busca explora categorias em duas colunas e encontra negócios", async ({ page }) => {
  await page.goto("/app/busca")
  const grade = page.locator('[data-explorar="categorias"]')
  await expect(grade).toBeVisible()
  await expect(grade.locator("[data-explorar-categoria]")).toHaveCount(8)
  const primeiros = await grade
    .locator("[data-explorar-categoria]")
    .evaluateAll((itens) =>
      itens.slice(0, 2).map((el) => Math.round(el.getBoundingClientRect().top)),
    )
  expect(new Set(primeiros).size).toBe(1)
  await grade.locator('[data-explorar-categoria="saude"]').click()
  await expect(page.locator('[data-tela="busca"] [data-cartao="negocio"]')).not.toHaveCount(0)
  await page.goto("/app/busca")
  await page.locator('[data-explorar-categoria="imoveis"]').click()
  await expect(page).toHaveURL(/\/app\/imoveis$/)
})

test("R72 P0: Perguntar salva apenas nesta sessão e abre detalhe válido", async ({ page }) => {
  await page.goto("/app/comunidade")
  await page.locator('[data-acao="perguntar"]').click()
  const dialogo = page.locator('[data-fluxo="perguntar"]')
  await expect(dialogo).toBeVisible()
  await dialogo.locator("#nova-pergunta").fill("Alguém indica uma escola para crianças pequenas?")
  await dialogo.getByRole("button", { name: "Adicionar pergunta" }).click()
  await expect(page).toHaveURL(/\/app\/pergunta\/pergunta-demo-/)
  await expect(page.getByText("Alguém indica uma escola para crianças pequenas?")).toBeVisible()
  await page.goto("/app/comunidade")
  await page.locator('[data-tela="comunidade"] [data-chip="mine"]').click()
  await expect(page.getByText("Alguém indica uma escola para crianças pequenas?")).toBeVisible()
})

test("R72 P0: Imóveis filtra, ordena e alterna entre lista e grade", async ({ page }) => {
  await page.goto("/app/imoveis")
  await expect(page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')).toHaveCount(2)
  await page.locator('[data-acao="filtros-imoveis"]').click()
  await page.locator("#quartos-imovel").click()
  await page.getByRole("option", { name: "3 ou mais" }).click()
  await expect(page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')).toHaveCount(1)
  await page.locator("#quartos-imovel").click()
  await page.getByRole("option", { name: "Qualquer" }).click()
  await page.locator("#total-mensal-imovel").click()
  await page.getByRole("option", { name: "R$ 3.000" }).click()
  await expect(page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')).toHaveCount(1)
  await page.locator('[data-acao="modo-lista"]').click()
  await expect(page.locator('[data-tela="imoveis"] .bv-lista-imoveis')).toBeVisible()
  await page.locator('[data-acao="limpar-filtros"]').click()
  await expect(page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')).toHaveCount(2)
  await page.locator('[data-acao="modo-grade"]').click()
  await expect(page.locator('[data-tela="imoveis"] .bv-lista-imoveis')).toHaveCount(0)
})
