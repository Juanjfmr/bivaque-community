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

test("P1: Anunciar imóvel cria rascunho real na sessão, sem publicar no catálogo", async ({
  page,
}) => {
  await page.goto("/app/imoveis")
  const publicos = page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')
  await expect(publicos).toHaveCount(2)
  await page.locator('[data-acao="anunciar-imovel"]').click()
  const folha = page.locator('[data-fluxo="rascunho-imovel"]')
  await expect(folha).toBeVisible()
  await expect(folha.getByText("nada é publicado")).toBeVisible()
  await folha.locator("#imovel-titulo").fill("Apartamento reformado com três quartos")
  await folha.locator("#imovel-bairro").fill("Flores")
  await folha.locator("#imovel-preco").fill("3200")
  await folha.locator("#imovel-area").fill("98")
  await folha.locator("#imovel-descricao").fill("Condomínio informado pelo proprietário")
  const geometria = await folha.boundingBox()
  const largura = page.viewportSize()?.width ?? 375
  expect(geometria).not.toBeNull()
  if (geometria) {
    expect(geometria.x).toBeGreaterThanOrEqual(-1)
    expect(geometria.x + geometria.width).toBeLessThanOrEqual(largura + 1)
  }
  await folha.locator('[data-acao="salvar-rascunho-imovel"]').click()
  await expect(folha).toHaveCount(0)
  const rascunho = page.locator('[data-rascunhos-imoveis="sim"] [data-rascunho-imovel]')
  await expect(rascunho).toHaveCount(1)
  await expect(rascunho).toContainText("Apartamento reformado com três quartos")
  await expect(page.getByText("Seus rascunhos (1) — não publicados")).toBeVisible()
  await expect(publicos).toHaveCount(2)
  await page.reload()
  await expect(page.locator('[data-rascunhos-imoveis="sim"] [data-rascunho-imovel]')).toHaveCount(1)
  await page.goto("/app/meus-anuncios")
  await expect(page.locator('[data-meus-rascunhos="sim"]')).toContainText(
    "Apartamento reformado com três quartos",
  )
  await page.locator('[data-meus-rascunhos="sim"] button').click()
  await expect(page).toHaveURL(/\/app\/imoveis$/)
  await page.locator('[data-acao="excluir-rascunho"]').click()
  await expect(page.locator('[data-rascunhos-imoveis="sim"]')).toHaveCount(0)
})

test("P1: Criar > Anunciar imóvel chega ao formulário, sem destino morto", async ({ page }) => {
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="create-property"]').click()
  await expect(page).toHaveURL(/\/app\/imoveis$/)
  await expect(page.locator('[data-fluxo="rascunho-imovel"]')).toBeVisible()
  await page
    .locator('[data-fluxo="rascunho-imovel"]')
    .getByRole("button", { name: "Cancelar" })
    .click()
  await expect(page.locator('[data-fluxo="rascunho-imovel"]')).toHaveCount(0)
})
