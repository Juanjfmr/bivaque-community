import type { Page } from "@playwright/test"
import { abrir, abrirGaleria, esperarCaminho, expect, SELETOR_NAVEGACAO, test } from "./apoio"

/**
 * Movimento (§6): o que a casca entrega nesta onda roda sob as duas preferências
 * de movimento. Reduzido **suprime o movimento, não o feedback**: o valor final
 * aparece na hora e o gesto direto continua.
 */

const PAGINA = '[data-animacao="pagina"]'
const FLUTUANTE = ".bv-empty-float"
const CONTADOR = "[data-contador-animado]"

async function comMovimento(page: Page, preferencia: "reduce" | "no-preference"): Promise<void> {
  await page.emulateMedia({ reducedMotion: preferencia })
}

async function estilosDe(page: Page, seletor: string) {
  return await page.evaluate((alvo) => {
    const elemento = document.querySelector(alvo)
    if (!elemento) throw new Error(`sem ${alvo}`)
    const estilo = getComputedStyle(elemento)
    return {
      animacao: estilo.animationName,
      duracaoDaAnimacao: estilo.animationDuration,
      duracaoDaTransicao: estilo.transitionDuration,
      animacoes: elemento.getAnimations().length,
    }
  }, seletor)
}

test.describe("movimento reduzido", () => {
  test.beforeEach(async ({ page }) => {
    await comMovimento(page, "reduce")
  })

  test("a ilustração do estado vazio não anima", async ({ page }) => {
    await abrirGaleria(page)
    const estilo = await estilosDe(page, FLUTUANTE)
    expect(estilo.animacao).toBe("none")
  })

  test("a navegação não transiciona ao minimizar", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const estilo = await estilosDe(page, SELETOR_NAVEGACAO)
    expect(estilo.duracaoDaTransicao).toBe("0s")
  })

  test("a contagem mostra o valor final sem animar", async ({ page }) => {
    await abrirGaleria(page)
    const medida = await estilosDe(page, CONTADOR)
    expect(medida.animacoes).toBe(0)
    await expect(page.locator(CONTADOR)).toHaveAttribute("data-contando", "nao")
    await expect(page.locator(CONTADOR)).toHaveText("128")
  })

  test("a troca de página não anima", async ({ page }) => {
    await abrir(page, "/app/comunidade")
    await expect(page.locator(PAGINA)).toHaveAttribute("data-entrando", "nao")
    // Uma tela de dentro, que é a que animaria sem movimento reduzido.
    await page.locator('[data-acao="abrir-salvos"][data-valor="prova"]').click()
    await esperarCaminho(page, "/app/salvos")
    await expect(page.locator(PAGINA)).toHaveAttribute("data-entrando", "nao")
    const estilo = await estilosDe(page, PAGINA)
    expect(estilo.animacao).toBe("none")
  })

  test("o indicador de segmento não desliza, mas a escolha vale", async ({ page }) => {
    await abrirGaleria(page)
    const indicador = page.locator(
      '[data-galeria="indicador-de-segmento"] [data-indicador="segmento"]',
    )
    const estilo = await estilosDe(
      page,
      '[data-galeria="indicador-de-segmento"] [data-indicador="segmento"]',
    )
    expect(estilo.duracaoDaTransicao).toBe("0s")

    const antes = await indicador.boundingBox()
    await page.locator('[data-galeria="indicador-de-segmento"] [data-chip="resolvidas"]').click()
    await expect(
      page.locator('[data-galeria="indicador-de-segmento"] [data-chip="resolvidas"]'),
    ).toHaveAttribute("data-estado", "on")
    await expect
      .poll(async () => (await indicador.boundingBox())?.x ?? 0, { timeout: 5_000 })
      .not.toBe(antes?.x ?? 0)
  })
})

test.describe("movimento normal", () => {
  test.beforeEach(async ({ page }) => {
    await comMovimento(page, "no-preference")
  })

  test("a ilustração do estado vazio respira", async ({ page }) => {
    await abrirGaleria(page)
    const estilo = await estilosDe(page, FLUTUANTE)
    expect(estilo.animacao).not.toBe("none")
    expect(estilo.animacoes).toBeGreaterThan(0)
  })

  test("a contagem chega ao valor final com a curva do protótipo", async ({ page }) => {
    await abrirGaleria(page)
    await expect(page.locator(CONTADOR)).toHaveAttribute("data-contando", "sim")
    await expect(page.locator(CONTADOR)).toHaveAttribute("data-contando", "nao", {
      timeout: 5_000,
    })
    await expect(page.locator(CONTADOR)).toHaveText("128")
  })

  test("a navegação transiciona ao minimizar, no celular", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    test.skip(largura >= 720, "a minimização é do celular")
    await abrir(page, "/app/inicio")
    const estilo = await estilosDe(page, SELETOR_NAVEGACAO)
    expect(estilo.duracaoDaTransicao).not.toBe("0s")
  })

  test("trocar de página entra com a animação de página, numa tela de dentro", async ({ page }) => {
    await abrir(page, "/app/comunidade")
    // As raízes (Início, Comunidade) não animam (§6, item 1): a entrada animada é
    // a de uma tela de dentro, como Salvos.
    await page.locator('[data-acao="abrir-salvos"][data-valor="prova"]').click()
    // A leitura acontece no mesmo instante da espera: nada depende de pegar a
    // animação no ar.
    const medida = await page.waitForFunction(() => {
      const pagina = document.querySelector('[data-animacao="pagina"]')
      if (pagina?.getAttribute("data-entrando") !== "sim") return null
      return getComputedStyle(pagina).animationName
    })
    expect(await medida.jsonValue()).toBe("bv-pagina-entra")
    await esperarCaminho(page, "/app/salvos")
  })

  test("o indicador de segmento desliza até o chip escolhido", async ({ page }) => {
    await abrirGaleria(page)
    const indicador = page.locator(
      '[data-galeria="indicador-de-segmento"] [data-indicador="segmento"]',
    )
    const antes = await indicador.boundingBox()
    await page.locator('[data-galeria="indicador-de-segmento"] [data-chip="resolvidas"]').click()
    await expect
      .poll(async () => (await indicador.boundingBox())?.x ?? 0, { timeout: 5_000 })
      .not.toBe(antes?.x ?? 0)
  })
})
