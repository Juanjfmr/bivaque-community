import type { Page } from "@playwright/test"

import {
  abrir,
  caminhoAtual,
  conteudo,
  esperarCaminho,
  esperarRolagem,
  expect,
  rolagemReal,
  test,
  tituloDaTela,
} from "./apoio"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * NAV-001: a Folha única (arrasto, cancelamento e fechamento), o Desfazer da
 * ação otimista e a volta da lista na mesma posição com o filtro preservado.
 * Roda nos três tamanhos da bateria e nos dois temas.
 */

const FOLHA_DA_CIDADE = '[data-sobreposicao="cidade"]'
const CORPO = ".pc-folha-corpo"
const ALCA = ".pc-folha-alca"

/** O topo do conteúdo, longe dos controles: é dali que a folha arrasta. */
async function pontoDoArrasto(page: Page): Promise<{ x: number; y: number }> {
  const corpo = await page.locator(CORPO).first().boundingBox()
  expect(corpo).not.toBeNull()
  return { x: (corpo?.x ?? 0) + 8, y: (corpo?.y ?? 0) + 6 }
}

async function arrastar(page: Page, distancia: number): Promise<void> {
  const origem = await pontoDoArrasto(page)
  await page.mouse.move(origem.x, origem.y)
  await page.mouse.down()
  await page.mouse.move(origem.x, origem.y + distancia, { steps: 8 })
}

function transformDaFolha(page: Page): Promise<string> {
  return page
    .locator(FOLHA_DA_CIDADE)
    .evaluate((elemento) => (elemento as HTMLElement).style.transform)
}

/** Abre a folha de cidade pelo chip do topo. */
async function abrirFolhaDaCidade(page: Page): Promise<void> {
  await abrir(page, "/app/inicio")
  await page.locator('[data-acao="cidade"]').click()
  await expect(page.locator(FOLHA_DA_CIDADE)).toBeVisible()
}

for (const tema of ["claro", "escuro"] as const) {
  test.describe(`Folha única — ${tema}`, () => {
    test.use({ colorScheme: tema })

    test("arrastar acompanha o dedo; soltar antes do limite volta ao lugar", async ({ page }) => {
      await abrirFolhaDaCidade(page)

      await arrastar(page, 40)
      // A folha acompanha o dedo: o deslocamento está no próprio elemento.
      expect(await transformDaFolha(page)).toContain("translateY(4")
      await page.mouse.up()

      // Arrasto curto: a folha volta e continua aberta.
      await expect.poll(() => transformDaFolha(page)).toBe("")
      await expect(page.locator(FOLHA_DA_CIDADE)).toBeVisible()
      await expect(page.locator(ALCA)).toHaveCount(
        (page.viewportSize()?.width ?? 0) < 768 ? 1 : 0,
      )
    })

    test("arrastar além do limite fecha a folha", async ({ page }) => {
      await abrirFolhaDaCidade(page)

      await arrastar(page, 180)
      await page.mouse.up()
      await expect(page.locator(FOLHA_DA_CIDADE)).toHaveCount(0)
      // Fechar pelo arrasto devolve o foco a quem abriu.
      await expect(page.locator('[data-acao="cidade"]')).toBeFocused()
    })
  })
}

const ANUNCIOS = Array.from({ length: 16 }, (_, indice) => ({
  id: `nav-item-${indice + 1}`,
  tipo: "item" as const,
  titulo: `Item de desapego ${indice + 1}`,
  descricao: "Peça usada, em bom estado.",
  precoCents: 10_000 + indice * 500,
  deal: null,
  bairro: "Centro",
  cidade: "Manaus",
  status: "active",
  condicao: "usado",
  categoria: "móveis",
  quartos: null,
  tipoImovel: null,
  areaM2: null,
  condoFeeCents: null,
  foto: null,
  criadoEm: "2026-11-04T12:00:00Z",
}))

/** A lista do Mercado com altura de sobra para provar a posição restaurada. */
async function simularListaLonga(page: Page): Promise<void> {
  await page.route(/\/api\/app\/mercado\?[^#]*$/, async (rota) => {
    await rota.fulfill({
      json: {
        cidade: "Manaus",
        proximo: null,
        anuncios: ANUNCIOS.map((anuncio) => ({ ...anuncio, salvo: false })),
      },
    })
  })
}

for (const tema of ["claro", "escuro"] as const) {
  test.describe(`Ação otimista e posição da lista — ${tema}`, () => {
    test.use({ colorScheme: tema })

    test("salvar o anúncio oferece Desfazer, e o Desfazer grava o estado anterior", async ({
      page,
    }) => {
      aplicarStubMercado(page)
      const gravacoes: string[] = []
      page.on("request", (pedido) => {
        if (/\/api\/app\/mercado\/a-1\/salvo/.test(pedido.url())) gravacoes.push(pedido.method())
      })

      await page.goto("/app/anuncio/a-1")
      const marcador = page.getByRole("button", { name: "Salvar anúncio" })
      await expect(marcador).toHaveAttribute("aria-pressed", "false")

      await marcador.click()
      // O estado muda na hora, antes da resposta; o Aviso oferece Desfazer.
      await expect(page.getByRole("button", { name: "Remover dos salvos" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      const aviso = page.getByRole("status").filter({ hasText: "Anúncio salvo." })
      await expect(aviso).toBeVisible()
      await aviso.getByRole("button", { name: "Desfazer" }).click()

      await expect(page.getByRole("button", { name: "Salvar anúncio" })).toHaveAttribute(
        "aria-pressed",
        "false",
      )
      // POST para salvar e DELETE para desfazer: o Desfazer gravou de verdade.
      await expect.poll(() => gravacoes.join(",")).toBe("POST,DELETE")
    })

    test("voltar de um anúncio devolve Desapegos com o filtro na mesma posição", async ({
      page,
    }) => {
      aplicarStubMercado(page)
      await simularListaLonga(page)

      await abrir(page, "/app/mercado?q=desapego")
      await expect(page.locator('[data-chips="filtros-mercado"]')).toContainText(
        "Busca: desapego",
      )
      await rolarAtePosicao(page, 900)

      const cartao = page.locator('[data-cartao="anuncio"]').nth(3)
      await cartao.click()
      await esperarCaminho(page, `/app/anuncio/${ANUNCIOS[3]?.id ?? ""}`)

      await page.goBack()
      await esperarCaminho(page, "/app/mercado")
      // O filtro continua na tela e no endereço…
      await expect(page.locator('[data-chips="filtros-mercado"]')).toContainText(
        "Busca: desapego",
      )
      expect(new URL(page.url()).searchParams.get("q")).toBe("desapego")
      // …e a rolagem volta onde estava, depois de a lista carregar.
      await esperarRolagem(page, 900)
      await expect(tituloDaTela(page)).toHaveText("Desapegos")
    })
  })
}

/** Rola como a pessoa rola: roda do mouse sobre o conteúdo (dispara o registro). */
async function rolarAtePosicao(page: Page, posicao: number): Promise<void> {
  const alvo = conteudo(page)
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    const atual = await rolagemReal(page)
    if (atual === posicao) break
    await alvo.hover()
    await page.mouse.wheel(0, Math.min(200, posicao - atual))
    await page.waitForTimeout(30)
  }
  expect(await rolagemReal(page)).toBe(posicao)
  expect(await caminhoAtual(page)).toBe("/app/mercado")
}
