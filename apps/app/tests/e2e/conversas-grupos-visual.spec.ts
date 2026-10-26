import { expect, test } from "@playwright/test"

/** Capturas do app real para revisão de composição mobile; não homologam a R72. */
const CENAS = [
  { id: "conversa", rota: "/app/conversa/t1", seletor: "conversa" },
  { id: "grupo-aberto", rota: "/app/grupo/g-pets", seletor: "grupo" },
  { id: "grupo-fechado", rota: "/app/grupo/g-cmm", seletor: "grupo" },
] as const

for (const cena of CENAS) {
  for (const tema of ["light", "dark"] as const) {
    test(`captura mobile ${cena.id} ${tema}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
      await page.goto(cena.rota)
      await expect(page.locator(`[data-tela="${cena.seletor}"]`)).toBeVisible()
      if (cena.id === "conversa") await expect(page.locator('[data-compositor-conversa="sim"]')).toBeVisible()
      else await expect(page.locator('[data-controles-grupo="sim"]')).toBeVisible()
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all(Array.from(document.images).map((img) =>
          img.complete ? Promise.resolve() : img.decode().catch(() => {}),
        ))
      })
      await page.screenshot({
        path: `artifacts/visual-mobile/${testInfo.project.name}-${cena.id}-${tema}.png`,
        animations: "disabled",
      })
      if ((page.viewportSize()?.width ?? 0) < 720) {
        await page.locator("#conteudo").evaluate((el) => { el.scrollTop = el.scrollHeight - el.clientHeight })
        await page.screenshot({
          path: `artifacts/visual-mobile/${testInfo.project.name}-${cena.id}-${tema}-fim.png`,
          animations: "disabled",
        })
      }
    })
  }
}
