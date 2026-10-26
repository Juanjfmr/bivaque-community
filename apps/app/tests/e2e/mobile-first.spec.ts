import { expect, test } from "@playwright/test"

test("mobile: topo e barra inferior cabem inteiros, com alvos de toque", async ({ page }) => {
  const largura = page.viewportSize()?.width ?? 0
  test.skip(largura >= 720, "Navegação inferior só existe no mobile")

  await page.goto("/app/inicio")
  const topo = page.locator('[data-topo="barra"]')
  await expect(topo).toBeVisible()

  // Mesmo a 320px, nenhum dos controles à direita pode ser cortado pelo topo.
  const controles = topo.locator('button')
  for (const botao of await controles.all()) {
    if (!(await botao.isVisible())) continue
    const caixa = await botao.boundingBox()
    expect(caixa).not.toBeNull()
    if (caixa) {
      expect(caixa.x).toBeGreaterThanOrEqual(-1)
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(largura + 1)
      expect(caixa.height).toBeGreaterThanOrEqual(44)
    }
  }

  const nav = page.locator('[data-nav="principal"]')
  await expect(nav).toBeVisible()
  const destinos = nav.locator('[data-aba]')
  await expect(destinos).toHaveCount(4)
  for (const botao of await destinos.all()) {
    const caixa = await botao.boundingBox()
    expect(caixa).not.toBeNull()
    if (caixa) {
      expect(caixa.x).toBeGreaterThanOrEqual(-1)
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(largura + 1)
      expect(caixa.height).toBeGreaterThanOrEqual(44)
      expect(caixa.width).toBeGreaterThanOrEqual(44)
    }
  }

  await nav.locator('[data-aba="mercado"]').tap()
  await expect(page).toHaveURL(/\/app\/mercado$/)
})

test("mobile: cards ocupam uma coluna e foto abre o anúncio", async ({ page }) => {
  const largura = page.viewportSize()?.width ?? 0
  test.skip(largura >= 720, "Critério de cards grandes apenas no mobile")

  await page.goto("/app/inicio")
  const grade = page.locator('[data-tela="inicio"] [data-grade="cartoes"]').first()
  await expect(grade).toBeVisible()
  const itens = grade.locator("[data-cartao]")
  await expect(itens.first()).toBeVisible()
  const colunas = await itens.evaluateAll((elementos) =>
    elementos.slice(0, 2).map((elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return { x: caixa.x, largura: caixa.width }
    }),
  )
  if (colunas.length === 2) {
    expect(Math.abs(colunas[0]!.x - colunas[1]!.x)).toBeLessThan(2)
    expect(colunas[0]!.largura).toBeGreaterThan(largura * 0.8)
  }

  // Não pode ser necessário encontrar uma ação escondida sob a foto.
  await page.goto("/app/desapegos")
  const foto = page.locator('[data-cartao="anuncio"] [data-acao="abrir-foto"]').first()
  await expect(foto).toBeVisible()
  await foto.tap()
  await expect(page).toHaveURL(/\/app\/anuncio\/[^/]+$/)
})
