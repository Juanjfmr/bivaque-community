import { abrir, expect, SELETOR_BARRA, SELETOR_NAVEGACAO, test } from "./apoio"

/**
 * O tema: os tokens do protótipo, claro e escuro seguindo o sistema, inclusive
 * quando a pessoa troca o tema com o app aberto (ADR §2).
 *
 * As cores medidas são as do `apps/prototipo/app/globals.css`, que é a tradução
 * aprovada dos tokens do protótipo de HTML.
 */

const CLARO = { fundo: "242, 240, 235", tinta: "37, 48, 51", barra: "#F2F0EB" }
const ESCURO = { fundo: "23, 30, 32", tinta: "236, 234, 228", barra: "#171E20" }

/**
 * A cor **resolvida** de um token, e não o texto bruto dele: o build minifica
 * `rgb(242 240 235)` para `#f2f0eb`, então ler `--background` como string
 * mediria o minificador, não o tema. Uma sonda pinta-se com o token e devolve a
 * cor como o navegador a computa (`rgb(...)`).
 */
async function corDoToken(page: import("@playwright/test").Page, nome: string) {
  return await page.evaluate((propriedade) => {
    const sonda = document.createElement("span")
    sonda.style.color = `var(${propriedade})`
    document.documentElement.append(sonda)
    const cor = getComputedStyle(sonda).color
    sonda.remove()
    return cor
  }, nome)
}

function canais(cor: string): [number, number, number] {
  const achado = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(cor)
  if (!achado) throw new Error(`cor inesperada: ${cor}`)
  return [Number(achado[1]), Number(achado[2]), Number(achado[3])]
}

function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (valor: number) => {
    const v = valor / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

function contraste(um: string, outro: string): number {
  const a = luminancia(canais(um))
  const b = luminancia(canais(outro))
  const maior = Math.max(a, b)
  const menor = Math.min(a, b)
  return (maior + 0.05) / (menor + 0.05)
}

test.describe("tema pelos tokens do protótipo", () => {
  test("claro é o padrão e o sistema manda", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await abrir(page, "/app/inicio")

    expect(await corDoToken(page, "--background")).toContain(CLARO.fundo)
    expect(await corDoToken(page, "--foreground")).toContain(CLARO.tinta)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
      "light",
    )
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", CLARO.barra)
  })

  test("escuro segue o sistema, com os mesmos nomes de token", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await abrir(page, "/app/inicio")

    expect(await corDoToken(page, "--background")).toContain(ESCURO.fundo)
    expect(await corDoToken(page, "--foreground")).toContain(ESCURO.tinta)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
      "dark",
    )
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", ESCURO.barra)
  })

  test("a troca de tema com o app aberto acompanha na hora", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await abrir(page, "/app/inicio")
    expect(await corDoToken(page, "--background")).toContain(CLARO.fundo)

    await page.emulateMedia({ colorScheme: "dark" })
    await expect
      .poll(async () => await corDoToken(page, "--background"), { timeout: 5_000 })
      .toContain(ESCURO.fundo)
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", ESCURO.barra)

    // E volta, sem recarregar: os dois sentidos.
    await page.emulateMedia({ colorScheme: "light" })
    await expect
      .poll(async () => await corDoToken(page, "--background"), { timeout: 5_000 })
      .toContain(CLARO.fundo)
  })

  test("a casca pinta com os tokens: fundo e tinta mudam juntos", async ({ page }) => {
    for (const [esquema, esperado] of [
      ["light", CLARO],
      ["dark", ESCURO],
    ] as const) {
      await page.emulateMedia({ colorScheme: esquema })
      await abrir(page, "/app/inicio")
      const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      const tinta = await page.evaluate(
        () => getComputedStyle(document.querySelector('[data-titulo="topo"]') as Element).color,
      )
      expect(fundo, esquema).toContain(esperado.fundo)
      expect(tinta, esquema).toContain(esperado.tinta)
    }
  })

  test("o texto da casca fica legível nos dois temas", async ({ page }) => {
    for (const esquema of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: esquema })
      await abrir(page, "/app/inicio")
      const medidas = await page.evaluate(() => {
        const ler = (seletor: string) => {
          const elemento = document.querySelector(seletor)
          if (!elemento) throw new Error(`sem ${seletor}`)
          const estilo = getComputedStyle(elemento)
          return { cor: estilo.color, fundo: getComputedStyle(document.body).backgroundColor }
        }
        return {
          titulo: ler('[data-titulo="topo"]'),
          aba: ler('[data-nav="principal"] [data-aba="inicio"]'),
        }
      })
      for (const [onde, par] of Object.entries(medidas)) {
        expect(contraste(par.cor, par.fundo), `${esquema}: ${onde}`).toBeGreaterThanOrEqual(4.5)
      }
      await expect(page.locator(SELETOR_BARRA)).toBeVisible()
      await expect(page.locator(SELETOR_NAVEGACAO)).toBeVisible()
    }
  })
})
