import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

const CONVERSA = "41000000-0000-4000-8000-000000000051"
const CONVERSA_ALHEIA = "41000000-0000-4000-8000-000000000023"
const CAPTURAS = join(process.cwd(), ".visual", "run-011")

async function capturar(page: Page, projeto: string, tela: string) {
  mkdirSync(CAPTURAS, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: join(CAPTURAS, `${projeto}-${tela}-${tema}.png`),
      fullPage: true,
      animations: "disabled",
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
}

test.describe("F09 — conversas reais", { tag: "@stateful" }, () => {
  test("caixa, conversa e resposta persistida; outra conversa é negada", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/messages")
    await expect(page).toHaveURL(/\/app\/conversas$/)
    const linha = page.locator(`[data-thread="${CONVERSA}"]`)
    await expect(linha).toBeVisible({ timeout: 30_000 })
    await capturar(page, testInfo.project.name, "caixa")
    await linha.getByRole("button").first().click()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText("Confirmado, 9h")
    const texto = `Resposta F09 ${testInfo.project.name} ${Date.now()}`
    await page.getByLabel("Mensagem", { exact: true }).fill(texto)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText(texto)
    await page.reload()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText(texto, {
      timeout: 30_000,
    })
    await capturar(page, testInfo.project.name, "conversa")
    const leitura = await page.request.get(`/api/app/conversas/${CONVERSA_ALHEIA}`)
    expect(leitura.status()).toBe(404)
    const escrita = await page.request.post(`/api/app/conversas/${CONVERSA_ALHEIA}/mensagens`, {
      headers: { origin: new URL(page.url()).origin, "x-bivaque-app": "bivaque-spa" },
      data: { texto: "Não deve ser gravada" },
    })
    expect(escrita.status()).toBe(404)
  })

  test("falha de envio conserva texto; falha de leitura oferece nova tentativa", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto(`/app/conversa/${CONVERSA}`)
    await expect(page.getByLabel("Mensagem", { exact: true })).toBeVisible({ timeout: 30_000 })
    await page.route("**/api/app/conversas/*/mensagens", (rota) => rota.abort())
    const texto = `Texto preservado ${testInfo.project.name} ${Date.now()}`
    await page.getByLabel("Mensagem", { exact: true }).fill(texto)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("Seu texto foi mantido")
    await expect(page.getByLabel("Mensagem", { exact: true })).toHaveValue(texto)
    await expect(page.locator('[data-mensagens="historico"]')).not.toContainText(texto)
    await page.unroute("**/api/app/conversas/*/mensagens")
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText(texto)
    await page.route("**/api/app/conversas", (rota) => rota.abort())
    await page.goto("/app/conversas")
    await expect(page.locator('[data-estado="erro"]')).toBeVisible()
    await expect(page.getByText("Nenhuma conversa ainda")).toHaveCount(0)
    await page.unroute("**/api/app/conversas")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.locator(`[data-thread="${CONVERSA}"]`)).toBeVisible()
  })
})
