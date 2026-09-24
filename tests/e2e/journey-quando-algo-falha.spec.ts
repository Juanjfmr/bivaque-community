import { expect, test } from "@playwright/test"
import { simulateJourney } from "./helpers/journey"
import { signInAs } from "./helpers/session"

// Jornada simulada — web-quando-algo-falha (prancha 60).
//
// 60#0, acesso indisponível: a membra de Manaus abre uma comunidade do Rio. A resposta certa não
// é erro nem "tentar de novo" — recarregar não muda autorização —, é dizer o que aconteceu e o
// caminho legítimo. O negativo de autorização vem junto: a área de operação não abre para ela.
//
// 60#1, falha de conexão e retomada: a rede cai no momento de publicar. O texto precisa ficar, e
// "Tentar novamente" precisa publicar de verdade quando a rede volta — retomada que só limpa a
// mensagem não é retomada.
//
// @stateful: a retomada publica um post na vila da membra.

const MEMBER = "membro-1@bivaque.example.invalid"
const RIO_COMMUNITY = "71000000-0000-4000-8000-000000000002"

test.describe("jornada simulada: quando algo falha", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "jornada das pranchas web")
  test.setTimeout(180_000)

  test("sem acesso, e a publicação sobrevive à queda da rede", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(context, MEMBER)
    const page = await context.newPage()
    const falha = simulateJourney(testInfo, "web-quando-algo-falha")
    const text = `Jornada ${Date.now().toString(36)}: alguém indica eletricista na vila?`

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

      await falha.passo(
        "60-web-estados#1",
        page,
        async () => {
          await page.goto("/community")
          await page.getByRole("button", { name: "Publicar" }).first().click()
          await expect(page).toHaveURL(/\/publicacoes\/nova/)
          const editor = page.locator("[data-composer-form]")
          await expect(editor).toHaveAttribute("data-draft-ready", "true")
          await editor.getByRole("textbox").first().fill(text)

          await page.route("**/rest/v1/posts**", (route) =>
            route.request().method() === "POST"
              ? route.abort("internetdisconnected")
              : route.continue(),
          )
          await page.evaluate(() => {
            Object.defineProperty(window.navigator, "onLine", {
              configurable: true,
              get: () => false,
            })
            window.dispatchEvent(new Event("offline"))
          })
          await editor.getByRole("button", { name: "Publicar" }).click()

          const lost = page.getByRole("alert").filter({ hasText: "Sem conexão" })
          await expect(lost).toBeVisible({ timeout: 20_000 })
          await expect(editor.getByRole("textbox").first()).toHaveValue(text)
          await expect(lost.getByRole("button", { name: "Tentar novamente" })).toBeVisible()
          await expect(lost.getByRole("button", { name: "Tentar novamente" })).toBeDisabled()
          // O runner não fecha um snapshot com o transporte abortado; a rede
          // volta depois da observação, antes do snapshot da jornada.
          await page.evaluate(() => {
            Object.defineProperty(window.navigator, "onLine", {
              configurable: true,
              get: () => true,
            })
            window.dispatchEvent(new Event("online"))
          })
        },
        { persona: "membra" },
      )

      // Retomada: a rede volta e o mesmo texto publica, sem redigitar.
      await page.unroute("**/rest/v1/posts**")
      await page.getByRole("alert").getByRole("button", { name: "Tentar novamente" }).click()
      await expect(page).toHaveURL(/\/community/, { timeout: 20_000 })
      await expect(page.getByRole("article").filter({ hasText: text })).toBeVisible({
        timeout: 20_000,
      })

      falha.concluir()
    } finally {
      await context.close()
    }
  })
})
