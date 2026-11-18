import { expect, type Page, test } from "@playwright/test"

/**
 * F06 — os filtros do Mercado são do servidor (RUN-171), com fetch simulado.
 *
 * O que se prova aqui é o que a tela faz: o filtro do endereço vira query do
 * GET, cada filtro ativo tem chip removível (inclusive bairro e negócio, que só
 * chegam por link), trocar filtro recomeça a lista — sem arrastar o cursor da
 * página anterior — e o vazio com filtro é o do servidor, com saída. O E2E real
 * (`tests/e2e/f06-mercado-real.spec.ts`) prova o mesmo contra o banco.
 */

const APARTAMENTO = {
  id: "p-1",
  tipo: "property",
  titulo: "Apartamento 2 quartos no Centro",
  descricao: "Vaga na garagem.",
  precoCents: 180000,
  deal: "rent",
  bairro: "Centro",
  cidade: "Manaus",
  status: "active",
  condicao: null,
  categoria: null,
  quartos: 2,
  tipoImovel: "apartment",
  areaM2: 62,
  condoFeeCents: 35000,
  foto: null,
  criadoEm: "2026-11-05T12:00:00.000Z",
}

const CASA = {
  ...APARTAMENTO,
  id: "p-2",
  titulo: "Casa 3 quartos com quintal",
  precoCents: 45000000,
  deal: "sale",
  bairro: "Flores",
  quartos: 3,
  tipoImovel: "house",
  condoFeeCents: null,
  criadoEm: "2026-11-02T12:00:00.000Z",
}

const DESAPEGO = {
  ...APARTAMENTO,
  id: "a-1",
  tipo: "item",
  titulo: "Mesa de jantar com 6 cadeiras",
  precoCents: 45000,
  deal: null,
  quartos: null,
  tipoImovel: null,
  areaM2: null,
  condoFeeCents: null,
}

/**
 * A lista da prova, página a página: sem `depois` a primeira vem com cursor;
 * com `depois` vem a segunda, sem cursor. `bairro=SemNada` é a lista vazia do
 * servidor. Cada pedido fica registrado para provar a query que a tela mandou.
 */
async function servirMercado(page: Page, pedidos: URL[]): Promise<void> {
  await page.route(/\/api\/app\/mercado\?[^#]*$/, async (rota) => {
    const url = new URL(rota.request().url())
    pedidos.push(url)
    const parametros = url.searchParams
    const depois = parametros.get("depois")
    const vazio = parametros.get("bairro") === "SemNada"
    const daAba = parametros.get("tipo") === "property" ? [APARTAMENTO] : [DESAPEGO]
    const anuncios = vazio ? [] : depois === null ? daAba : [CASA]
    await rota.fulfill({
      json: {
        cidade: "Manaus",
        proximo: vazio || depois !== null ? null : "2026-11-02T12:00:00.000Z|p-2",
        anuncios: anuncios.map((anuncio) => ({ ...anuncio, salvo: false })),
      },
    })
  })
}

/** O último pedido já feito — espera o pedido existir em vez de correr com ele. */
async function ultimoPedido(pedidos: URL[]): Promise<URL> {
  await expect.poll(() => pedidos.length).toBeGreaterThan(0)
  const ultimo = pedidos.at(-1)
  if (ultimo === undefined) throw new Error("a tela não consultou o Mercado")
  return ultimo
}

/** Espera um pedido novo — o número de consultas é a régua do refetch. */
async function esperarPedidos(pedidos: URL[], quantos: number): Promise<URL> {
  await expect.poll(() => pedidos.length).toBe(quantos)
  const ultimo = pedidos.at(-1)
  if (ultimo === undefined) throw new Error("a tela não consultou o Mercado")
  return ultimo
}

test("o link do alerta abre filtrado e cada filtro tem chip removível", async ({ page }) => {
  const pedidos: URL[] = []
  await servirMercado(page, pedidos)

  await page.goto("/app/imoveis?bairro=Centro&tipo_negocio=rent&quartos=2&valor_max=2500")

  // O filtro do endereço chega ao servidor inteiro, sem recorte na tela.
  const primeira = await ultimoPedido(pedidos)
  expect(primeira.searchParams.get("tipo")).toBe("property")
  expect(primeira.searchParams.get("bairro")).toBe("Centro")
  expect(primeira.searchParams.get("tipo_negocio")).toBe("rent")
  expect(primeira.searchParams.get("quartos")).toBe("2")
  expect(primeira.searchParams.get("valor_max")).toBe("2500")

  // O que volta é o que aparece: nenhum imóvel some por filtro de cliente.
  await expect(page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')).toHaveCount(1)

  const chips = page.locator('[data-chips="filtros-mercado"] [data-filtro]')
  await expect(chips).toHaveCount(4)
  await expect(page.locator('[data-filtro="bairro"]')).toContainText("Bairro: Centro")
  await expect(page.locator('[data-filtro="tipo_negocio"]')).toContainText("Aluguel")
  await expect(page.locator('[data-filtro="quartos"]')).toContainText("2+ quartos")
  await expect(page.locator('[data-filtro="valor_max"]')).toContainText(/Até R\$\s*2\.500/)

  // Tirar o chip do bairro refaz a busca sem ele — e sem o cursor anterior.
  await page.locator('[data-filtro="bairro"]').click()
  await expect(page.locator('[data-filtro="bairro"]')).toHaveCount(0)
  const semBairro = await esperarPedidos(pedidos, 2)
  expect(semBairro.searchParams.get("bairro")).toBeNull()
  expect(semBairro.searchParams.get("tipo_negocio")).toBe("rent")
  expect(semBairro.searchParams.get("depois")).toBeNull()
})

test("trocar o filtro recomeça a lista: o cursor da página anterior não vale", async ({ page }) => {
  const pedidos: URL[] = []
  await servirMercado(page, pedidos)

  // Página 2: a porta persegue o cursor do servidor, uma consulta por página.
  await page.goto("/app/imoveis?pagina=2")
  await expect.poll(() => pedidos.length).toBe(2)
  expect(pedidos[0]?.searchParams.get("depois")).toBeNull()
  expect(pedidos[1]?.searchParams.get("depois")).not.toBeNull()
  await expect(page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')).toHaveCount(1)

  // Mudar um filtro zera o cursor: a próxima consulta é a primeira página do
  // novo critério, não a continuação da anterior.
  await page.locator('[data-acao="filtros-imoveis"]').click()
  await page.locator("#quartos-imovel").click()
  await page.getByRole("option", { name: "2 ou mais" }).click()

  await expect.poll(() => pedidos.at(-1)?.searchParams.get("quartos")).toBe("2")
  const depoisDoFiltro = await esperarPedidos(pedidos, 3)
  expect(depoisDoFiltro.searchParams.get("depois")).toBeNull()
  expect(depoisDoFiltro.searchParams.get("pagina")).toBeNull()
  expect(pedidos).toHaveLength(3)
})

test("vazio com filtro é o vazio do servidor, com saída", async ({ page }) => {
  const pedidos: URL[] = []
  await servirMercado(page, pedidos)

  await page.goto("/app/imoveis?bairro=SemNada")
  await expect(page.getByText("Nenhum imóvel corresponde aos filtros")).toBeVisible()
  await expect(page.getByText("Tire um filtro para ver mais anúncios desta cidade.")).toBeVisible()
  // Sem filtro o vazio seria outro texto: "nada anunciado" não é isto.
  await expect(page.getByText("Nada anunciado nesta seção")).toHaveCount(0)

  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click()
  await expect(page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')).toHaveCount(1)
  const semFiltro = await esperarPedidos(pedidos, 2)
  expect(semFiltro.searchParams.get("bairro")).toBeNull()
})

test("no desapego a faixa do link vira filtro do servidor", async ({ page }) => {
  const pedidos: URL[] = []
  await servirMercado(page, pedidos)

  await page.goto("/app/desapegos?preco_min=10000&preco_max=99900")
  const pedido = await ultimoPedido(pedidos)
  expect(pedido.searchParams.get("tipo")).toBe("item")
  expect(pedido.searchParams.get("preco_min")).toBe("10000")
  expect(pedido.searchParams.get("preco_max")).toBe("99900")
  await expect(page.locator('[data-filtro="preco_min"]')).toContainText(/A partir de R\$\s*100/)
})
