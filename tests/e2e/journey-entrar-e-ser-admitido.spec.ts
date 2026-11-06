import { expect, test } from "@playwright/test"
import { simulateJourney } from "./helpers/journey"
import { signInAs } from "./helpers/session"

// Jornada simulada do operador — web-operar-admissoes (prancha 57).
//
// A entrada da pessoa (pranchas 36–39: conta, CPF, documento, cidade e boas-vindas) saiu da web
// com a ENTRADA-WEB-ANTIGA: as telas /login, /onboarding/* e afins redirecionam para /app/entrar.
// Essa jornada é coberta pelo app em tests/e2e/f01-entrada-real.spec.ts.
//
// O teste aqui só analisa uma solicitação da fila sem decidir, porque decidir mudaria a fila que
// outros specs leem.
//
// @stateful: usa a conta do operador no Auth local.

const OPERATOR = "operador@bivaque.example.invalid"

test.describe("jornada simulada: entrar e ser admitido", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "jornada das pranchas web")
  test.setTimeout(180_000)

  test("operador abre e analisa uma solicitação da fila", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(context, OPERATOR)
    const page = await context.newPage()
    const operar = simulateJourney(testInfo, "web-operar-admissoes")

    try {
      await operar.passo(
        "57-web-operacao-admissoes#0",
        page,
        async () => {
          await page.goto("/admissions")
          await expect(
            page.getByRole("heading", { level: 1, name: "Fila de admissões" }),
          ).toBeVisible({ timeout: 20_000 })
          await expect(page.getByRole("table", { name: /Solicitações de admissão/ })).toBeVisible()
          await expect(
            page.getByRole("row").filter({ hasText: "Em análise" }).first(),
          ).toBeVisible()
        },
        { persona: "operador" },
      )

      await operar.passo(
        "57-web-operacao-admissoes#1",
        page,
        async () => {
          await page
            .getByRole("row")
            .filter({ hasText: "Em análise" })
            .first()
            .getByRole("link", { name: "Abrir" })
            .click()
          await expect(page).toHaveURL(/\/admissions\/[0-9a-f-]+/)
          await expect(page.getByRole("region", { name: "Resumo da verificação" })).toBeVisible({
            timeout: 20_000,
          })
          await expect(page.getByRole("region", { name: "Ações" })).toBeVisible()
          await expect(page.getByRole("region", { name: "Linha do tempo" })).toBeVisible()
          // Prancha 57: só o necessário ao operador — nenhum CPF na tela de análise.
          await expect(page.getByText(/\d{3}\.\d{3}\.\d{3}-\d{2}/)).toHaveCount(0)
        },
        { persona: "operador" },
      )

      operar.concluir()
    } finally {
      await context.close()
    }
  })
})
