import { expect, test } from "@playwright/test"
import { seedSession } from "../helpers/session"

test.describe("EXP-001 falhas", () => {
  test("respostas fora de ordem mantêm o resultado do último filtro", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/app#comunidade")
    let releaseFirst: (() => void) | undefined
    let firstStarted = false
    await page.route("**/rest/v1/rpc/list_indications**", async (route) => {
      const body = route.request().postData() ?? ""
      if (body.includes('"p_mine":false') && !firstStarted) {
        firstStarted = true
        await new Promise<void>((resolve) => {
          releaseFirst = resolve
        })
      }
      await route.continue()
    })
    await page.getByRole("button", { name: "Resolvidas", exact: true }).click()
    await page.getByRole("button", { name: "Minhas", exact: true }).click()
    releaseFirst?.()
    await expect(page.getByRole("button", { name: "Minhas", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(page.getByRole("list", { name: "Perguntas" })).toBeVisible()
  })

  test("sessão expirada renova ou retorna ao login preservando destino e rascunho", async ({
    page,
  }) => {
    await seedSession(page.context())
    await page.goto("/app#comunidade")
    await page.getByRole("button", { name: "Perguntar", exact: true }).click()
    const question = page.getByRole("textbox", { name: "Sua pergunta" })
    await question.fill("Indicação para sessão expirada")
    await page.route("**/auth/v1/user**", (route) =>
      route.fulfill({ status: 401, body: "expired" }),
    )
    await page.route("**/auth/v1/token?grant_type=refresh_token**", (route) =>
      route.fulfill({ status: 400, body: "expired" }),
    )
    await page.getByRole("button", { name: "Publicar pergunta", exact: true }).click()
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/\/(login|app|onboarding)/)
    if (new URL(page.url()).pathname.endsWith("/login"))
      await expect(page).toHaveURL(/next=.*app%23comunidade|redirectTo=.*app%23comunidade/)
    await expect(question).toHaveValue("Indicação para sessão expirada")
  })

  test("duas abas refletem publicação ao voltar o foco ou recarregar", async ({
    page,
    context,
  }) => {
    await seedSession(context)
    await page.goto("/app#comunidade")
    const other = await context.newPage()
    await other.goto("/app#comunidade")
    const title = `EXP-001 duas abas ${Date.now()}`
    await page.getByRole("button", { name: "Perguntar", exact: true }).click()
    await page.getByRole("textbox", { name: "Sua pergunta" }).fill(title)
    await page.getByRole("button", { name: "Publicar pergunta", exact: true }).click()
    await expect(page.getByRole("heading", { name: title })).toBeVisible()
    await other.bringToFront()
    await other.reload()
    // "Para ajudar" mostra só perguntas de outras pessoas (list_indications com p_mine falso);
    // a pergunta que a própria pessoa publicou aparece em Minhas (correção do instrumento, EXP-001).
    await other.getByRole("button", { name: "Minhas", exact: true }).click()
    await expect(
      other
        .getByRole("list", { name: "Perguntas" })
        .getByRole("button", { name: title, exact: true }),
    ).toBeVisible()
  })
})
