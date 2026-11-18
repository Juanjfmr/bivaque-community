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
    await expect(page.getByRole("heading", { name: "Sua rede em Manaus" })).toBeVisible()
    await expect(page.getByText("Piquenique das famílias")).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-acao="busca"]').first().click()
    const campo = page.locator('[data-campo="busca"]')
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

  test("não mostra entrada pendente na busca", async ({ page, context }) => {
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    // O nome só existe na entrada `pending` do Guia (supabase/seed.sql, status na
    // linha do item a0…005); outras fontes podem casar "Militar", então a tela
    // pode mostrar resultados ou o vazio — em nenhum dos dois a entrada pendente.
    const busca = page.waitForResponse((resposta) => resposta.url().includes("/api/app/busca?"))
    await page.goto("/app/busca?q=Acolhimento%20Militar")
    const resposta = await busca
    expect(resposta.status()).toBe(200)
    expect(await resposta.text()).not.toContain("Escola de Acolhimento Militar")
    await expect(
      page.getByText(/Nada sobre “Acolhimento Militar”|\d+ resultados? em Manaus/).first(),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Escola de Acolhimento Militar")).toHaveCount(0)
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
    await page.locator('[data-acao="busca"]').first().click()
    await page.route("**/api/app/busca?*", (rota) => rota.abort())
    await page.locator('[data-campo="busca"]').fill("pediatra")
    await expect(page.locator('[data-estado="erro"]')).toBeVisible({ timeout: 30_000 })
    await page.unroute("**/api/app/busca?*")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.getByText("Alguém indica pediatra que atenda pelo FuSEx?")).toBeVisible({
      timeout: 30_000,
    })
  })
})
