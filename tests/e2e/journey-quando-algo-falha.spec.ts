import { expect, test } from "@playwright/test"
import { simulateJourney } from "./helpers/journey"
import { signInAs } from "./helpers/session"

// Jornada simulada — web-quando-algo-falha (prancha 60).
//
// 60#0, acesso indisponível: a membra de Manaus abre uma comunidade do Rio. A resposta certa não
// é erro nem "tentar de novo" — recarregar não muda autorização —, é dizer o que aconteceu e o
// caminho legítimo. O negativo de autorização vem junto: a área de operação não abre para ela.
//
const MEMBER = "membro-1@bivaque.example.invalid"
const RIO_COMMUNITY = "71000000-0000-4000-8000-000000000002"

test.describe("jornada simulada: quando algo falha", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "jornada das pranchas web")
  test.setTimeout(180_000)

  test("sem acesso a uma comunidade de outra cidade", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(context, MEMBER)
    const page = await context.newPage()
    const falha = simulateJourney(testInfo, "web-quando-algo-falha")

    try {
      // Negativo de autorização antes do estado: a operação não abre para membro comum.
      await page.goto("/admissions")
      await expect(page).not.toHaveURL(/\/admissions/, { timeout: 20_000 })
      await expect(page.getByRole("heading", { name: "Fila de admissões" })).toHaveCount(0)

      await falha.passo(
        "60-web-estados#0",
        page,
        async () => {
          await page.goto(`/communities/${RIO_COMMUNITY}`)
          const state = page
            .getByRole("status")
            .filter({ hasText: "Você ainda não tem acesso a esta comunidade." })
          await expect(state).toBeVisible({ timeout: 20_000 })
          // Diz onde a comunidade fica (COMM-CIDADE-ROTULO) e o caminho legítimo.
          await expect(state).toContainText("fica em Rio de Janeiro, RJ")
          await expect(state).not.toContainText("outra cidade")
          await expect(state.getByRole("link", { name: "Trocar de cidade" })).toBeVisible()
          await expect(state.getByRole("button", { name: /Tentar/ })).toHaveCount(0)
        },
        { persona: "membra de outra cidade" },
      )

      falha.concluir()
    } finally {
      await context.close()
    }
  })
})
