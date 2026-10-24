import { expect, test } from "@playwright/test"
import { chooseTestGroup, openComposer, TEST_GROUP_FEED_URL } from "./helpers/composer"
import { simulateJourney } from "./helpers/journey"
import { signInAs } from "./helpers/session"

// Jornada simulada — web-quando-algo-falha (prancha 60).
//
// 60#0, endereço de vila: a membra de Manaus abre o endereço de uma comunidade
// de outra cidade. Vila não existe nesta versão (ADR-20261023-comunidade-do-
// prototipo): o endereço antigo não abre uma tela de negação — ele redireciona
// para a Comunidade da cidade. O negativo de autorização da operação continua
// vindo antes, e não muda com isto.
//
// 60#1, falha de conexão e retomada: a rede cai no momento de publicar. O texto precisa ficar, e
// "Tentar novamente" precisa publicar de verdade quando a rede volta — retomada que só limpa a
// mensagem não é retomada.
//
// @stateful: a retomada publica um post no grupo da membra (lote 5 N2:
// publicar só existe dentro de um grupo, ADR-20261023).

const MEMBER = "membro-1@bivaque.example.invalid"
const RIO_COMMUNITY = "71000000-0000-4000-8000-000000000002"
// O feed onde a publicação aparece: o do grupo escolhido no compositor.
const GROUP_FEED_URL = TEST_GROUP_FEED_URL

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
          // O endereço antigo de uma vila de outra cidade deixa de existir como
          // tela: cai na Comunidade da cidade.
          await page.goto(`/communities/${RIO_COMMUNITY}`)
          await expect(page).toHaveURL(/\/community$/, { timeout: 20_000 })
        },
        { persona: "membra de outra cidade" },
      )

      await falha.passo(
        "60-web-estados#1",
        page,
        async () => {
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
          await expect(lost.getByRole("button", { name: "Tentar novamente" })).toBeVisible()
        },
        { persona: "membra" },
      )

      // Retomada: a rede volta e o mesmo texto publica, sem redigitar.
      await page.unroute("**/rest/v1/posts**")
      await page
        .getByRole("dialog")
        .getByRole("alert")
        .getByRole("button", { name: "Tentar novamente" })
        .click()
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 })
      // O feed onde ela aparece: a publicação vai para o grupo escolhido no
      // compositor, e o feed do grupo é a página do grupo.
      await page.goto(GROUP_FEED_URL, { waitUntil: "load" })
      await expect(page.getByRole("article").filter({ hasText: text })).toBeVisible({
        timeout: 25_000,
      })

      falha.concluir()
    } finally {
      await context.close()
    }
  })
})
