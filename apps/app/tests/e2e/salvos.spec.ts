import { expect, type Page, test } from "@playwright/test"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * F10 (RUN-186) — a tela Salvos do app: busca que filtra o que já foi carregado
 * e o gesto de remover em guia, pergunta, publicação e anúncio.
 *
 * API simulada e app servido pelo `vite dev`: prova de interação do que a tela
 * faz. A persistência real de cada tipo é dos specs `*-real` (f06, f08, f04);
 * aqui o que se mede é a busca (nenhuma chamada nova) e o dessalvar de cada
 * seção — com a linha saindo na hora e a rota certa sendo chamada.
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
const NOME_DO_GUIA = "Escola Modelo do Centro"
const TITULO_DO_ANUNCIO = "Sofá retrátil seminovo"

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
async function salvarAnuncio(page: Page): Promise<void> {
  await page.goto("/app/anuncio/a-1")
  await page.getByRole("button", { name: "Salvar anúncio", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Remover dos salvos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
}

test("busca filtra o que as seções já carregaram, sem chamada nova", async ({ page }) => {
  const leituras: string[] = []
  aplicarStubMercado(page)
  await simularSalvos(page)
  await salvarAnuncio(page)
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
  await expect(page.locator('[data-salvos="anuncios"]')).toHaveCount(0)
  await expect(page.locator('[data-salvos="perguntas"]')).toHaveCount(0)
  await expect(page.locator('[data-salvos="publicacoes"]')).toHaveCount(0)

  await busca.fill("zzz-inexistente")
  await expect(page.getByText("Nenhum item salvo corresponde à busca.")).toBeVisible()
  await expect(page.locator('[data-salvos="guia"]')).toHaveCount(0)

  await busca.fill("")
  await expect(page.locator('[data-salvos="guia"]')).toContainText(NOME_DO_GUIA)
  await expect(page.locator('[data-salvos="perguntas"]')).toContainText(TITULO_DA_PERGUNTA)

  // Filtrar é trabalho de tela: nenhuma das quatro rotas de salvos é chamada de novo.
  expect(leituras.length, "a busca não pode pedir a lista de novo").toBe(carregadas)
})

test("remover tira a linha de cada seção pela rota daquele tipo", async ({ page }) => {
  const escritas: string[] = []
  aplicarStubMercado(page)
  await simularSalvos(page)
  await salvarAnuncio(page)
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
