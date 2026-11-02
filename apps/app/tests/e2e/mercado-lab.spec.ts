import { test as testeNormal } from "@playwright/test"
import { expect, test } from "./apoio"

test.describe("bancada de Mercado", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/galeria/mercado")
    await expect(page.getByRole("heading", { name: "Encontre por perto." })).toBeVisible()
    await expect(page.locator("[data-anuncio]")).toHaveCount(4)
  })

  test("a bancada usa fotos reais da demonstração, busca e troca de seção", async ({ page }) => {
    const fotos = page.locator("[data-anuncio] img")
    await expect(fotos).toHaveCount(4)
    for (const foto of await fotos.all()) {
      await foto.scrollIntoViewIfNeeded()
      await expect(foto).toBeVisible()
      await expect
        .poll(() =>
          foto.evaluate(
            (imagem) =>
              imagem instanceof HTMLImageElement && imagem.complete && imagem.naturalWidth > 0,
          ),
        )
        .toBe(true)
    }
    await page.getByRole("heading", { name: "Encontre por perto." }).scrollIntoViewIfNeeded()
    await page.getByRole("textbox", { name: "Buscar anúncios" }).fill("berço")
    await expect(page.locator("[data-anuncio]")).toHaveCount(1)
    await expect(page.getByRole("heading", { name: "Berço com colchão" })).toBeVisible()
    await page.getByRole("textbox", { name: "Buscar anúncios" }).fill("não existe este produto")
    await expect(page.locator("[data-anuncio]")).toHaveCount(0)
    await expect(
      page.getByRole("heading", { name: "Nenhum anúncio com esses filtros" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Limpar busca e filtros" }).click()
    await expect(page.locator("[data-anuncio]")).toHaveCount(4)
    await page.getByRole("radio", { name: "Imóveis" }).click()
    await expect(page.locator("[data-anuncio]")).toHaveCount(2)
  })

  test("filtrar por bairro tem aplicação e descarte na folha móvel", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 1440
    if (largura < 1024) {
      const abrir = page.getByRole("button", { name: /^Filtros/ })
      await abrir.click()
      const folha = page.getByRole("dialog", { name: "Filtrar anúncios" })
      await folha.getByRole("checkbox", { name: /Ponta Negra/ }).check()
      await page.keyboard.press("Escape")
      await expect(folha).not.toBeVisible()
      await expect(abrir).toBeFocused()
      await expect(page.locator("[data-anuncio]")).toHaveCount(4)
      await abrir.click()
      await expect(folha.getByRole("checkbox", { name: /Ponta Negra/ })).not.toBeChecked()
      await folha.getByRole("checkbox", { name: /Ponta Negra/ }).check()
      await folha.getByRole("button", { name: "Ver 1 anúncio", exact: true }).click()
      await expect(folha).not.toBeVisible()
      await expect(abrir).toBeFocused()
    } else {
      await page
        .getByRole("complementary", { name: "Filtros dos anúncios" })
        .getByRole("checkbox", { name: /Ponta Negra/ })
        .check()
    }
    await expect(page.locator("[data-anuncio]")).toHaveCount(1)
    await expect(page.getByRole("heading", { name: "Sofá retrátil seminovo" })).toBeVisible()
  })

  test("a bancada cabe nos dois temas e deixa capturas para avaliação", async ({
    page,
  }, informacoes) => {
    const erros: string[] = []
    page.on("pageerror", (erro) => erros.push(erro.message))
    for (const tema of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
      await page.evaluate(() => document.fonts.ready)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true)
      await page.screenshot({ path: informacoes.outputPath(`mercado-${tema}.png`), fullPage: true })
      if ((page.viewportSize()?.width ?? 1440) < 1024) {
        await page.getByRole("button", { name: /^Filtros/ }).click()
        await expect(page.getByRole("dialog", { name: "Filtrar anúncios" })).toBeVisible()
        await page.screenshot({
          path: informacoes.outputPath(`filtros-${tema}.png`),
          fullPage: true,
        })
        await page.keyboard.press("Escape")
      }
    }
    expect(erros).toEqual([])
  })

  test("salvar é visível e o detalhe devolve o foco ao fechar", async ({ page }) => {
    const salvar = page.getByRole("button", { name: "Salvar: Sofá retrátil seminovo" })
    await salvar.click()
    const salvo = page.getByRole("button", { name: "Remover dos salvos: Sofá retrátil seminovo" })
    await expect(salvo).toHaveAttribute("aria-pressed", "true")
    await salvo.click()
    await expect(salvar).toHaveAttribute("aria-pressed", "false")
    const abrir = page.getByRole("button", { name: "Ver Sofá retrátil seminovo", exact: true })
    await abrir.click()
    const detalhe = page.getByRole("dialog", { name: "Sofá retrátil seminovo" })
    await expect(detalhe).toBeVisible()
    await expect(
      detalhe.getByText("Três lugares, tecido suede cinza", { exact: false }),
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(detalhe).not.toBeVisible()
    await expect(abrir).toBeFocused()
  })
})

testeNormal("a bancada fica fora do build de uso normal", async ({ page }) => {
  await page.goto("/app/galeria/mercado")
  await expect(page.getByRole("heading", { name: "Página indisponível" })).toBeVisible()
  await expect(page.locator('[data-tela="mercado-lab"]')).toHaveCount(0)
})
