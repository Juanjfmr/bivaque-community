import { expect, test } from "@playwright/test"
import { simularInicio } from "./inicio-ajuda"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * F06 — o marcador do anúncio grava de verdade (RUN-168).
 *
 * API simulada, app servido pelo preview do Vite: prova de interação do que a
 * tela faz — o clique chama a rota, o estado sobrevive ao recarregar (o flag vem
 * da lista/detalhe, não de um Set local) e dessalvar em Salvos apaga a linha e
 * tira o cartão da lista. O E2E real (`tests/e2e/f06-mercado-real.spec.ts`)
 * prova o mesmo contra o banco.
 */

function cartaoDoMercado(page: Parameters<typeof aplicarStubMercado>[0], titulo: string) {
  return page.locator('[data-tela="desapegos"] [data-cartao="anuncio"]', { hasText: titulo })
}

test("salvar do cartão grava e continua salvo ao recarregar", async ({ page }) => {
  const escritas: string[] = []
  aplicarStubMercado(page)
  page.on("request", (pedido) => {
    if (!pedido.url().includes("/salvo")) return
    escritas.push(`${pedido.method()} ${new URL(pedido.url()).pathname}`)
  })

  await page.goto("/app/desapegos")
  const cartao = cartaoDoMercado(page, "Sofá retrátil seminovo")
  await cartao.getByRole("button", { name: "Salvar anúncio", exact: true }).click()
  await expect(
    cartao.getByRole("button", { name: "Remover dos salvos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect.poll(() => escritas).toEqual(["POST /api/app/mercado/a-1/salvo"])

  // Recarregar não perde o marcador: ele vem da rota, não do aparelho.
  await page.reload()
  await expect(
    cartaoDoMercado(page, "Sofá retrátil seminovo").getByRole("button", {
      name: "Remover dos salvos",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true")
})

test("salvar do Início grava e sobrevive ao recarregar", async ({ page }) => {
  aplicarStubMercado(page)
  await simularInicio(page)

  await page.goto("/app/inicio")
  const cartao = page.locator('[data-vitrine="21st"]', { hasText: "Berço com colchão" })
  await cartao.getByRole("button", { name: "Salvar anúncio", exact: true }).click()
  await expect(
    cartao.getByRole("button", { name: "Remover anúncio dos salvos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")

  await page.reload()
  await expect(
    page
      .locator('[data-vitrine="21st"]', { hasText: "Berço com colchão" })
      .getByRole("button", { name: "Remover anúncio dos salvos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
})

test("dessalvar em Salvos tira o cartão da lista e o marcador volta", async ({ page }) => {
  aplicarStubMercado(page)
  await page.route(/\/api\/app\/grupos\/salvas(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { publicacoes: [] } }),
  )
  await page.route(/\/api\/app\/perguntas\/salvas(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { perguntas: [] } }),
  )
  await page.route(/\/api\/app\/guia\/salvos(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { entradas: [] } }),
  )

  // Salva pelo detalhe, como a pessoa faria.
  await page.goto("/app/anuncio/a-1")
  await page.getByRole("button", { name: "Salvar anúncio", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Remover dos salvos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")

  await page.goto("/app/salvos")
  const secao = page.locator('[data-salvos="anuncios"]')
  const cartao = secao.locator('[data-cartao="anuncio"]', { hasText: "Sofá retrátil seminovo" })
  await expect(cartao).toBeVisible()

  await cartao.getByRole("button", { name: "Remover dos salvos", exact: true }).click()
  await expect(cartao).toHaveCount(0)
  await expect(secao.getByText("Nenhum anúncio salvo")).toBeVisible()

  // E o marcador do cartão do Mercado volta a "não salvo" no próximo carregamento.
  await page.goto("/app/desapegos")
  await expect(
    cartaoDoMercado(page, "Sofá retrátil seminovo").getByRole("button", {
      name: "Salvar anúncio",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "false")
})
