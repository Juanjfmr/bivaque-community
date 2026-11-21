import { expect, test } from "@playwright/test"
import { chooseTestGroup, openComposer, TEST_GROUP_ID } from "./helpers/composer"
import { signInAs } from "./helpers/session"

// Jornada simulada — web-quando-algo-falha (prancha 60).
//
// O negativo de autorização garante que a área de operação não abre para membro comum.
//
const MEMBER = "membro-1@bivaque.example.invalid"

test.describe("jornada simulada: quando algo falha", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "jornada das pranchas web")
  test.setTimeout(180_000)

  test("membro comum não acessa a área de operação", async ({ browser }) => {
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

  test("a publicação sobrevive à queda da rede e publica ao tentar novamente", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(context, MEMBER)
    const page = await context.newPage()
    const text = `Jornada ${Date.now().toString(36)}: alguém indica eletricista na vila?`

    try {
      await openComposer(page)
      const editor = page.getByRole("dialog")
      await chooseTestGroup(editor)
      await editor.getByRole("textbox").first().fill(text)
      await page.route("**/rest/v1/posts**", (route) =>
        route.request().method() === "POST"
          ? route.abort("internetdisconnected")
          : route.continue(),
      )
      await editor.getByRole("button", { name: "Publicar" }).click()
      const lost = editor.getByRole("alert").filter({ hasText: "Sem conexão" })
      await expect(lost).toBeVisible({ timeout: 20_000 })
      await expect(editor.getByRole("textbox").first()).toHaveValue(text)
      await page.unroute("**/rest/v1/posts**")
      await lost.getByRole("button", { name: "Tentar novamente" }).click()
      await expect(editor).toBeHidden({ timeout: 20_000 })
      await page.goto(`/app/grupo/${TEST_GROUP_ID}`, { waitUntil: "load" })
      await expect(page.getByRole("article").filter({ hasText: text })).toBeVisible({
        timeout: 25_000,
      })
    } finally {
      await context.close()
    }
  })
})
