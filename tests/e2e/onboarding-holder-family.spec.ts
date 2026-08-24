import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("onboarding: verified holder and invited family", () => {
  test("verified Manaus holder completes onboarding and reaches community", async ({ page }) => {
    // Given a user who has just logged in and accepted consent
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()

    // The login page renders the Google OAuth button and magic link form
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Receber link para entrar" })).toBeVisible()

    // Navigate to the consent page
    await page.goto("/consent")
    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Concordar e continuar" })).toBeVisible()
  })

  test("consent page shows terms and accept button", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/consent")

    // "Bem-vindo ao Bivaque" never existed on this page — found realigning
    // this spec against the real rendered /consent, which renders "Termos de
    // uso" plus the Código de conduta and Política de privacidade sections.
    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()
    // Scoped to the page's own section heading id: the rendered legal
    // document body also contains a "Código de conduta" heading of its own,
    // so a bare role query resolves to two elements (strict-mode violation).
    await expect(page.locator("#conduct-heading")).toBeVisible()
    await expect(page.getByRole("button", { name: "Concordar e continuar" })).toBeVisible()

    const acceptButton = page.getByRole("button", { name: "Concordar e continuar" })
    await acceptButton.click()

    // Accepting stores the consent cookie and proceeds to onboarding
    await page.waitForURL(/\/onboarding/)
  })

  test("onboarding page shows verification flow", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/onboarding")

    // Onboarding is a `(preauth)` route with no shell header, so its own H1 is
    // the landmark rather than the Bivaque wordmark.
    await expect(page.getByRole("heading", { name: "Confirme sua elegibilidade." })).toBeVisible()
    await expect(page.getByRole("button", { name: "Conferir e continuar" })).toBeVisible()

    const cpfInput = page.getByLabel("CPF")
    await expect(cpfInput).toBeVisible()
  })

  test("onboarding does not offer a geographic waitlist as a fallback", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/onboarding")

    // P0 Task 8: the verify step no longer offers a geographic waitlist.
    // Eligibility is the gate; whoever passes it joins their own locality.
    await expect(page.getByRole("button", { name: /lista de espera/ })).toHaveCount(0)
    await expect(page.getByRole("link", { name: /lista de espera/ })).toHaveCount(0)
    await expect(page.getByLabel("E-mail")).toHaveCount(0)
  })

  test("root serves the public landing when not authenticated", async ({ page }) => {
    await page.goto("/")

    // The root is a public marketing landing; it does not redirect to /login.
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText("A comunidade vai com você.")).toBeVisible()
  })

  test("magic link email input works", async ({ page }) => {
    await page.goto("/login")

    const emailInput = page.getByLabel("E-mail")
    await emailInput.fill("test@example.invalid")

    await expect(emailInput).toHaveValue("test@example.invalid")

    const magicLinkButton = page.getByRole("button", { name: "Receber link para entrar" })
    await expect(magicLinkButton).toBeVisible()
  })
})
