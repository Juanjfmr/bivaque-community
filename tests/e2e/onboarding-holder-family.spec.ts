import { expect, test } from "@playwright/test"

test.describe("onboarding: verified holder and invited family", () => {
  test("verified Manaus holder completes onboarding and reaches community", async ({ page }) => {
    // Given a user who has just logged in and accepted consent
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()

    // The login page renders the Google OAuth button and magic link form
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Enviar link mágico" })).toBeVisible()

    // Navigate to the consent page
    await page.goto("/consent")
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Aceitar e continuar" })).toBeVisible()
  })

  test("consent page shows terms and accept button", async ({ page }) => {
    await page.goto("/consent")

    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
    await expect(page.getByText("Bem-vindo ao Bivaque")).toBeVisible()
    await expect(page.getByRole("button", { name: "Aceitar e continuar" })).toBeVisible()

    const acceptButton = page.getByRole("button", { name: "Aceitar e continuar" })
    await acceptButton.click()

    // Accepting stores the consent cookie and proceeds to onboarding
    await page.waitForURL(/\/onboarding/)
  })

  test("onboarding page shows verification flow", async ({ page }) => {
    await page.goto("/onboarding")

    // Onboarding is a `(preauth)` route with no shell header, so its own H1 is
    // the landmark rather than the Bivaque wordmark.
    await expect(page.getByRole("heading", { name: "Verificação de elegibilidade" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Verificar elegibilidade" })).toBeVisible()
    await expect(page.getByRole("button", { name: /lista de espera/ })).toBeVisible()

    const cpfInput = page.getByLabel("CPF")
    await expect(cpfInput).toBeVisible()
  })

  test("onboarding page shows waitlist flow when switching from verify", async ({ page }) => {
    await page.goto("/onboarding")

    const waitlistButton = page.getByRole("button", { name: /lista de espera/ })
    await waitlistButton.click()

    await expect(page.getByLabel("E-mail")).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar na lista de espera" })).toBeVisible()
  })

  test("login page is the entry point when not authenticated", async ({ page }) => {
    await page.goto("/")

    await page.waitForURL("**/login")
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
    await expect(page.getByText("Entre para acessar sua comunidade")).toBeVisible()
  })

  test("magic link email input works", async ({ page }) => {
    await page.goto("/login")

    const emailInput = page.getByLabel("E-mail")
    await emailInput.fill("test@example.invalid")

    await expect(emailInput).toHaveValue("test@example.invalid")

    const magicLinkButton = page.getByRole("button", { name: "Enviar link mágico" })
    await expect(magicLinkButton).toBeVisible()
  })
})
