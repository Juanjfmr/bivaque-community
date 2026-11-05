import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

// PORT-003 (frente A do lote 4) — o passo Aceite do Google, que segue em /consent.
//
// Criar conta, entrar, recuperar, senha nova e "Você já começou" eram telas da
// web: saíram com a ENTRADA-WEB-ANTIGA (/login, /signup etc. → /app/entrar), e a
// entrada passou a ser provada no app pelo F01 (tests/e2e/f01-entrada-real.spec.ts).
//
// `verified-no-membership@` é a persona semeada que está no meio do funil de
// membro: verificada, sem localidade e sem perfil. É a sessão injetada no passo
// Aceite com conta.

const NO_MEMBERSHIP = "verified-no-membership@bivaque.example.invalid"

test.describe("passo Aceite, do Google", () => {
  test("sem sessão diz o que falta em vez de oferecer um botão que falha", async ({ page }) => {
    await page.goto("/consent")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Antes de entrar, as regras.")
    await expect(page.getByText("Entre na sua conta para registrar o aceite.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
  })

  test("com sessão nomeia a conta que está aceitando", async ({ page, context }) => {
    await signInAs(context, NO_MEMBERSHIP)
    await page.goto("/consent")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Antes de entrar, as regras.")
    await expect(page.getByText("Passo 1 de 3 · Conta")).toBeVisible()
    // A saudação do protótipo nomeia a conta que está aceitando.
    await expect(page.getByText(`Você entrou com o Google como ${NO_MEMBERSHIP}.`)).toBeVisible()
  })
})
