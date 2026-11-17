import { expect, type Page, test } from "@playwright/test"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * F10 (RUN-186) — a tela Salvos do app: busca que filtra o que já foi carregado
 * e o gesto de remover em guia, pergunta, publicação e anúncio.
 *
 * API simulada e app servido pelo `vite dev`: prova de interação do que a tela
 * faz. A persistência real de cada tipo é dos specs `*-real` (f06, f08, f04);
 * aqui o que se mede é a busca (nenhuma chamada nova), o dessalvar de cada
 * seção — com a linha saindo na hora e a rota certa sendo chamada — e a volta
 * de uma remoção que falhou sem desfazer as outras.
 */

const PUBLICACAO = {
  id: "p-1",
  grupoId: "g-familias",
  texto: "Alguém indica um bom pediatra?",
  criadaEm: "2026-11-10T12:00:00Z",
  autor: "Ana",
  autorId: "u-2",
  propria: false,
  comentarios: 0,
  uteis: 0,
  util: false,
  salva: true,
  oculta: false,
  fotos: [],
}

const TITULO_DA_PUBLICACAO = PUBLICACAO.texto
const TITULO_DA_PERGUNTA = "Onde comprar gás de cozinha?"
const TITULO_DA_SEGUNDA_PERGUNTA = "Farmácia aberta no domingo?"
const TITULO_DA_TERCEIRA_PERGUNTA = "Ônibus para o centro de madrugada?"
const NOME_DO_GUIA = "Escola Modelo do Centro"
const TITULO_DO_ANUNCIO = "Sofá retrátil seminovo"
const TITULO_DO_IMOVEL = "Apartamento 3 quartos Ponta Negra"
const ANUNCIO = "a-1"
const IMOVEL = "p-1"

/** As três seções de lista da tela e o dessalvar de cada uma. */
async function simularSalvos(page: Page): Promise<void> {
  await page.route(/\/api\/app\/grupos\/salvas(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { publicacoes: [PUBLICACAO] } }),
  )
  await page.route(/\/api\/app\/grupos\/publicacoes\/[^/]+\/acoes(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { publicacao: { ...PUBLICACAO, salva: false }, fixada: null } }),
  )
  await page.route(/\/api\/app\/perguntas\/salvas(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        perguntas: [
          {
            id: "q-1",
            titulo: TITULO_DA_PERGUNTA,
            categoria: "servicos_locais",
            criadaEm: "2026-11-09T12:00:00Z",
            resolvida: false,
          },
          {
            id: "q-2",
            titulo: TITULO_DA_SEGUNDA_PERGUNTA,
            categoria: "servicos_locais",
            criadaEm: "2026-11-08T12:00:00Z",
            resolvida: false,
          },
          {
            id: "q-3",
            titulo: TITULO_DA_TERCEIRA_PERGUNTA,
            categoria: "transporte",
            criadaEm: "2026-11-07T12:00:00Z",
            resolvida: true,
          },
        ],
      },
    }),
  )
  await page.route(/\/api\/app\/perguntas\/[^/]+\/salvo(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { salvo: rota.request().method() === "PUT" } }),
  )
  await page.route(/\/api\/app\/guia\/salvos(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        entradas: [
          {
            id: "e-1",
            categoria: "school",
            nome: NOME_DO_GUIA,
            descricao: "Escola pública bem avaliada no centro.",
            site: null,
            telefone: null,
            salvo: true,
          },
        ],
      },
    }),
  )
  await page.route(/\/api\/app\/guia\/[^/]+\/salvo(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { salvo: rota.request().method() === "PUT" } }),
  )
}

/** Salva o anúncio pelo detalhe, como a pessoa faria — o stub guarda a linha. */
async function salvarAnuncio(page: Page, id: string): Promise<void> {
  await page.goto(`/app/anuncio/${id}`)
  await page.getByRole("button", { name: "Salvar anúncio", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Remover dos salvos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
}

test("busca filtra o que as seções já carregaram e não esconde os segmentos", async ({ page }) => {
  const leituras: string[] = []
  aplicarStubMercado(page)
  await simularSalvos(page)
  await salvarAnuncio(page, ANUNCIO)
  await salvarAnuncio(page, IMOVEL)
  page.on("request", (pedido) => {
    if (
      /\/api\/app\/(mercado\/salvos|grupos\/salvas|perguntas\/salvas|guia\/salvos)/.test(
        pedido.url(),
      )
    ) {
      leituras.push(pedido.url())
    }
  })

  await page.goto("/app/salvos")
  const anuncios = page.locator('[data-salvos="anuncios"]')
  await expect(
    anuncios.locator('[data-cartao="anuncio"]', { hasText: TITULO_DO_ANUNCIO }),
  ).toBeVisible()
  await expect(page.locator('[data-salvos="guia"]')).toContainText(NOME_DO_GUIA)
  await expect(page.locator('[data-salvos="perguntas"]')).toContainText(TITULO_DA_PERGUNTA)
  await expect(page.locator('[data-salvos="publicacoes"]')).toContainText(TITULO_DA_PUBLICACAO)
  const carregadas = leituras.length

  const busca = page.getByRole("searchbox", { name: "Buscar nos salvos" })
  await busca.fill("escola")
  await expect(page.locator('[data-salvos="guia"]')).toContainText(NOME_DO_GUIA)
  // As seções que têm conteúdo e não casaram saem de cena; o vazio delas
  // ("Nenhuma publicação salva ainda") seria mentira para quem busca.
  await expect(page.locator('[data-salvos="perguntas"]')).toHaveCount(0)
  await expect(page.locator('[data-salvos="publicacoes"]')).toHaveCount(0)
  // A seção de anúncios fica: é dela o controle Desapegos/Imóveis, e a busca
  // não pode trancar a pessoa no segmento em que ela estava.
  await expect(anuncios.getByRole("navigation", { name: "Seções dos salvos" })).toBeVisible()
  await expect(anuncios).toContainText("Nenhum anúncio salvo corresponde à busca.")

  await busca.fill("zzz-inexistente")
  await expect(page.locator('[data-salvos="guia"]')).toHaveCount(0)
  await expect(anuncios).toContainText("Nenhum anúncio salvo corresponde à busca.")

  await busca.fill("")
  await expect(page.locator('[data-salvos="guia"]')).toContainText(NOME_DO_GUIA)
  await expect(page.locator('[data-salvos="perguntas"]')).toContainText(TITULO_DA_PERGUNTA)

  // Filtrar é trabalho de tela: nenhuma das quatro rotas de salvos é chamada de novo.
  expect(leituras.length, "a busca não pode pedir a lista de novo").toBe(carregadas)

  // Quem procura um imóvel estando em Desapegos troca de segmento sem apagar a
  // busca, e o imóvel aparece.
  await busca.fill("apartamento")
  await expect(anuncios).toContainText("Nenhum anúncio salvo corresponde à busca.")
  const imoveis = anuncios.getByRole("button", { name: "Imóveis", exact: true })
  await imoveis.click()
  await expect(imoveis).toHaveAttribute("aria-current", "page")
  await expect(
    anuncios.locator('[data-cartao="anuncio"]', { hasText: TITULO_DO_IMOVEL }),
  ).toBeVisible()
  await expect(busca).toHaveValue("apartamento")
})

test("remover tira a linha de cada seção pela rota daquele tipo", async ({ page }) => {
  const escritas: string[] = []
  aplicarStubMercado(page)
  await simularSalvos(page)
  await salvarAnuncio(page, ANUNCIO)
  page.on("request", (pedido) => {
    const caminho = new URL(pedido.url()).pathname.replace("/api/app", "")
    if (/\/salvo$/.test(caminho) || /\/acoes$/.test(caminho)) {
      escritas.push(`${pedido.method()} ${caminho}`)
    }
  })

  await page.goto("/app/salvos")

  const guia = page.locator('[data-salvos="guia"]')
  await expect(guia).toContainText(NOME_DO_GUIA)
  await guia.getByRole("button", { name: `Remover dos salvos: ${NOME_DO_GUIA}` }).click()
  await expect(guia).not.toContainText(NOME_DO_GUIA)

  const perguntas = page.locator('[data-salvos="perguntas"]')
  await expect(perguntas).toContainText(TITULO_DA_PERGUNTA)
  await perguntas.getByRole("button", { name: `Remover dos salvos: ${TITULO_DA_PERGUNTA}` }).click()
  await expect(perguntas).not.toContainText(TITULO_DA_PERGUNTA)

  const publicacoes = page.locator('[data-salvos="publicacoes"]')
  await expect(publicacoes).toContainText(TITULO_DA_PUBLICACAO)
  await publicacoes
    .getByRole("button", { name: `Remover dos salvos: ${TITULO_DA_PUBLICACAO}` })
    .click()
  await expect(publicacoes).not.toContainText(TITULO_DA_PUBLICACAO)

  // O anúncio mantém o gesto pelo marcador do cartão.
  const anuncios = page.locator('[data-salvos="anuncios"]')
  const cartao = anuncios.locator('[data-cartao="anuncio"]', { hasText: TITULO_DO_ANUNCIO })
  await expect(cartao).toBeVisible()
  await cartao.getByRole("button", { name: "Remover dos salvos", exact: true }).click()
  await expect(cartao).toHaveCount(0)
  await expect(anuncios.getByText("Nenhum anúncio salvo")).toBeVisible()

  await expect
    .poll(() => escritas)
    .toEqual([
      "DELETE /guia/e-1/salvo",
      "DELETE /perguntas/q-1/salvo",
      "PUT /grupos/publicacoes/p-1/acoes",
      "DELETE /mercado/a-1/salvo",
    ])
})

test("duas remoções na mesma seção: só a que falhou volta", async ({ page }) => {
  aplicarStubMercado(page)
  await simularSalvos(page)
  // A PRIMEIRA remoção falha no servidor, depois de a segunda já ter saído: a
  // volta é só da linha que falhou, não da lista que existia antes do clique.
  await page.route(/\/api\/app\/perguntas\/q-1\/salvo(?:\?|$)/, async (rota) => {
    await new Promise((espera) => setTimeout(espera, 300))
    await rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
  })

  await page.goto("/app/salvos")
  const perguntas = page.locator('[data-salvos="perguntas"]')
  await expect(perguntas).toContainText(TITULO_DA_TERCEIRA_PERGUNTA)

  await perguntas.getByRole("button", { name: `Remover dos salvos: ${TITULO_DA_PERGUNTA}` }).click()
  await perguntas
    .getByRole("button", { name: `Remover dos salvos: ${TITULO_DA_SEGUNDA_PERGUNTA}` })
    .click()

  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível remover dos salvos. Tente de novo.",
  )
  await expect(perguntas).toContainText(TITULO_DA_PERGUNTA)
  await expect(perguntas).not.toContainText(TITULO_DA_SEGUNDA_PERGUNTA)
  await expect(perguntas).toContainText(TITULO_DA_TERCEIRA_PERGUNTA)
})

test("remover no meio da troca de segmento não põe o anúncio no segmento errado", async ({
  page,
}) => {
  aplicarStubMercado(page)
  await simularSalvos(page)
  await salvarAnuncio(page, ANUNCIO)
  await salvarAnuncio(page, IMOVEL)
  // A remoção falha só depois de a pessoa trocar de segmento.
  await page.route(/\/api\/app\/mercado\/a-1\/salvo(?:\?|$)/, async (rota) => {
    await new Promise((espera) => setTimeout(espera, 1500))
    await rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
  })

  await page.goto("/app/salvos")
  const anuncios = page.locator('[data-salvos="anuncios"]')
  const sofa = anuncios.locator('[data-cartao="anuncio"]', { hasText: TITULO_DO_ANUNCIO })
  await expect(sofa).toBeVisible()
  await sofa.getByRole("button", { name: "Remover dos salvos", exact: true }).click()
  await anuncios.getByRole("button", { name: "Imóveis", exact: true }).click()

  await expect(page.getByRole("alert")).toContainText("Não foi possível remover dos salvos")
  await expect(
    anuncios.locator('[data-cartao="anuncio"]', { hasText: TITULO_DO_IMOVEL }),
  ).toBeVisible()
  await expect(anuncios).not.toContainText(TITULO_DO_ANUNCIO)
})

test("remover com o DELETE adiado, trocar de segmento e voltar: o anúncio não reaparece", async ({
  page,
}) => {
  aplicarStubMercado(page)
  await simularSalvos(page)
  await salvarAnuncio(page, ANUNCIO)
  await salvarAnuncio(page, IMOVEL)
  // O DELETE demora e só grava no fim: a volta ao segmento lê o anúncio ainda
  // salvo no banco — é essa leitura atrasada que não pode repô-lo na tela.
  let concluiu = false
  await page.route(/\/api\/app\/mercado\/a-1\/salvo(?:\?|$)/, async (rota) => {
    if (rota.request().method() !== "DELETE") return rota.fallback()
    await new Promise((espera) => setTimeout(espera, 6000))
    await rota.fallback()
    concluiu = true
  })

  await page.goto("/app/salvos")
  const anuncios = page.locator('[data-salvos="anuncios"]')
  const sofa = anuncios.locator('[data-cartao="anuncio"]', { hasText: TITULO_DO_ANUNCIO })
  await expect(sofa).toBeVisible()
  await sofa.getByRole("button", { name: "Remover dos salvos", exact: true }).click()
  await expect(sofa).toHaveCount(0)

  await anuncios.getByRole("button", { name: "Imóveis", exact: true }).click()
  await expect(
    anuncios.locator('[data-cartao="anuncio"]', { hasText: TITULO_DO_IMOVEL }),
  ).toBeVisible()

  // Volta ao segmento com o DELETE ainda no ar: o servidor devolve o anúncio, e
  // a tela precisa terminar de carregar sem ele.
  const releitura = page.waitForResponse((resposta) =>
    /\/api\/app\/mercado\/salvos\?[^#]*tipo=item/.test(resposta.url()),
  )
  await anuncios.getByRole("button", { name: "Desapegos", exact: true }).click()
  expect((await releitura).ok(), "a releitura do segmento precisa ser aceita").toBe(true)
  // A seção só mostra o vazio dela com a lista carregada — e ela chegou sem o
  // anúncio, que o servidor ainda devolvia. O prazo é curto de propósito: com o
  // DELETE adiado, o anúncio só poderia estar de volta se a releitura o tivesse
  // reposto, e passar disso é o defeito que este caso mede.
  const vazio = anuncios.locator('[data-estado="vazio"]', { hasText: "Nenhum anúncio salvo" })
  await expect(
    vazio,
    "a lista voltou vazia, mesmo com o anúncio ainda salvo no servidor",
  ).toBeVisible({ timeout: 3000 })
  expect(concluiu, "o DELETE precisa estar pendente na volta ao segmento").toBe(false)

  // O DELETE termina com sucesso e o anúncio não volta.
  await expect.poll(() => concluiu, { timeout: 30_000 }).toBe(true)
  await expect(anuncios, "removido no servidor, o anúncio não pode reaparecer").not.toContainText(
    TITULO_DO_ANUNCIO,
  )
  await expect(vazio).toBeVisible()
})
