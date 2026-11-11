import { mkdirSync } from "node:fs"
import { expect, test } from "@playwright/test"

const VARIANTES = [
  { valor: "a", composicao: "exploracao" },
  { valor: "b", composicao: "busca" },
] as const

const TEMAS = ["light", "dark"] as const

for (const tema of TEMAS) {
  for (const variante of VARIANTES) {
    test(`F02 vNext / ${tema} / ${variante.valor}: captura e responsividade`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema })
      await page.goto(`/app/previa/vnext?v=${variante.valor}`)

      await expect(page.locator('[data-laboratorio="design-vnext-f02"]')).toBeVisible()
      await expect(page.locator(`[data-composicao="${variante.composicao}"]`)).toBeVisible()
      await expect(page.getByRole("searchbox", { name: "Buscar exemplos na cidade" })).toBeVisible()
      await expect(page.getByText("BIVAQUE · F02 · DADOS SIMULADOS")).toBeVisible()

      const medidas = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(
        medidas.scrollWidth,
        `rolagem horizontal de página em ${test.info().project.name}`,
      ).toBeLessThanOrEqual(medidas.clientWidth + 1)

      mkdirSync("artifacts/visual-vnext", { recursive: true })
      await page.screenshot({
        path: `artifacts/visual-vnext/${test.info().project.name}-${tema}-${variante.valor}.png`,
        fullPage: true,
        animations: "disabled",
      })
    })
  }
}

test("F02 vNext: A e B preservam a mesma busca e os mesmos filtros", async ({ page }) => {
  await page.goto("/app/previa/vnext?v=a")
  await page.getByRole("searchbox", { name: "Buscar exemplos na cidade" }).fill("MUDANÇA")
  await expect(page.locator(".pv-rail-card")).toHaveCount(1)

  await page.getByRole("button", { name: "B · Buscar" }).click()
  await expect(page.locator('[data-composicao="busca"]')).toBeVisible()
  await expect(page.locator(".pv-b-resultados .pc-linha")).toHaveCount(1)
  await expect(page.getByText("Mudanças e transporte")).toBeVisible()

  await page.getByRole("button", { name: "Ver contexto: Mudanças e transporte" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(
    page.getByText("O item é fictício e não tem destino no aplicativo real."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Fechar detalhe" }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
})

test("F02 vNext: carregamento, vazio e erro não são confundidos", async ({ page }) => {
  await page.goto("/app/previa/vnext?v=b")
  await page.getByText("Testar estados", { exact: true }).click()
  const seletor = page.getByLabel("Conjunto de dados")

  await seletor.selectOption("vazio")
  await expect(page.locator(".pv-vazio")).toBeVisible()

  await seletor.selectOption("carregando")
  await expect(page.getByText("Carregando exemplos")).toBeVisible()
  await expect(page.locator(".pc-esqueleto")).toHaveCount(3)

  await seletor.selectOption("erro")
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar")
  await expect(page.locator(".pv-vazio")).toHaveCount(0)

  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(page.locator(".pv-b-resultados .pc-linha")).toHaveCount(8)
})

test("F02 vNext: cenário escasso usa as mesmas fixtures nas duas composições", async ({ page }) => {
  await page.goto("/app/previa/vnext?v=a")
  await page.getByText("Testar estados", { exact: true }).click()
  await page.getByLabel("Conjunto de dados").selectOption("escasso")
  await expect(page.locator('[data-composicao="exploracao"]')).toBeVisible()
  await expect(page.getByText("Como escolher uma escola ao chegar a Manaus?")).toBeVisible()
  await expect(page.getByText("Reparos e manutenção residencial")).toBeVisible()
  await page.getByRole("button", { name: "B · Buscar" }).click()
  await expect(page.locator(".pv-b-resultados .pc-linha")).toHaveCount(2)
})

test("F02 vNext: comparação mantém alternativas e rótulos distintos", async ({ page }) => {
  await page.goto("/app/previa/vnext?v=comparar")
  await expect(page.locator('[data-composicao="exploracao"]')).toBeVisible()
  await expect(page.locator('[data-composicao="busca"]')).toBeVisible()
  await expect(page.getByText("BIVAQUE · F02 · DADOS SIMULADOS")).toBeVisible()
  await expect(page.getByRole("button", { name: "A · Explorar" })).toBeVisible()
  await expect(page.getByRole("button", { name: "B · Buscar" })).toBeVisible()
})
