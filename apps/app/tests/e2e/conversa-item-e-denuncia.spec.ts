import { expect, type Page, test } from "@playwright/test"

/**
 * REGUA-003: a conversa mostra o item de que trata (lido pelas leituras que já
 * existem), o ⋯ tem Denunciar e Bloquear, e a denúncia de uma mensagem é um
 * toque no balão — sem bandeira fixa ao lado de cada mensagem.
 */

const CONVERSAS = [
  {
    id: "t1",
    nome: "Paulo R.",
    outroId: "u-paulo",
    tipo: "listing",
    contextoId: "i3",
    ultima: "Ainda está disponível?",
    porLer: false,
  },
  {
    id: "t2",
    nome: "Climatização Amazonas",
    outroId: "u-clima",
    tipo: "provider",
    contextoId: "n1",
    ultima: "Posso passar amanhã.",
    porLer: false,
  },
  {
    id: "t3",
    nome: "Joana M.",
    outroId: "u-joana",
    tipo: "accepted_family",
    contextoId: "f1",
    ultima: "Oi",
    porLer: false,
  },
] as const

const MENSAGENS = [
  { id: "m1", conteudo: "Ainda está disponível?", minha: false, criadaEm: "2026-11-20T13:00:00Z" },
  { id: "m2", conteudo: "Está sim.", minha: true, criadaEm: "2026-11-20T13:05:00Z" },
]

async function simular(page: Page): Promise<string[]> {
  const denuncias: string[] = []
  await page.route("**/api/app/entry/progress", (rota) =>
    rota.fulfill({ json: { autenticado: true } }),
  )
  await page.route("**/api/app/voce/bloqueados", (rota) =>
    rota.fulfill({ json: { bloqueados: [] } }),
  )
  await page.route(/\/api\/app\/conversas(?:\/|\?|$)/, (rota) => {
    const partes = new URL(rota.request().url()).pathname.split("/").filter(Boolean)
    const id = partes[3]
    if (id === undefined) {
      return rota.fulfill({ json: { conversas: CONVERSAS, proximo: null, porLer: 0 } })
    }
    if (partes[4] === "lida") return rota.fulfill({ status: 204 })
    const conversa = CONVERSAS.find((item) => item.id === id)
    if (conversa === undefined) return rota.fulfill({ status: 404, json: { erro: "nao" } })
    return rota.fulfill({
      json: { conversa, mensagens: id === "t1" ? MENSAGENS : [], anterior: null },
    })
  })
  await page.route(/\/api\/app\/mercado\/i3(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        anuncio: {
          id: "i3",
          tipo: "item",
          titulo: "Sofá de 3 lugares",
          descricao: null,
          precoCents: 80000,
          deal: null,
          bairro: "Centro",
          cidade: "Manaus",
          status: "active",
          condicao: "usado",
          categoria: "moveis",
          quartos: null,
          tipoImovel: null,
          areaM2: null,
          condoFeeCents: null,
          foto: null,
          criadoEm: "2026-11-10T12:00:00Z",
          endereco: null,
          donoNome: "Paulo R.",
          donoId: "u-paulo",
          fotos: [],
          meu: false,
          salvo: false,
        },
      },
    }),
  )
  await page.route(/\/api\/app\/negocios\/n1(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        negocio: {
          id: "n1",
          nome: "Climatização Amazonas",
          categoria: "servicos",
          categoriaNome: "Serviços",
          descricao: null,
          cidade: "Manaus",
          podePedir: true,
          foto: null,
          fotoDescricao: null,
          servicos: [],
        },
      },
    }),
  )
  await page.route(/\/api\/app\/mensagens\/[^/]+\/denuncia$/, (rota) => {
    denuncias.push(new URL(rota.request().url()).pathname)
    return rota.fulfill({ status: 201, json: { denuncia: { id: "d1" } } })
  })
  return denuncias
}

test("cada linha da caixa diz o nome do item, ou o tipo quando não há leitura", async ({
  page,
}) => {
  await simular(page)
  await page.goto("/app/conversas")
  const linha = (id: string) => page.locator(`[data-thread="${id}"] [data-contexto-da-linha]`)
  await expect(linha("t1")).toHaveText("Sofá de 3 lugares")
  await expect(linha("t2")).toHaveText("Climatização Amazonas")
  await expect(linha("t3")).toHaveText("Família")
})

test("na coluna ao lado da conversa, as outras linhas também dizem o item", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop-1440", "a coluna da caixa só aparece no computador")
  await simular(page)
  await page.goto("/app/conversa/t1")
  const linha = (id: string) => page.locator(`[data-thread="${id}"] [data-contexto-da-linha]`)
  await expect(linha("t2")).toHaveText("Climatização Amazonas")
  await expect(linha("t3")).toHaveText("Família")
  // A aberta não repete o item: ele está no cabeçalho do painel.
  await expect(linha("t1")).toHaveCount(0)
})

test("o cabeçalho da conversa mostra título e preço do anúncio", async ({ page }) => {
  await simular(page)
  await page.goto("/app/conversa/t1")
  const cabeca = page.locator('[data-tela="conversa"] [data-cabeca-do-item="sim"]')
  await expect(cabeca.locator('[data-item-da-conversa="titulo"]')).toHaveText("Sofá de 3 lugares")
  await expect(cabeca.locator('[data-item-da-conversa="preco"]')).toHaveText(/R\$\s*800/)
})

test("o ⋯ tem Denunciar e Bloquear, e Denunciar abre a denúncia da mensagem recebida", async ({
  page,
}) => {
  const denuncias = await simular(page)
  await page.goto("/app/conversa/t1")
  await expect(page.locator('[data-mensagens="historico"]')).toBeVisible()
  // Nenhuma bandeira fixa: a denúncia não é um botão ao lado de cada mensagem.
  await expect(page.getByRole("button", { name: "Denunciar mensagem", exact: true })).toHaveCount(0)

  await page.locator('[data-cabeca="conversa"] [data-acao="opcoes"]').click()
  await expect(page.getByRole("menuitem", { name: "Bloquear Paulo R." })).toBeVisible()
  await page.getByRole("menuitem", { name: "Denunciar", exact: true }).click()

  const folha = page.locator('[data-sobreposicao="conversa-denuncia"]')
  await expect(folha).toBeVisible()
  await expect(folha.locator('[data-mensagem-denunciada="sim"]')).toHaveText(
    "Ainda está disponível?",
  )
  await folha.getByRole("radio", { name: "Spam" }).check()
  await folha.locator('[data-acao="enviar-denuncia"]').click()
  await expect(folha).toHaveCount(0)
  await expect(page.getByText("Denúncia enviada. A moderação vai analisar.")).toBeVisible()
  expect(denuncias).toEqual(["/api/app/mensagens/m1/denuncia"])
})

test("um toque no balão recebido abre a denúncia dele; o próprio não abre", async ({ page }) => {
  await simular(page)
  await page.goto("/app/conversa/t1")
  const recebidas = page.locator('[data-acao="denunciar-mensagem"]')
  await expect(recebidas).toHaveCount(1)
  await recebidas.click()
  const folha = page.locator('[data-sobreposicao="conversa-denuncia"]')
  await expect(folha.locator('[data-mensagem-denunciada="sim"]')).toHaveText(
    "Ainda está disponível?",
  )
})

test("sem mensagem recebida o ⋯ não oferece denúncia", async ({ page }) => {
  await simular(page)
  await page.goto("/app/conversa/t2")
  await expect(page.locator('[data-tela="conversa"]')).toBeVisible()
  await page.locator('[data-cabeca="conversa"] [data-acao="opcoes"]').click()
  await expect(page.getByRole("menuitem", { name: /^Bloquear / })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Denunciar", exact: true })).toHaveCount(0)
})
