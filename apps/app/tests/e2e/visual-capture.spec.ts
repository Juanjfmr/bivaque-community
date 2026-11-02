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

      // O app rola dentro de #conteudo, não do document: fullPage sozinho só
      // mostra a primeira dobra. Fotografa também meio/fim dos telefones.
      if ((page.viewportSize()?.width ?? 0) < 720) {
        const conteudo = page.locator("#conteudo")
        for (const posicao of ["meio", "fim"] as const) {
          await conteudo.evaluate((elemento, ponto) => {
            const limite = Math.max(0, elemento.scrollHeight - elemento.clientHeight)
            elemento.scrollTop = ponto === "meio" ? Math.round(limite / 2) : limite
          }, posicao)
          await page.screenshot({
            path: `artifacts/visual/${testInfo.project.name}-${tela.id}-${esquema}-${posicao}.png`,
            animations: "disabled",
          })
        }
      }
    })
  }
}
