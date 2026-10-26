import type { Page } from "@playwright/test"
import { abrirGaleria, expect, test } from "./apoio"

/**
 * As fontes: Noto Sans, Noto Serif e Material Symbols, hospedadas localmente a
 * partir dos mesmos arquivos do protótipo (ADR §2). Nada de rede para fonte.
 */

type Pedido = { readonly url: string; readonly tipo: string }

async function comRegistro(page: Page, aoVisitar: () => Promise<void>) {
  const pedidos: Pedido[] = []
  const respostas: Array<{ url: string; status: number }> = []
  page.on("request", (requisicao) => {
    pedidos.push({ url: requisicao.url(), tipo: requisicao.resourceType() })
  })
  page.on("response", (resposta) => {
    if (resposta.url().includes("/fonts/")) {
      respostas.push({ url: resposta.url(), status: resposta.status() })
    }
  })
  await aoVisitar()
  return { pedidos, respostas }
}

const ORIGEM_LOCAL = "http://127.0.0.1:3200"

test.describe("fontes locais", () => {
  test("as três famílias carregam do próprio app, sem rede externa", async ({ page }) => {
    const { pedidos, respostas } = await comRegistro(page, async () => {
      await abrirGaleria(page)
      await page.evaluate(() => document.fonts.ready)
    })

    const deFora = pedidos.filter(
      (pedido) =>
        pedido.url.includes("fonts.googleapis") ||
        pedido.url.includes("gstatic") ||
        pedido.url.includes("fonts.cdnfonts") ||
        pedido.url.includes("use.typekit"),
    )
    expect(deFora).toEqual([])

    const deFonte = pedidos.filter((pedido) => pedido.tipo === "font")
    expect(deFonte.length).toBeGreaterThan(0)
    for (const pedido of deFonte) {
      expect(pedido.url.startsWith(`${ORIGEM_LOCAL}/app/fonts/`), pedido.url).toBe(true)
    }
    for (const resposta of respostas) {
      expect(resposta.status, resposta.url).toBe(200)
    }

    const carregadas = await page.evaluate(() => ({
      simbolos: document.fonts.check('24px "Material Symbols Outlined"'),
      sans: document.fonts.check('400 16px "Noto Sans"'),
      serif: document.fonts.check('600 16px "Noto Serif"'),
    }))
    expect(carregadas).toEqual({ simbolos: true, sans: true, serif: true })
  })

  test("a fonte de símbolos é a mesma do protótipo, servida pelo app", async ({ page }) => {
    const resposta = await page.request.get("/app/fonts/material-symbols-outlined.woff2")
    expect(resposta.status()).toBe(200)
    expect(resposta.headers()["content-type"] ?? "").toContain("font")
    const corpo = await resposta.body()
    // O arquivo do protótipo tem 52.772 bytes; o app serve os mesmos bytes.
    expect(corpo.length).toBe(52772)
    expect(corpo.subarray(0, 4).toString("ascii")).toBe("wOF2")
  })

  test("as Noto vêm dos arquivos do protótipo", async ({ page }) => {
    const sans = await page.request.get("/app/fonts/noto-sans.woff2")
    const serif = await page.request.get("/app/fonts/noto-serif.woff2")
    expect(sans.status()).toBe(200)
    expect(serif.status()).toBe(200)
    expect((await sans.body()).length).toBe(35820)
    expect((await serif.body()).length).toBe(15312)
  })

  test("o texto do app é desenhado com a Noto Sans, e o título com a Noto Serif", async ({
    page,
  }) => {
    await abrirGaleria(page)
    await page.evaluate(() => document.fonts.ready)
    const familias = await page.evaluate(() => {
      const h1 = document.querySelector("h1")
      if (!h1) throw new Error("sem h1")
      return {
        corpo: getComputedStyle(document.body).fontFamily,
        titulo: getComputedStyle(h1).fontFamily,
      }
    })
    expect(familias.corpo).toContain("Noto Sans")
    expect(familias.titulo).toContain("Noto Serif")
  })
})
