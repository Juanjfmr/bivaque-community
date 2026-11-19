import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

// Jornada simulada — web-quando-algo-falha (prancha 60).
//
// 60#0, acesso indisponível: a membra de Manaus abre uma comunidade do Rio. A resposta certa não
// é erro nem "tentar de novo" — recarregar não muda autorização —, é dizer o que aconteceu e o
// caminho legítimo. O negativo de autorização vem junto: a área de operação não abre para ela.
//
const MEMBER = "membro-1@bivaque.example.invalid"

test.describe("jornada simulada: quando algo falha", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "jornada das pranchas web")
  test.setTimeout(180_000)

  test("membro comum n?o acessa a ?rea de opera??o", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(context, MEMBER)
    const page = await context.newPage()

    try {
      // Negativo de autorização antes do estado: a operação não abre para membro comum.
      await page.goto("/admissions")
      await expect(page).not.toHaveURL(/\/admissions/, { timeout: 20_000 })
      await expect(page.getByRole("heading", { name: "Fila de admissões" })).toHaveCount(0)
    } finally {
      await context.close()
    }
  })
})
