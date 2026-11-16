import { expect, type Locator, type Page, test } from "@playwright/test"
import { simularInicio } from "./inicio-ajuda"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * RUN-173 — o marcador de salvo muda o desenho, não só o rótulo.
 *
 * Na Material Symbols `bookmark` e `bookmark_border` são o MESMO glifo: o
 * preenchimento é o eixo `FILL`. Quem troca o nome sem ligar o eixo desenha o
 * mesmo contorno, e o cartão fica idêntico antes e depois de salvar. Aqui o
 * glifo do marcador é capturado nos dois estados e os pixels são comparados —
 * diferença zero é o defeito, não uma tolerância.
 *
 * O segundo teste mede a fonte sozinha (a peça "Salvo" da galeria é desenhada
 * com `FILL 1`): ele separa "a fonte sabe desenhar o cheio" de "a tela liga o
 * cheio". O terceiro checa que a amostra de glifos não vira quadrado.
 */

const TEMAS = ["claro", "escuro"] as const

/** Pixels que mudam entre duas capturas do mesmo recorte. */
async function pixelsQueMudam(page: Page, um: Buffer, outro: Buffer): Promise<number> {
  return await page.evaluate(
    async ([a, b]: readonly [string, string]) => {
      const ler = async (base64: string) => {
        const dados = await (await fetch(`data:image/png;base64,${base64}`)).blob()
        const mapa = await createImageBitmap(dados)
        const tela = new OffscreenCanvas(mapa.width, mapa.height)
        const pincel = tela.getContext("2d")
        if (pincel === null) throw new Error("canvas 2d indisponível")
        pincel.drawImage(mapa, 0, 0)
        return pincel.getImageData(0, 0, mapa.width, mapa.height)
      }
      const [primeira, segunda] = await Promise.all([ler(a), ler(b)])
      if (primeira.width !== segunda.width || primeira.height !== segunda.height) return -1
      let diferentes = 0
      for (let i = 0; i < primeira.data.length; i += 4) {
        for (let canal = 0; canal < 3; canal += 1) {
          const antes = primeira.data[i + canal] ?? 0
          const depois = segunda.data[i + canal] ?? 0
          if (Math.abs(antes - depois) > 8) {
            diferentes += 1
            break
          }
        }
      }
      return diferentes
    },
    [um.toString("base64"), outro.toString("base64")] as const,
  )
}

/**
 * Pixels pintados com a cor do ícone: a tinta do glifo. Antialiasing de borda
 * entra junto; fundo, foto e `hover` ficam de fora. Zero é quadrado em branco.
 */
async function tinta(page: Page, captura: Buffer, cor: string): Promise<number> {
  const canais = /(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(cor)
  if (canais === null) throw new Error(`cor inesperada: ${cor}`)
  const alvo = [Number(canais[1]), Number(canais[2]), Number(canais[3])]
  return await page.evaluate(
    async ([base64, rgb]: readonly [string, readonly number[]]) => {
      const dados = await (await fetch(`data:image/png;base64,${base64}`)).blob()
      const mapa = await createImageBitmap(dados)
      const tela = new OffscreenCanvas(mapa.width, mapa.height)
      const pincel = tela.getContext("2d")
      if (pincel === null) throw new Error("canvas 2d indisponível")
      pincel.drawImage(mapa, 0, 0)
      const { data } = pincel.getImageData(0, 0, mapa.width, mapa.height)
      let marcados = 0
      for (let i = 0; i < data.length; i += 4) {
        let perto = true
        for (let canal = 0; canal < 3; canal += 1) {
          if (Math.abs((data[i + canal] ?? 0) - (rgb[canal] ?? 0)) > 40) {
            perto = false
            break
          }
        }
        if (perto) marcados += 1
      }
      return marcados
    },
    [captura.toString("base64"), alvo] as const,
  )
}

function marcador(cartao: Locator, rotulo: string): Locator {
  return cartao.getByRole("button", { name: rotulo, exact: true })
}

/** A galeria de ícones só existe com o modo de prova ligado pelo global da janela. */
async function abrirGaleria(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as { __BIVAQUE_MODO_DE_PROVA__?: boolean }).__BIVAQUE_MODO_DE_PROVA__ = true
  })
  await page.goto("/app/galeria")
  await expect(page.locator('[data-tela="galeria"]')).toBeVisible()
}

/** A folha de prévias das peças: fora do roteador, só no servidor de desenvolvimento. */
async function abrirPecas(page: Page): Promise<void> {
  await page.goto("/app/previa/pecas")
  await page.evaluate(() => document.fonts.ready)
}

async function comTema(page: Page, tema: (typeof TEMAS)[number]): Promise<void> {
  await page.evaluate((valor) => {
    if (valor === "escuro") document.documentElement.dataset["tema"] = "escuro"
    else delete document.documentElement.dataset["tema"]
  }, tema)
  await page.evaluate(() => document.fonts.ready)
}

/**
 * Mede os dois estados do marcador: clica em "salvar", tira o ponteiro de cima
 * e espera o fundo do botão voltar ao de antes do clique (o `hover` do ghost
 * escurece o círculo). Assim o recorte tem o mesmo fundo nos dois estados, e o
 * que sobra na comparação é o desenho do glifo.
 */
async function medirMarcador(
  page: Page,
  cartao: Locator,
  salvar: string,
  salvo: string,
): Promise<{ mudaram: number; tintaAntes: number; tintaDepois: number }> {
  const contorno = marcador(cartao, salvar)
  await expect(contorno).toBeVisible()
  const fundoDeRepouso = await contorno.evaluate(
    (elemento) => getComputedStyle(elemento).backgroundColor,
  )
  // O recorte é o glifo, não o botão: o círculo muda de tom no `hover` do
  // clique, e o que este teste mede é o desenho.
  const glifo = contorno.locator("[data-icone]")
  const corDaTinta = await glifo.evaluate((elemento) => getComputedStyle(elemento).color)
  const antes = await glifo.screenshot()

  await contorno.click()
  const cheio = marcador(cartao, salvo)
  await expect(cheio).toHaveAttribute("aria-pressed", "true")
  await page.mouse.move(0, 0)
  await expect
    .poll(() => cheio.evaluate((elemento) => getComputedStyle(elemento).backgroundColor))
    .toBe(fundoDeRepouso)
  const depois = await cheio.locator("[data-icone]").screenshot()

  return {
    mudaram: await pixelsQueMudam(page, antes, depois),
    tintaAntes: await tinta(page, antes, corDaTinta),
    tintaDepois: await tinta(page, depois, corDaTinta),
  }
}

function exigirMarcadorCheio(medida: {
  mudaram: number
  tintaAntes: number
  tintaDepois: number
}): void {
  // O contorno vira o preenchido: o desenho muda e cobre bem mais tinta.
  expect(medida.mudaram).toBeGreaterThan(40)
  expect(medida.tintaDepois).toBeGreaterThan(medida.tintaAntes * 1.5)
}

test.describe("o marcador de salvo desenha outro ícone", () => {
  for (const tema of TEMAS) {
    test(`no cartão do Mercado, salvar e dessalvar trocam os pixels (${tema})`, async ({
      page,
    }) => {
      aplicarStubMercado(page)
      await page.goto("/app/desapegos")
      const cartao = page.locator('[data-tela="desapegos"] [data-cartao="anuncio"]', {
        hasText: "Sofá retrátil seminovo",
      })
      await comTema(page, tema)

      const medida = await medirMarcador(page, cartao, "Salvar anúncio", "Remover dos salvos")
      exigirMarcadorCheio(medida)
    })

    test(`no cartão do Início, salvar troca os pixels do marcador (${tema})`, async ({ page }) => {
      aplicarStubMercado(page)
      await simularInicio(page)
      await page.goto("/app/inicio")
      const cartao = page.locator('[data-vitrine="21st"]', { hasText: "Berço com colchão" })
      await comTema(page, tema)

      const medida = await medirMarcador(
        page,
        cartao,
        "Salvar anúncio",
        "Remover anúncio dos salvos",
      )
      exigirMarcadorCheio(medida)
    })
  }

  test("a fonte desenha o marcador cheio, distinto do contorno", async ({ page }) => {
    await abrirPecas(page)

    const icones = page.getByRole("region", { name: "Ícones" })
    const cheio = await icones.getByRole("button", { name: "Salvo", exact: true }).screenshot()
    const contorno = await icones.getByRole("button", { name: "Salvar", exact: true }).screenshot()

    expect(await pixelsQueMudam(page, cheio, contorno)).toBeGreaterThan(20)
  })

  test("a amostra de glifos usados desenha glifo, não quadrado", async ({ page }) => {
    await abrirGaleria(page)
    await page.evaluate(() => document.fonts.ready)

    const amostra = [
      "arrow_back",
      "photo_camera",
      "bookmark",
      "bookmark_border",
      "bookmark_remove",
      "notifications_active",
      "visibility_off",
      "home",
      "undo",
    ]
    for (const nome of amostra) {
      const icone = page.locator(`[data-icone-lista] [data-icone="${nome}"]`).first()
      const cor = await icone.evaluate((elemento) => getComputedStyle(elemento).color)
      const captura = await icone.screenshot()
      expect(await tinta(page, captura, cor), nome).toBeGreaterThan(10)
    }
  })
})
