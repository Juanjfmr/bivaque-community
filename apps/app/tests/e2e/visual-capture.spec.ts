import { expect, test } from "@playwright/test"

// Evidência visual do app real, nunca da TelaDeProva. Capturas não homologam
// equivalência com o HTML R72: são material para comparação independente.
const TELAS = [
  { caminho: "/app/inicio", id: "inicio" },
  { caminho: "/app/busca", id: "busca" },
  { caminho: "/app/comunidade", id: "comunidade" },
  { caminho: "/app/imoveis", id: "imoveis" },
] as const

for (const tela of TELAS) {
  for (const esquema of ["light", "dark"] as const) {
    test(`captura real ${tela.id} — ${esquema}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: esquema, reducedMotion: "reduce" })
      await page.goto(tela.caminho)
      await expect(page.locator(`[data-tela="${tela.id}"]`)).toBeVisible()
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all(
          Array.from(document.images).map((imagem) =>
            imagem.complete ? Promise.resolve() : imagem.decode().catch(() => {}),
          ),
        )
      })
      await page.screenshot({
        path: `artifacts/visual/${testInfo.project.name}-${tela.id}-${esquema}.png`,
        fullPage: true,
        animations: "disabled",
      })
    })
  }
}
