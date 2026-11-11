import { expect, test } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

test.describe("F02 — início e busca reais", { tag: "@stateful" }, () => {
  test("mostra a cidade da sessão e busca conteúdo semeado", async ({ page, context }) => {
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    const inicio = page.waitForResponse((resposta) => resposta.url().endsWith("/api/app/inicio"))
    await page.goto("/inicio")
    await expect(page).toHaveURL(/\/app\/inicio$/)
    const resposta = await inicio
    expect(resposta.status()).toBe(200)
    expect((await resposta.json()) as { cidade: string }).toMatchObject({ cidade: "Manaus" })
    await expect(page.getByRole("heading", { name: "O que você precisa em Manaus?" })).toBeVisible()
    await expect(page.getByText("Piquenique das famílias")).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: "Buscar no Bivaque" }).click()
    const campo = page.getByRole("searchbox", { name: "Buscar no Bivaque" })
    await expect(page.getByText("Explorar em Manaus")).toBeVisible({ timeout: 30_000 })
    await campo.fill("a")
    await expect(page.getByText("Explorar em Manaus")).toBeVisible()
    await campo.fill("pediatra")
    const resultado = page.getByRole("button", {
      name: /Alguém indica pediatra que atenda pelo FuSEx/,
    })
    await expect(resultado).toBeVisible({ timeout: 30_000 })
    await resultado.click()
    await expect(page).toHaveURL(/\/app\/pergunta\/80000000-0000-4000-8000-000000000f01/)
  })

  test("nega leitura sem sessão", async ({ request }) => {
    expect((await request.get("/api/app/inicio")).status()).toBe(401)
    expect((await request.get("/api/app/busca?q=escola")).status()).toBe(401)
  })

  test("presença gravada sobrevive ao recarregar", async ({ page, context }) => {
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/inicio")
    const encontro = page.locator('[data-tela="inicio"] [data-linha="lista"]', {
      hasText: "Piquenique das famílias",
    })
    await expect(encontro).toBeEnabled({ timeout: 30_000 })
    if ((await encontro.getAttribute("aria-pressed")) === "true") {
      await encontro.click()
      await expect(encontro).toHaveAttribute("aria-pressed", "false")
    }
    await encontro.click()
    await expect(encontro).toHaveAttribute("aria-pressed", "true")
    await page.reload()
    await expect(encontro).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 })
  })

  test("servidor fora mostra erro e permite tentar novamente", async ({ page, context }) => {
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.route("**/api/app/inicio", (rota) => rota.abort())
    await page.goto("/app/inicio")
    await expect(page.locator('[data-estado="erro"]')).toBeVisible({ timeout: 30_000 })
    await page.unroute("**/api/app/inicio")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.getByText("Piquenique das famílias")).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: "Buscar no Bivaque" }).click()
    await page.route("**/api/app/busca?*", (rota) => rota.abort())
    await page.getByRole("searchbox", { name: "Buscar no Bivaque" }).fill("pediatra")
    await expect(page.locator('[data-estado="erro"]')).toBeVisible({ timeout: 30_000 })
    await page.unroute("**/api/app/busca?*")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.getByText("Alguém indica pediatra que atenda pelo FuSEx?")).toBeVisible({
      timeout: 30_000,
    })
  })
})
