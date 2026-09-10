import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("onboarding: verified holder and invited family", () => {
  test("verified Manaus holder completes onboarding and reaches community", async ({ page }) => {
    // Given a user who has just logged in and accepted consent
    await page.goto("/login")
    // Contrato atualizado em 2026-09-07 com razão explícita: o heading
    // "Bivaque" e o botão de magic link pertenciam à tela anterior;
    // ADR-20260907-login-com-senha tirou o link da tela e a prancha 36 deu o
    // título atual. Marca segue coberta pelo link de retorno ao início.
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Bivaque, voltar ao início" }).first(),
    ).toBeVisible()

    // The login page renders the password form and the Google OAuth button
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()

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
    await expect(page.locator("#documents-heading")).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Ler a Política de privacidade completa" }),
    ).toBeVisible()

    const acceptButton = page.getByRole("button", { name: "Concordar e continuar" })
    await expect(acceptButton).toBeVisible()
    await expect(acceptButton).toBeDisabled()

    const consentCheckbox = page.getByRole("checkbox", { name: /Li e concordo com a/ })
    await consentCheckbox.focus()
    await page.keyboard.press("Space")
    await expect(consentCheckbox).toBeChecked()
    await expect(acceptButton).toBeEnabled()
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

  // Renomeado e reescrito em 2026-09-07 com razão explícita: o envio por link
  // saiu da tela (ADR-20260907-login-com-senha). O que este teste ainda prova:
  // os campos de entrada aceitam texto e o submit do formulário de senha está
  // presente — a interação fechada da prancha 36.
  test("email and password inputs work and submit is present", async ({ page }) => {
    await page.goto("/login")

    const emailInput = page.getByLabel("E-mail")
    await emailInput.fill("test@example.invalid")
    await expect(emailInput).toHaveValue("test@example.invalid")

    // exact: o botão "Mostrar senha" também contém "senha" no aria-label e
    // casaria em matching parcial.
    const passwordInput = page.getByLabel("Senha", { exact: true })
    await passwordInput.fill("senha-de-teste-123")
    await expect(passwordInput).toHaveValue("senha-de-teste-123")

    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
  })
})
