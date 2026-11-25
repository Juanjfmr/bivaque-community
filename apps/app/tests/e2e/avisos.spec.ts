import { expect, test } from "@playwright/test"
import { simularVoce } from "./voce-ajuda"

/**
 * Avisos (F09) no app de prova: `/app` é servido pelo Vite puro, sem Next e sem
 * banco. As rotas `/api/app/avisos` são simuladas com `page.route` (RegExp), no
 * mesmo contrato que o servidor devolve — o que se mede é a tela de verdade.
 *
 * `test` vem do Playwright cru, não do `apoio`: o modo de prova daquele arquivo
 * troca a tela real pela TelaDeProva, e aqui se mede a tela de verdade.
 */

const PUBLICACAO = "90000000-0000-4000-8000-000000000001"
const CONTEUDO = "90000000-0000-4000-8000-000000000002"

type AvisoSimulado = {
  id: string
  tipo: string
  texto: string
  destino: string
  lida: boolean
  criadaEm: string
  grupo: string
  total: number
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
      grupo: `comment|created|post|${PUBLICACAO}`,
      total: 2,
    },
    {
      id: "a2",
      tipo: "event_rsvp",
      texto: "confirmou presença no seu evento",
      destino: "/app/evento/e1",
      lida: true,
      criadaEm: "2026-11-05T12:00:00.000Z",
      grupo: "event_rsvp|confirmed|event|e1",
      total: 1,
    },
    // RUN-027: os três tipos que antes caíam todos em Você.
    {
      id: "a3",
      tipo: "invitation_accepted",
      texto: "aceitou seu convite de família",
      destino: "/app/voce",
      lida: false,
      criadaEm: "2026-11-06T12:00:00.000Z",
      grupo: "invitation_accepted|accepted|family_invitation|f1",
      total: 1,
    },
    {
      id: "a4",
      tipo: "admission_rejected",
      texto: "Sua participação não foi liberada",
      destino: "/app/entrar/analise",
      lida: false,
      criadaEm: "2026-11-06T12:00:00.000Z",
      grupo: "admission_rejected|rejected|user|u1",
      total: 1,
    },
    {
      id: "a5",
      tipo: "report_resolved",
      texto: "Sua denúncia foi analisada",
      destino: `/app/publicacao/${CONTEUDO}`,
      lida: false,
      criadaEm: "2026-11-06T12:00:00.000Z",
      grupo: "report_resolved|resolved|report|r1",
      total: 1,
    },
  ]

  await page.route(/\/api\/app\/avisos\/lidos$/, async (rota) => {
    const corpo = rota.request().postDataJSON() as {
      id?: string
      todos?: boolean
      grupo?: string
    }
    const naoLidas = avisos.filter((aviso) => !aviso.lida)
    if (corpo.todos === true) {
      for (const aviso of naoLidas) aviso.lida = true
      return rota.fulfill({ json: { atualizados: naoLidas.length } })
    }
    if (corpo.grupo !== undefined) {
      const grupo = naoLidas.filter((aviso) => aviso.grupo === corpo.grupo)
      for (const aviso of grupo) aviso.lida = true
      return rota.fulfill({ json: { atualizados: grupo.length } })
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
    // O grupo entra como uma linha com a contagem dos avisos que o compõem.
    await expect(naoLidas).toHaveAttribute("aria-label", /2 avisos/)
    await expect(naoLidas.locator('[data-contagem="2"]')).toBeVisible()
    await expect(page.locator('[data-aviso-item="a2"]')).toHaveAttribute("data-nao-lida", "nao")

    await expect(page.getByRole("button", { name: "Marcar todas como lidas" })).toBeVisible()
    // REGUA-003 (rodada 3): a ação não mora no cabeçalho — ele tem a mesma
    // altura com e sem não lidos.
    const cabeca = page.locator('[data-tela="avisos"] [data-cabeca="pagina"]')
    await expect(cabeca.getByRole("button", { name: "Marcar todas como lidas" })).toHaveCount(0)
    const alturaAntes = (await cabeca.boundingBox())?.height
    await page.getByRole("button", { name: "Marcar todas como lidas" }).click()
    await expect(page.locator('[data-aviso-item="a1"]')).toHaveAttribute("data-nao-lida", "nao")
    await expect(page.getByRole("button", { name: "Marcar todas como lidas" })).toHaveCount(0)
    expect((await cabeca.boundingBox())?.height).toBe(alturaAntes)

    await page.locator('[data-aviso-item="a1"]').click()
    await expect(page).toHaveURL(new RegExp(`/app/publicacao/${PUBLICACAO}$`))
  })

  test("tocar num aviso agrupado marca o grupo inteiro como lido", async ({ page }) => {
    await simularAvisos(page)
    await page.goto("/app/avisos")

    await page.locator('[data-aviso-item="a1"]').click()
    await expect(page).toHaveURL(new RegExp(`/app/publicacao/${PUBLICACAO}$`))

    // A lista volta do servidor: o grupo saiu lido, com a contagem preservada.
    await page.goto("/app/avisos")
    const linha = page.locator('[data-aviso-item="a1"]')
    await expect(linha).toHaveAttribute("data-nao-lida", "nao")
    await expect(linha.locator('[data-contagem="2"]')).toBeVisible()
  })

  test("tocar em cada um dos três tipos abre o destino correspondente (RUN-027)", async ({
    page,
  }) => {
    await simularAvisos(page)

    await page.goto("/app/avisos")
    await page.locator('[data-aviso-item="a4"]').click()
    await expect(page).toHaveURL(/\/app\/entrar\/analise$/)

    await page.goto("/app/avisos")
    await page.locator('[data-aviso-item="a3"]').click()
    await expect(page).toHaveURL(/\/app\/voce$/)

    await page.goto("/app/avisos")
    await page.locator('[data-aviso-item="a5"]').click()
    await expect(page).toHaveURL(new RegExp(`/app/publicacao/${CONTEUDO}$`))
  })

  test("falha de leitura mostra erro com Tentar de novo, nunca lista vazia", async ({ page }) => {
    const falha = /\/api\/app\/avisos(?:\?|$)/
    await page.route(falha, (rota) => rota.abort())
    await page.goto("/app/avisos")
    await expect(page.locator('[data-estado="erro"]')).toBeVisible()
    await expect(page.getByText("Nenhum aviso ainda")).toHaveCount(0)

    await page.unroute(falha)
    await simularAvisos(page)
    const tentar = page.getByRole("button", { name: "Tentar de novo" })
    // Tentar de novo é pílula, como as demais ações da régua (REGUA-003).
    await expect(tentar).toHaveClass(/rounded-full/)
    await tentar.click()
    await expect(page.locator('[data-aviso-item="a1"]')).toBeVisible()
  })

  // REGUA-003: o vazio tem saída — leva às preferências de avisos, na área Você.
  test("vazio de avisos leva às preferências, com a seção à vista", async ({ page }) => {
    await simularVoce(page)
    await page.route(/\/api\/app\/avisos(?:\?|$)/, (rota) =>
      rota.fulfill({ json: { avisos: [], proximo: null, naoLidos: 0 } }),
    )
    await page.goto("/app/avisos")

    const vazio = page.locator('[data-tela="avisos"] [data-estado="vazio"]')
    await expect(vazio).toContainText("Nenhum aviso ainda")
    await expect(vazio).toHaveAttribute("data-figura", "conta")
    await expect(page.getByRole("button", { name: /Marcar todas/ })).toHaveCount(0)
    await vazio.getByRole("button", { name: "Ajustar avisos" }).click()

    await expect(page).toHaveURL(/\/app\/voce$/)
    await expect(page.locator('[data-preferencias-de-aviso="sim"]')).toBeInViewport()
  })

  test("não lido é um sinal só: ponto em tinta, contagem sem ponto, chevron em toda linha", async ({
    page,
  }) => {
    await simularAvisos(page)
    await page.goto("/app/avisos")

    // Grupo de dois avisos (D21): badge em tinta, sem bolinha junto.
    const grupo = page.locator('[data-aviso-item="a1"]')
    await expect(grupo.locator('[data-contagem="2"]')).toBeVisible()
    await expect(grupo.locator('[data-sinal="nao-lida"]')).toHaveCount(0)

    // Não lida sem contagem (a3): bolinha, sem badge (D21).
    const simples = page.locator('[data-aviso-item="a3"]')
    await expect(simples.locator('[data-sinal="nao-lida"]')).toHaveCount(1)
    await expect(simples.locator("[data-contagem]")).toHaveCount(0)

    // A bolinha é tinta (D10): o mesmo `--primary` dos conversas, nunca Brasa.
    const cores = await simples.locator('[data-sinal="nao-lida"]').evaluate((elemento) => {
      const amostra = document.createElement("span")
      amostra.style.backgroundColor = "var(--primary)"
      document.body.appendChild(amostra)
      const esperado = getComputedStyle(amostra).backgroundColor
      amostra.remove()
      return { aplicado: getComputedStyle(elemento).backgroundColor, esperado }
    })
    expect(cores.aplicado).toBe(cores.esperado)

    // Toda linha abre um detalhe: chevron em todas (D11).
    for (const id of ["a1", "a2", "a3", "a4", "a5"]) {
      await expect(
        page.locator(`[data-aviso-item="${id}"] [data-icone="chevron_right"]`),
      ).toBeVisible()
    }
  })
})
