import { expect, test } from "@playwright/test"

/**
 * Avisos (F09) no app de prova: `/app` é servido pelo Vite puro, sem Next e sem
 * banco. As rotas `/api/app/avisos` são simuladas com `page.route` (RegExp), no
 * mesmo contrato que o servidor devolve — o que se mede é a tela de verdade.
 *
 * `test` vem do Playwright cru, não do `apoio`: o modo de prova daquele arquivo
 * troca a tela real pela TelaDeProva, e aqui se mede a tela de verdade.
 */

const PUBLICACAO = "90000000-0000-4000-8000-000000000001"

type AvisoSimulado = {
  id: string
  tipo: string
  texto: string
  destino: string
  lida: boolean
  criadaEm: string
}

async function simularAvisos(page: import("@playwright/test").Page) {
  const avisos: AvisoSimulado[] = [
    {
      id: "a1",
      tipo: "comment",
      texto: "comentou na sua publicação",
      destino: `/app/publicacao/${PUBLICACAO}`,
      lida: false,
      criadaEm: "2026-11-06T12:00:00.000Z",
    },
    {
      id: "a2",
      tipo: "event_rsvp",
      texto: "confirmou presença no seu evento",
      destino: "/app/evento/e1",
      lida: true,
      criadaEm: "2026-11-05T12:00:00.000Z",
    },
  ]

  await page.route(/\/api\/app\/avisos\/lidos$/, async (rota) => {
    const corpo = rota.request().postDataJSON() as { id?: string; todos?: boolean }
    const naoLidas = avisos.filter((aviso) => !aviso.lida)
    if (corpo.todos === true) {
      for (const aviso of naoLidas) aviso.lida = true
      return rota.fulfill({ json: { atualizados: naoLidas.length } })
    }
    const alvo = naoLidas.find((aviso) => aviso.id === corpo.id)
    if (alvo === undefined) return rota.fulfill({ json: { atualizados: 0 } })
    alvo.lida = true
    return rota.fulfill({ json: { atualizados: 1 } })
  })

  await page.route(/\/api\/app\/avisos(?:\?|$)/, async (rota) => {
    const url = new URL(rota.request().url())
    const filtro = url.searchParams.get("filtro")
    const lista = filtro === "nao-lidas" ? avisos.filter((aviso) => !aviso.lida) : avisos
    return rota.fulfill({
      json: {
        avisos: lista,
        proximo: null,
        naoLidos: avisos.filter((aviso) => !aviso.lida).length,
      },
    })
  })
}

test.describe("F09 — avisos", () => {
  test("lista, marca como lido e abre o destino no app", async ({ page }) => {
    await simularAvisos(page)
    await page.goto("/app/avisos")

    const naoLidas = page.locator('[data-aviso-item="a1"]')
    await expect(naoLidas).toBeVisible()
    await expect(naoLidas).toHaveAttribute("data-nao-lida", "sim")
    await expect(page.locator('[data-aviso-item="a2"]')).toHaveAttribute("data-nao-lida", "nao")

    await expect(page.getByRole("button", { name: "Marcar todas" })).toBeVisible()
    await page.getByRole("button", { name: "Marcar todas" }).click()
    await expect(page.locator('[data-aviso-item="a1"]')).toHaveAttribute("data-nao-lida", "nao")
    await expect(page.getByRole("button", { name: "Marcar todas" })).toHaveCount(0)

    await page.locator('[data-aviso-item="a1"]').click()
    await expect(page).toHaveURL(new RegExp(`/app/publicacao/${PUBLICACAO}$`))
  })

  test("falha de leitura mostra erro com Tentar de novo, nunca lista vazia", async ({ page }) => {
    const falha = /\/api\/app\/avisos(?:\?|$)/
    await page.route(falha, (rota) => rota.abort())
    await page.goto("/app/avisos")
    await expect(page.locator('[data-estado="erro"]')).toBeVisible()
    await expect(page.getByText("Nenhum aviso ainda")).toHaveCount(0)

    await page.unroute(falha)
    await simularAvisos(page)
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.locator('[data-aviso-item="a1"]')).toBeVisible()
  })
})
