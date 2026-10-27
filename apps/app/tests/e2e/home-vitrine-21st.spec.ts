import { expect, test } from "@playwright/test"

// Prova da adoção do componente real Product Card (Delta Components / 21st.dev)
// em anúncios e negócios da Home, sem alterar os contratos dos detalhes.
test("Home: vitrine 21st mostra negócios e anúncios com fotos e texto reais", async ({ page }) => {
  await page.goto("/app/inicio")
  const inicio = page.locator('[data-tela="inicio"]')
  await expect(inicio.locator('[data-home="abertura"]')).toBeVisible()

  const negocio = inicio.locator('[data-cartao="negocio"][data-vitrine="21st"]').first()
  const anuncio = inicio.locator('[data-cartao="anuncio"][data-vitrine="21st"]').first()
  await expect(negocio).toBeVisible()
  await expect(anuncio).toBeVisible()

  for (const card of [negocio, anuncio]) {
    await expect(card.locator('[data-slot="product-card"]')).toBeVisible()
    await expect(card.locator('[data-slot="product-card-title"]')).not.toBeEmpty()
    await expect(card.locator('[data-acao="abrir-foto"]')).toBeVisible()
    await expect(card.locator('[data-slot="product-card-badge"]')).toBeVisible()
  }

  const img = negocio.locator('[data-capa="foto"] img')
  await expect(img).toBeVisible()
  await expect
    .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
})

test("Home: salvar na vitrine é independente de navegar para o detalhe", async ({ page }) => {
  await page.goto("/app/inicio")
  const negocio = page
    .locator('[data-tela="inicio"] [data-cartao="negocio"][data-vitrine="21st"]')
    .first()
  await expect(negocio).toBeVisible()
  const favorito = negocio.locator('[data-slot="product-card-badge"]')
  await expect(favorito).toHaveAttribute("aria-pressed", "false")
  await favorito.click()
  await expect(favorito).toHaveAttribute("aria-pressed", "true")
  await expect(page).toHaveURL(/\/app\/inicio$/)
  await negocio.locator('[data-acao="abrir-foto"]').click()
  await expect(page).toHaveURL(/\/app\/negocio\/[^/]+$/)
})

test("Home: vitrine e ações mantêm alvos e não vazam da largura do telefone", async ({ page }) => {
  const largura = page.viewportSize()?.width ?? 375
  await page.goto("/app/inicio")
  const cards = page.locator('[data-tela="inicio"] [data-vitrine="21st"]')
  await expect(cards.first()).toBeVisible()

  const favorito = cards.first().locator('[data-slot="product-card-badge"]')
  const area = await favorito.boundingBox()
  expect(area).not.toBeNull()
  if (area) {
    expect(area.height).toBeGreaterThanOrEqual(44)
    expect(area.width).toBeGreaterThanOrEqual(44)
  }
  if (largura < 720) {
    const medidas = await page
      .locator('[data-tela="inicio"] [data-home="abertura"]')
      .evaluate((el) => ({
        x: el.getBoundingClientRect().x,
        direita: el.getBoundingClientRect().right,
        largura: el.clientWidth,
        conteudo: el.scrollWidth,
      }))
    expect(medidas.x).toBeGreaterThanOrEqual(-1)
    expect(medidas.direita).toBeLessThanOrEqual(largura + 1)
    expect(medidas.conteudo).toBeLessThanOrEqual(medidas.largura + 1)
  }
})

test("Home: quatro atalhos visíveis na mesma linha, sem rolagem em 320 a 430px", async ({ page }) => {
  const largura = page.viewportSize()?.width ?? 375
  test.skip(largura >= 720, "Grade compacta avaliada em viewport mobile")

  await page.goto("/app/inicio")
  const cabecalho = page.locator('header[data-home="abertura"]')
  const faixa = cabecalho.locator('nav[aria-label="Áreas"]')
  const botoes = faixa.locator('[data-acao="atalho"]')
  await expect(botoes).toHaveCount(4)

  const estado = await faixa.evaluate((el) => {
    const area = el.getBoundingClientRect()
    const botoes = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-acao="atalho"]'))
    return {
      largura: el.clientWidth,
      conteudo: el.scrollWidth,
      altura: area.height,
      esquerda: area.left,
      direita: area.right,
      botoes: botoes.map((botao) => {
        const alvo = botao.getBoundingClientRect()
        const rotulo = botao.lastElementChild?.getBoundingClientRect()
        return {
          esquerda: alvo.left,
          direita: alvo.right,
          topo: alvo.top,
          altura: alvo.height,
          rotuloDireita: rotulo?.right ?? 0,
          rotuloEsquerda: rotulo?.left ?? 0,
        }
      }),
    }
  })
  expect(estado.conteudo).toBeLessThanOrEqual(estado.largura + 1)
  expect(estado.altura).toBeLessThanOrEqual(68)
  expect(estado.botoes).toHaveLength(4)
  for (const botao of estado.botoes) {
    expect(botao.altura).toBeGreaterThanOrEqual(44)
    expect(botao.topo).toBeCloseTo(estado.botoes[0]?.topo ?? 0, 0)
    expect(botao.esquerda).toBeGreaterThanOrEqual(estado.esquerda - 1)
    expect(botao.direita).toBeLessThanOrEqual(estado.direita + 1)
    expect(botao.rotuloEsquerda).toBeGreaterThanOrEqual(botao.esquerda - 1)
    expect(botao.rotuloDireita).toBeLessThanOrEqual(botao.direita + 1)
  }

  await faixa.locator('[data-valor="comunidade"]').click()
  await expect(page).toHaveURL(/\/app\/comunidade$/)
})

test("Home: título, busca e atalhos formam um cabeçalho único e compacto", async ({ page }) => {
  const largura = page.viewportSize()?.width ?? 375
  await page.goto("/app/inicio")

  const cabecalho = page.locator('header[data-home="abertura"]')
  await expect(cabecalho).toBeVisible()
  await expect(cabecalho.locator('[data-home="apresentacao"]')).toBeVisible()
  await expect(cabecalho.locator('[data-home="ferramentas"]')).toBeVisible()
  await expect(cabecalho.locator('[data-acao="busca"]')).toBeVisible()
  await expect(cabecalho.locator('nav[aria-label="Áreas"] [data-acao="atalho"]')).toHaveCount(4)

  const medidas = await cabecalho.evaluate((el) => ({
    altura: el.getBoundingClientRect().height,
    largura: el.clientWidth,
    conteudo: el.scrollWidth,
  }))
  expect(medidas.conteudo).toBeLessThanOrEqual(medidas.largura + 1)
  if (largura < 720) expect(medidas.altura).toBeLessThanOrEqual(270)

  await cabecalho.locator('[data-acao="busca"]').click()
  await expect(page).toHaveURL(/\/app\/busca$/)
})
