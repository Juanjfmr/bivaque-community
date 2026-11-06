import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("onboarding: verified holder and invited family", () => {
  test("consent page shows terms and accept button", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/consent")

    // "Bem-vindo ao Bivaque" nunca existiu nesta página — achado ao realinhar
    // este spec contra o /consent de verdade. PORT-003: o título e a linha do
    // aceite são os do passo "Aceite" do protótipo
    // (`renderEntryGoogleConsent`), com os dois documentos como links.
    await expect(page.getByRole("heading", { name: "Antes de entrar, as regras." })).toBeVisible()
    await expect(page.getByText("Passo 1 de 3 · Conta")).toBeVisible()
    await expect(page.getByRole("link", { name: "Política de privacidade" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Código de conduta" })).toBeVisible()

    const acceptButton = page.getByRole("button", { name: "Concordar e continuar" })
    await expect(acceptButton).toBeVisible()

    // Negativa: sem marcar, a tela explica em vez de registrar.
    await acceptButton.click()
    await expect(page.locator("#en-err")).toContainText("aceite a Política de privacidade")

    const consentCheckbox = page.getByRole("checkbox", { name: /Li e aceito a/ })
    await consentCheckbox.focus()
    await page.keyboard.press("Space")
    await expect(consentCheckbox).toBeChecked()
    await acceptButton.click()

    // Accepting stores the consent and proceeds to the entry. The web's
    // /onboarding now redirects to /app/entrar (ENTRADA-WEB-ANTIGA).
    await page.waitForURL(/\/app\/entrar/)
  })

  test("root serves the public landing when not authenticated", async ({ page }) => {
    await page.goto("/")

    // The root is a public marketing landing; it does not redirect to /login.
    // PORT-001 (R73): a landing v8 usa "Juntos somos mais fortes."; a raiz
    // pública e a ausência de redirecionamento continuam sendo o contrato.
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText("Juntos somos mais fortes.").first()).toBeVisible()
  })
})
