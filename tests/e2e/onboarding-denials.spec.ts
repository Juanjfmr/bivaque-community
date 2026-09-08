import { expect, test } from "@playwright/test"

test.describe("onboarding: denial paths", () => {
  test("user without consent is redirected to consent from protected routes", async ({ page }) => {
    await page.goto("/community")
    await page.waitForURL(/\/consent/)

    await page.goto("/groups")
    await page.waitForURL(/\/consent/)
  })

  test("protected routes redirect to consent when consent is missing", async ({ page }) => {
    const protectedRoutes = ["/community", "/groups", "/events", "/profile"]

    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForURL(/\/consent/)
    }
  })

  test("direct route to community without consent redirects to consent", async ({ page }) => {
    await page.goto("/community")
    const finalUrl = page.url()

    expect(finalUrl.includes("/consent")).toBeTruthy()
  })

  test("unverified user cannot bypass to community without consent", async ({ page }) => {
    await page.goto("/community")

    await page.waitForURL(/\/consent/)
    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()
  })

  // Realignado em 2026-09-07 com razão explícita: heading e copy de magic link
  // pertenciam à tela anterior; ADR-20260907-login-com-senha tirou o link da
  // tela e a prancha 36-web-auth-entrada deu o título atual. O que continua
  // travado é o contrato desta tarefa: a página abre sem autenticação e oferece
  // o formulário de entrada com e-mail e senha.
  test("login page is accessible without auth", async ({ page }) => {
    const response = await page.goto("/login")
    expect(response?.ok()).toBeTruthy()

    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
    await expect(page.getByLabel("E-mail")).toBeVisible()
    // exact: o botão "Mostrar senha" também contém "senha" no aria-label.
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible()
  })

  test("consent page is accessible without auth", async ({ page }) => {
    const response = await page.goto("/consent")
    expect(response?.ok()).toBeTruthy()

    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()
  })

  test("onboarding without consent redirects to the consent gate", async ({ page }) => {
    await page.goto("/onboarding")
    await page.waitForURL(/\/consent/)
  })

  test("health endpoint is always accessible", async ({ request }) => {
    const response = await request.get("/api/health")
    await expect(response).toBeOK()
    expect(await response.text()).toBe('{"status":"ok"}')
  })

  test("API onboarding endpoint requires auth", async ({ request }) => {
    const response = await request.post("/api/onboarding", {
      data: { action: "verify-cpf", cpf: "00000000000" },
    })
    expect(response.status()).toBe(401)
  })

  test("API onboarding endpoint rejects missing action", async ({ request }) => {
    const response = await request.post("/api/onboarding", {
      headers: { Authorization: "Bearer invalid-token" },
      data: {},
    })
    expect(response.status()).toBe(401)
  })
})
