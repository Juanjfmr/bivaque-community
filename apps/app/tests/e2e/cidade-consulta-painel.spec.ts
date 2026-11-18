import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"

/**
 * CIDADE-169 — o chip de cidade do app abre a consulta de verdade.
 *
 * Mede a tela real (sem modo de prova) com HTTP controlado: a escolha no
 * painel leva ao endereço da cidade, e a consulta mostra o Guia, os encontros e
 * os anúncios daquela cidade, com cada linha abrindo o detalhe de sempre. É o
 * caminho que o painel antigo não fazia (ele só trocava o rótulo da casca).
 */

const DIRETORIO = join(process.cwd(), "..", "..", ".visual", "cidade-consulta")
const OUTRA = "00000000-0000-4000-8000-000000000002"

const CONSULTA = {
  cidade: { id: OUTRA, nome: "Rio de Janeiro", uf: "RJ" },
  atual: { id: "00000000-0000-4000-8000-000000000001", nome: "Manaus" },
  minha: false,
  guia: [{ id: "guia-1", nome: "Escola Modelo", categoria: "school" }],
  encontros: [
    {
      id: "evento-1",
      titulo: "Café na praça",
      comecaEm: "2026-11-20T12:00:00.000Z",
      local: "Praça",
    },
  ],
  desapegos: [{ id: "item-1", titulo: "Cadeira", precoCents: 5000, bairro: "Centro" }],
  imoveis: [{ id: "imovel-1", titulo: "Apartamento", bairro: "Tijuca" }],
}

async function simularConsulta(page: Page): Promise<void> {
  await page.route(/\/api\/localities$/, async (rota) => {
    await rota.fulfill({ json: { ufs: ["AM", "RJ"] } })
  })
  await page.route(/\/api\/localities\/[A-Z]{2}$/, async (rota) => {
    const uf = new URL(rota.request().url()).pathname.split("/").pop()
    await rota.fulfill({
      json: {
        municipalities:
          uf === "RJ"
            ? [{ id: OUTRA, cityName: "Rio de Janeiro", ibgeCode: "3304557" }]
            : [{ id: CONSULTA.atual.id, cityName: "Manaus", ibgeCode: "1302603" }],
      },
    })
  })
  await page.route(/\/api\/app\/cidade\/[^/]+$/, async (rota) => {
    const pedido = new URL(rota.request().url()).pathname.split("/").pop()
    if (pedido === "atual") {
      await rota.fulfill({
        json: {
          ...CONSULTA,
          cidade: { id: CONSULTA.atual.id, nome: "Manaus", uf: "AM" },
          minha: true,
        },
      })
      return
    }
    await rota.fulfill({ json: CONSULTA })
  })
}

async function capturar(page: Page, nome: string): Promise<void> {
  mkdirSync(DIRETORIO, { recursive: true })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: join(DIRETORIO, `${nome}.png`),
    fullPage: true,
    animations: "disabled",
  })
}

test.describe("consulta de cidade pelo chip", () => {
  test.use({ colorScheme: "light" })

  test("o painel leva à cidade escolhida e cada linha abre o detalhe", async ({ page }, info) => {
    await simularConsulta(page)
    await page.goto("/app/inicio")

    await page.locator('[data-acao="cidade"]').click()
    await expect(page.getByRole("dialog", { name: "Trocar de cidade" })).toBeVisible()

    await page.locator('[data-selecao="cidade-uf"]').click()
    await page.getByRole("option", { name: "RJ", exact: true }).click()
    await page.locator('[data-selecao="cidade-municipio"]').click()
    await page.getByRole("option", { name: "Rio de Janeiro", exact: true }).click()
    await page.locator('[data-acao="abrir-cidade"]').click()

    await expect(page).toHaveURL(new RegExp(`/app/cidade/${OUTRA}$`))
    const titulo = page.locator("h1[data-titulo-da-tela]")
    await expect(titulo).toHaveText("Rio de Janeiro, RJ")
    // A consulta não muda a cidade da casca: publicar continua em Manaus.
    await expect(
      page.getByText("Você continua publicando e participando em Manaus", { exact: false }),
    ).toBeVisible()
    await capturar(page, `${info.project.name}-01-consulta`)

    await page.getByRole("button", { name: /Escola Modelo/ }).click()
    await expect(page).toHaveURL(/\/app\/guia\/guia-1$/)

    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/app/cidade/${OUTRA}$`))
    await page.getByRole("button", { name: /Café na praça/ }).click()
    await expect(page).toHaveURL(/\/app\/evento\/evento-1$/)
  })

  test("'Minha cidade' abre a consulta da cidade da sessão", async ({ page }) => {
    await simularConsulta(page)
    await page.goto("/app/inicio")
    await page.locator('[data-acao="cidade"]').click()
    await page.locator('[data-acao="abrir-minha-cidade"]').click()
    await expect(page).toHaveURL(/\/app\/cidade\/atual$/)
    await expect(page.locator("h1[data-titulo-da-tela]")).toHaveText("Manaus, AM")
    // Na própria cidade não há convite a mudar de cidade.
    await expect(page.locator('[data-acao="mudar-para-ca"]')).toHaveCount(0)
  })
})
