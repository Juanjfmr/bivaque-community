import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import {
  GUIA_PAGINA_2,
  NEGOCIOS_PAGINA_2,
  simularGuia,
  simularNegocios,
  simularProgresso,
} from "./apoio"

/**
 * «Ver mais» nas telas reais que o têm hoje: Guia e Negócios.
 *
 * Início não tem «Ver mais»: `telas/Inicio.tsx` nunca pede a página 2 e o botão
 * não existe. Como `telas/` está fora dos caminhos permitidos deste lote, a
 * lacuna fica registrada no relatório em vez de ser escondida atrás de um teste
 * artificial. Guia e Negócios são exercitados de verdade: o cursor vai na
 * requisição, a página 2 entra na lista, nenhum item se repete, a rolagem não
 * volta ao topo e o conteúdo novo continua alcançável pelo teclado.
 */

const PAGINA_2_DOS_NEGOCIOS = NEGOCIOS_PAGINA_2.negocios[0]?.nome ?? ""
const PAGINA_2_DO_GUIA = GUIA_PAGINA_2.entradas[0]?.nome ?? ""

/**
 * Leva a pessoa ao «Ver mais» da lista — o fim da lista, não o fim da página:
 * o Guia tem uma seção depois das referências.
 */
async function irAoFimDaLista(page: Page): Promise<number> {
  await page.getByRole("button", { name: /^Ver mais/ }).scrollIntoViewIfNeeded()
  return page.locator("#conteudo").evaluate((elemento) => elemento.scrollTop)
}

async function alcancarComTab(page: Page, alvo: ReturnType<Page["locator"]>): Promise<boolean> {
  for (let volta = 0; volta < 80; volta += 1) {
    await page.keyboard.press("Tab")
    const focou = await alvo.evaluate((elemento) => elemento === document.activeElement)
    if (focou) return true
  }
  return false
}

function semRepeticao(titulos: readonly string[]): string[] {
  const vistos = new Set<string>()
  const repetidos: string[] = []
  for (const titulo of titulos) {
    if (vistos.has(titulo)) repetidos.push(titulo)
    else vistos.add(titulo)
  }
  return repetidos
}

test.describe("Ver mais negócios", () => {
  test("a página 2 entra sem repetir item e sem voltar ao topo", async ({ page }) => {
    await simularProgresso(page)
    await simularNegocios(page)
    await page.goto("/app/negocios")
    await expect(page.locator('[data-tela="negocios"]')).toBeVisible()

    const cartoes = page.locator('[data-cartao="negocio"]')
    await expect(cartoes).toHaveCount(2)
    await expect(page.getByText("2 negócios em Manaus")).toBeVisible()

    const rolagemAntes = await irAoFimDaLista(page)
    const pedido = page.waitForRequest((requisicao) => {
      const url = new URL(requisicao.url())
      return url.pathname === "/api/app/negocios" && url.searchParams.get("depois") !== null
    })

    await page.getByRole("button", { name: "Ver mais negócios" }).click()
    const requisicao = await pedido
    expect(new URL(requisicao.url()).searchParams.get("depois")).toBe("negocios-pagina-2")

    const novo = page.locator('[data-cartao="negocio"]').filter({ hasText: PAGINA_2_DOS_NEGOCIOS })
    await expect(novo).toBeVisible()
    await expect(cartoes).toHaveCount(3)
    await expect(page.getByText("3 negócios em Manaus")).toBeVisible()
    await expect(page.getByRole("button", { name: "Ver mais negócios" })).toHaveCount(0)

    const titulos = await page.locator('[data-cartao="negocio"] h3').allInnerTexts()
    expect(semRepeticao(titulos.map((titulo) => titulo.trim()))).toEqual([])
    expect(titulos.map((titulo) => titulo.trim())).toContain(PAGINA_2_DOS_NEGOCIOS)

    // A rolagem foi ao fim para o clique; carregar a página 2 não pode jogar a
    // pessoa de volta ao topo. Em telas altas a lista pode não rolar, e aí o
    // valor é zero dos dois lados.
    const rolagemDepois = await page.locator("#conteudo").evaluate((elemento) => elemento.scrollTop)
    if (rolagemAntes > 0) {
      expect(rolagemDepois).toBeGreaterThan(0)
      expect(Math.abs(rolagemDepois - rolagemAntes)).toBeLessThanOrEqual(120)
    }

    // O botão sai da página quando o cursor termina e o Chromium tira o foco de
    // um botão que fica desabilitado durante a carga; por isso a prova de foco é
    // a continuidade do caminho de teclado até o item novo, não um
    // `toBeFocused()` no botão que deixou de existir.
    await page.evaluate(() => {
      const ativo = document.activeElement
      if (ativo instanceof HTMLElement) ativo.blur()
    })
    const abrirNovo = page.getByRole("button", { name: `Ver negócio: ${PAGINA_2_DOS_NEGOCIOS}` })
    expect(await alcancarComTab(page, abrirNovo)).toBe(true)
  })
})

test.describe("Ver mais referências do guia", () => {
  test("a página 2 entra sem repetir item e sem voltar ao topo", async ({ page }) => {
    await simularProgresso(page)
    await simularGuia(page)
    await page.goto("/app/guia")
    await expect(page.locator('[data-tela="guia"]')).toBeVisible()

    const linhas = page.locator('[data-linha="lista"]')
    await expect(linhas).toHaveCount(2)

    const rolagemAntes = await irAoFimDaLista(page)
    const pedido = page.waitForRequest((requisicao) => {
      const url = new URL(requisicao.url())
      return url.pathname === "/api/app/guia" && url.searchParams.get("depois") !== null
    })

    await page.getByRole("button", { name: "Ver mais referências" }).click()
    const requisicao = await pedido
    expect(new URL(requisicao.url()).searchParams.get("depois")).toBe("guia-pagina-2")

    const nova = page.locator('[data-linha="lista"]').filter({ hasText: PAGINA_2_DO_GUIA })
    await expect(nova).toBeVisible()
    await expect(linhas).toHaveCount(3)
    await expect(page.getByRole("button", { name: "Ver mais referências" })).toHaveCount(0)

    const titulos = await page.locator("[data-titulo-linha]").allInnerTexts()
    expect(semRepeticao(titulos.map((titulo) => titulo.trim()))).toEqual([])
    expect(titulos.map((titulo) => titulo.trim())).toContain(PAGINA_2_DO_GUIA)

    const rolagemDepois = await page.locator("#conteudo").evaluate((elemento) => elemento.scrollTop)
    if (rolagemAntes > 0) {
      expect(rolagemDepois).toBeGreaterThan(0)
      expect(Math.abs(rolagemDepois - rolagemAntes)).toBeLessThanOrEqual(120)
    }

    await page.evaluate(() => {
      const ativo = document.activeElement
      if (ativo instanceof HTMLElement) ativo.blur()
    })
    expect(await alcancarComTab(page, nova)).toBe(true)
  })
})
