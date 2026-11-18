import { expect, test } from "@playwright/test"

const ID = "41000000-0000-4000-8000-000000000051"
const OUTRA = "41000000-0000-4000-8000-000000000052"

test("contador e marcador acompanham leitura confirmada", async ({ page }) => {
  let porLer = true
  let chamadas = 0
  const conversa = (id: string) => ({
    id,
    nome: id === ID ? "Maria" : "João",
    outroId: ID,
    tipo: "provider",
    contextoId: ID,
    ultima: "Olá",
    porLer: id === ID && porLer,
  })
  await page.route("**/api/app/entry/progress", (rota) =>
    rota.fulfill({ json: { autenticado: true } }),
  )
  await page.route("**/api/app/avisos**", (rota) =>
    rota.fulfill({ json: { avisos: [], proximo: null, naoLidos: 0 } }),
  )
  await page.route("**/api/app/conversas", (rota) =>
    rota.fulfill({
      json: { conversas: [conversa(ID), conversa(OUTRA)], proximo: null, porLer: porLer ? 1 : 0 },
    }),
  )
  await page.route(`**/api/app/conversas/${ID}/lida`, (rota) => {
    chamadas++
    porLer = false
    return rota.fulfill({ status: 204 })
  })
  await page.route(`**/api/app/conversas/${ID}`, (rota) =>
    rota.fulfill({ json: { conversa: conversa(ID), mensagens: [], anterior: null } }),
  )
  await page.route("**/api/app/voce/bloqueados", (rota) => rota.fulfill({ json: { pessoas: [] } }))
  await page.goto("/app")
  await expect(page.locator('[data-contador="conversas"]')).toHaveText("1")
  await page.goto("/app/conversas")
  await expect(page.locator(`[data-thread="${ID}"]`).getByLabel("Por ler")).toBeVisible()
  await expect(page.locator(`[data-thread="${OUTRA}"]`).getByLabel("Por ler")).toHaveCount(0)
  await page.locator(`[data-thread="${ID}"] button`).click()
  await expect.poll(() => chamadas).toBe(1)
  await page.goto("/app")
  await expect(page.locator('[data-contador="conversas"]')).toHaveCount(0)
  await page.goto("/app/conversas")
  await expect(page.getByLabel("Por ler")).toHaveCount(0)
})
