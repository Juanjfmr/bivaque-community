import { expect, test } from "@playwright/test"

/**
 * F06: prova de interação no app real sobre API simulada.
 * O servidor segue como autoridade sobre a situação do anúncio.
 */
const ANUNCIO = {
  id: "a-gestao",
  tipo: "item",
  titulo: "Mesa de jantar",
  descricao: "Mesa conservada para retirada no Centro.",
  precoCents: 45000,
  deal: null,
  bairro: "Centro",
  cidade: "Manaus",
  status: "active",
  condicao: "used",
  categoria: "casa_moveis",
  quartos: null,
  tipoImovel: null,
  areaM2: null,
  condoFeeCents: null,
  foto: null,
  criadoEm: "2026-11-01T10:00:00.000Z",
}

test("gestão exige confirmar a pausa, bloqueia outras ações e permite cancelar", async ({
  page,
}) => {
  let situacao = "active"
  const escritas: string[] = []

  await page.route(/\/api\/app\/mercado\/meus(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: { anuncios: [{ ...ANUNCIO, status: situacao }], proximo: null, cidade: "Manaus" },
    }),
  )
  await page.route(/\/api\/app\/mercado\/a-gestao\/situacao$/, async (rota) => {
    const corpo = rota.request().postDataJSON() as { acao: string }
    escritas.push(corpo.acao)
    situacao = corpo.acao === "pause" ? "paused" : situacao
    await rota.fulfill({ json: { status: situacao } })
  })

  await page.goto("/app/meus-anuncios")
  await page.locator('[data-acao="gerenciar-anuncio"]').click()
  const dialogo = page.locator('[data-gerenciar-anuncio="a-gestao"]')
  await expect(dialogo).toBeVisible()

  await dialogo.locator('[data-acao="situacao-pause"]').click()
  await expect(dialogo.locator('[data-acao="confirmar-pause"]')).toBeVisible()
  await expect(dialogo.locator('[data-acao="situacao-close"]')).toBeDisabled()
  await expect(dialogo.locator('[data-acao="salvar-edicao"]')).toBeDisabled()
  expect(escritas).toEqual([])

  await dialogo.locator('[data-acao="cancelar-confirmacao"]').click()
  await expect(dialogo.locator('[data-acao="situacao-pause"]')).toBeVisible()
  expect(escritas).toEqual([])

  await dialogo.locator('[data-acao="situacao-pause"]').click()
  await dialogo.locator('[data-acao="confirmar-pause"]').click()
  await expect(dialogo).toContainText("Situação atual: Pausado")
  expect(escritas).toEqual(["pause"])
})

test("uma edição pendente bloqueia outra chamada e libera ao concluir", async ({ page }) => {
  const escritas: string[] = []
  let liberar: () => void = () => {
    throw new Error("A edição não iniciou")
  }
  const respostaPendente = new Promise<void>((resolve) => {
    liberar = resolve
  })

  await page.route(/\/api\/app\/mercado\/meus(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { anuncios: [ANUNCIO], proximo: null, cidade: "Manaus" } }),
  )
  await page.route(/\/api\/app\/mercado\/a-gestao$/, async (rota) => {
    if (rota.request().method() !== "PATCH") return rota.continue()
    escritas.push("edicao")
    await respostaPendente
    await rota.fulfill({ json: { anuncio: { id: ANUNCIO.id } } })
  })
  await page.route(/\/api\/app\/mercado\/a-gestao\/situacao$/, async (rota) => {
    escritas.push("situacao")
    await rota.fulfill({ json: { status: "paused" } })
  })

  await page.goto("/app/meus-anuncios")
  await page.locator('[data-acao="gerenciar-anuncio"]').click()
  const dialogo = page.locator('[data-gerenciar-anuncio="a-gestao"]')
  await dialogo.locator('[data-acao="salvar-edicao"]').click()
  await expect(dialogo.locator('[data-acao="salvar-edicao"]')).toBeDisabled()
  await expect(dialogo.locator('[data-acao="situacao-pause"]')).toBeDisabled()
  await expect.poll(() => escritas).toEqual(["edicao"])
  liberar()
  await expect(dialogo.locator('[data-acao="salvar-edicao"]')).toBeEnabled()
  expect(escritas).toEqual(["edicao"])
})
