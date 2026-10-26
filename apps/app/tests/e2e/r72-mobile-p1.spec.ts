import { expect, test } from "@playwright/test"

test("P1: perguntas exibem avatar shadcn, enunciado completo e estado abaixo", async ({ page }) => {
  await page.goto("/app/comunidade")
  const linha = page.locator('[data-tela="comunidade"] [data-linha="pergunta"]').first()
  await expect(linha).toBeVisible()
  await expect(linha.locator('[data-slot="avatar"]')).toBeVisible()
  const titulo = linha.locator("[data-titulo-linha]")
  await expect(titulo).toBeVisible()
  const estado = linha.locator("[data-tom]")
  await expect(estado).toBeVisible()
  const medidas = await linha.evaluate((elemento) => {
    const titulo = elemento.querySelector("[data-titulo-linha]")
    const estado = elemento.querySelector("[data-tom]")
    const a = titulo?.getBoundingClientRect()
    const b = estado?.getBoundingClientRect()
    return {
      tituloInteiro: titulo ? titulo.scrollHeight <= titulo.clientHeight + 1 : false,
      estadoAbaixo: a && b ? b.top >= a.bottom : false,
      corpoCabe: elemento.scrollWidth <= elemento.clientWidth + 1,
    }
  })
  expect(medidas.tituloInteiro).toBe(true)
  expect(medidas.estadoAbaixo).toBe(true)
  expect(medidas.corpoCabe).toBe(true)
})

test("P1: abrir anúncio conserva a foto da listagem nos detalhes", async ({ page }) => {
  await page.goto("/app/imoveis")
  const primeiro = page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]').first()
  await expect(primeiro).toBeVisible()
  const src = await primeiro.locator("img").getAttribute("src")
  expect(src).toBeTruthy()
  await primeiro.locator('[data-acao="abrir-foto"]').click()
  await expect(page).toHaveURL(/\/app\/anuncio\/[^/]+$/)
  const capa = page.locator('[data-tela="anuncio"] [data-capa="foto"] img')
  await expect(capa).toBeVisible()
  await expect(capa).toHaveAttribute("src", src ?? "")
  await expect
    .poll(() => capa.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
})

test("P1: negócios e grupos apresentam capas quando a fixture tem imagens", async ({ page }) => {
  await page.goto("/app/inicio")
  const negocio = page.locator('[data-tela="inicio"] [data-cartao="negocio"] img').first()
  await expect(negocio).toBeVisible()
  const origem = await negocio.getAttribute("src")
  await page
    .locator('[data-tela="inicio"] [data-cartao="negocio"] [data-acao="abrir-foto"]')
    .first()
    .click()
  await expect(page).toHaveURL(/\/app\/negocio\/[^/]+$/)
  const capaNegocio = page.locator('[data-tela="negocio"] [data-capa="foto"] img')
  await expect(capaNegocio).toBeVisible()
  await expect(capaNegocio).toHaveAttribute("src", origem ?? "")
  await page.goto("/app/grupo/g-cmm")
  const capaGrupo = page.locator('[data-tela="grupo"] [data-capa="foto"] img')
  await expect(capaGrupo).toBeVisible()
  await expect(capaGrupo).toHaveAttribute("src", /classroom/)
})

test("P1: home desktop separa o catálogo do contexto sem duplicar seções", async ({ page }) => {
  await page.goto("/app/inicio")
  const principal = page.locator(".bv-home-principal")
  const lateral = page.getByRole("complementary", { name: "Comunidade na cidade" })
  await expect(principal).toBeVisible()
  await expect(lateral).toBeVisible()
  await expect(page.getByRole("heading", { name: "Serviços recomendados" })).toHaveCount(1)
  await expect(page.getByRole("heading", { name: "Oportunidades perto de você" })).toHaveCount(1)
  if ((page.viewportSize()?.width ?? 0) < 1024) return
  const limites = await Promise.all([principal.boundingBox(), lateral.boundingBox()])
  const a = limites[0]
  const b = limites[1]
  expect(a).not.toBeNull()
  expect(b).not.toBeNull()
  if (a && b) {
    expect(b.x).toBeGreaterThan(a.x + a.width)
    expect(Math.abs(b.y - a.y)).toBeLessThan(3)
  }
})

test("P1: anúncios de imóveis mostram somente os metadados declarados na fixture", async ({
  page,
}) => {
  await page.goto("/app/imoveis")
  const tres = page.locator('[data-cartao="anuncio"]').filter({ hasText: "Apartamento 3 quartos" })
  await expect(tres.locator("[data-atributos-imovel]")).toContainText("3 quartos")
  await expect(tres.locator("[data-atributos-imovel]")).toContainText("98 m²")
  await expect(tres.locator("[data-atributos-imovel]")).toContainText("2 vagas")
  await expect(tres.locator("[data-extras-imovel]")).toContainText("Condomínio R$ 720")
  await expect(tres.locator("[data-extras-imovel]")).toContainText(
    "Disponível a partir de dezembro",
  )

  const dois = page.locator('[data-cartao="anuncio"]').filter({ hasText: "Apartamento 2 quartos" })
  await expect(dois.locator("[data-atributos-imovel]")).toContainText("2 quartos")
  await expect(dois.locator("[data-atributos-imovel]")).toContainText("70 m²")
  await expect(dois.locator("[data-atributos-imovel]")).toContainText("1 vaga")
  await expect(dois.locator("[data-extras-imovel]")).toContainText("Condomínio R$ 480")
  await expect(dois.locator("[data-extras-imovel]")).not.toContainText("Disponível")
})
