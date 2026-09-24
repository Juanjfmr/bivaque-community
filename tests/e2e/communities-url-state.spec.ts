import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

const MEMBER_EMAIL = "membro-1@bivaque.example.invalid"

test.describe("continuidade de navegação das comunidades", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "fluxo de URL desktop")

  test("aba, busca e back/forward permanecem sincronizados com a URL", async ({ page }) => {
    await signInAs(page.context(), MEMBER_EMAIL)
    await page.goto("/communities?aba=minhas", { waitUntil: "load" })
    await expect(page.getByRole("heading", { name: "Comunidades" })).toBeVisible()

    await page.getByRole("tab", { name: "Descobrir" }).click()
    await expect(page).toHaveURL(/aba=descobrir/)
    await page.getByLabel("Buscar comunidades").fill("ajuricaba")
    await expect(page).toHaveURL(/q=ajuricaba/)
    const discoverSearch = new URL(page.url()).search
    expect(discoverSearch).toContain("aba=descobrir")
    expect(discoverSearch).toContain("q=ajuricaba")

    await page.getByRole("tab", { name: "Minhas comunidades" }).click()
    await expect(page).not.toHaveURL(/aba=descobrir/)
    await page.goBack()
    await expect.poll(() => new URL(page.url()).search).toBe(discoverSearch)
    await expect(page.getByRole("tab", { name: "Descobrir" })).toHaveAttribute(
      "aria-selected",
      "true",
    )

    await page.goForward()
    await expect(page).not.toHaveURL(/aba=descobrir/)
    await expect(page.getByRole("tab", { name: "Minhas comunidades" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  test("remove uma comunidade inválida da URL em vez de exibir painel fantasma", async ({
    page,
  }) => {
    await signInAs(page.context(), MEMBER_EMAIL)
    await page.goto("/communities?aba=descobrir&comunidade=invalida", { waitUntil: "load" })
    await expect(page.getByRole("heading", { name: "Comunidades" })).toBeVisible()
    await expect.poll(() => new URL(page.url()).searchParams.get("comunidade")).toBeNull()
  })
})
