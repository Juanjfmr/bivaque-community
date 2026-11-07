import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { semearSessaoDeMembro } from "./entrada-real-ajuda"

// @stateful entra no comando do CI com --workers=1; os projetos percorrem
// 375/768/1440 em série. Cada caso devolve exatamente a preferência inicial.
test.describe("RUN-026 resumo da cidade @stateful", () => {
  test.describe.configure({ mode: "serial" })
  test("escolha grava pelo app e sobrevive ao recarregar nos dois temas", async ({
    page,
    context,
  }, info) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, "dono-vila@bivaque.example.invalid")
    const rota = "/api/app/avisos/preferencias"
    const resposta = await page.request.get(rota)
    expect(resposta.status()).toBe(200)
    const { preferencias: inicial } = await resposta.json()
    const headers = { origin: "http://127.0.0.1:3000", "x-bivaque-app": "bivaque-spa" }
    const frequencias = { off: "Desligado", daily: "Diário", weekly: "Semanal" } as const
    const antes = inicial.resumoCidade as keyof typeof frequencias
    const escolha = antes === "weekly" ? "daily" : "weekly"
    try {
      await page.goto("/app/voce")
      const campo = page.getByRole("combobox", { name: "Resumo da cidade por e-mail" })
      await expect(campo).toContainText(frequencias[antes], { timeout: 30_000 })
      await campo.focus()
      await page.keyboard.press("Enter")
      await page.getByRole("option", { name: frequencias[escolha], exact: true }).click()
      await page.getByRole("button", { name: "Gravar preferências de avisos" }).click()
      await expect(page.getByRole("status")).toContainText("Preferências de aviso salvas.")
      await page.reload()
      await expect(campo).toContainText(frequencias[escolha], { timeout: 30_000 })
      const persistida = await page.request.get(rota)
      expect((await persistida.json()).preferencias.resumoCidade).toBe(escolha)
      const destino = join(process.cwd(), ".visual", "run-026")
      mkdirSync(destino, { recursive: true })
      for (const tema of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
        await campo.scrollIntoViewIfNeeded()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        await page.screenshot({
          path: join(destino, `${info.project.name}-${tema}.png`),
          fullPage: true,
        })
      }
      await campo.click()
      await page.getByRole("option", { name: frequencias[antes], exact: true }).click()
      await page.getByRole("button", { name: "Gravar preferências de avisos" }).click()
      await expect(page.getByRole("status")).toContainText("Preferências de aviso salvas.")
      await page.reload()
      await expect(campo).toContainText(frequencias[antes], { timeout: 30_000 })
    } finally {
      const restaurada = await page.request.patch(rota, { headers, data: inicial })
      expect(restaurada.status()).toBe(200)
    }
  })
})
