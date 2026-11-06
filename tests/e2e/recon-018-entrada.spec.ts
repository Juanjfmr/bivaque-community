// RECON-018 — confirmação na web (prancha 37). A entrada da prancha 36 saiu da
// web com a ENTRADA-WEB-ANTIGA; o F01 cobre a entrada no app.
//
// Execução paralela em andamento: o banco local é compartilhado, então este
// spec NÃO cria contas. O painel de confirmação usa a sessão do seed + o estado
// local da tela. O
// reenvio limitado pelo servidor é exercitado com a resposta 429 REAL do
// provedor reproduzida sobre o transporte (a mensagem "after 47 seconds" é o
// formato medido do GoTrue); a geração do 429 em si é do provedor e fica
// registrada como pendência de ambiente no card.

import { expect, test } from "@playwright/test"

test.describe("prancha 37 — confirmar e-mail", () => {
  // /auth/confirmar-email não está em PUBLIC_PATHS do proxy: sem sessão, o
  // gate devolve para /login. É o bloqueio registrado no card — por isso os
  // testes entram como membro do seed, do mesmo jeito que a captura.
  async function openConfirmar(
    page: import("@playwright/test").Page,
    context: import("@playwright/test").BrowserContext,
    options: { url?: string; pendingEmail?: string | null } = {},
  ): Promise<void> {
    const { seedSession } = await import("./helpers/session")
    await seedSession(context)
    // `null` explícito significa "sem cadastro pendente" — `??` o trocaria pelo
    // padrão e plantaria a flag que o caso negativo precisa NÃO ter.
    const pendingEmail =
      options.pendingEmail === undefined ? "ana@exemplo.invalid" : options.pendingEmail
    if (pendingEmail) {
      await page.addInitScript((email: string) => {
        // Guardado: o init-script roda também no reload, e sobrescrever a flag
        // apagaria o lastResendAt que se quer provar persistente.
        const key = "bivaque:confirmacao-pendente"
        if (!window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, JSON.stringify({ email, lastResendAt: null }))
        }
      }, pendingEmail)
    }
    await page.goto(options.url ?? "/auth/confirmar-email")
  }

  test("sem cadastro pendente a tela é honesta e não tem caixas de código", async ({
    context,
    page,
  }) => {
    await openConfirmar(page, context, { pendingEmail: null })
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nada para confirmar")
    await expect(page.locator("input")).toHaveCount(0)
  })

  test("painel pendente ecoa o endereço e oferece alterar e reenviar", async ({
    context,
    page,
  }) => {
    await openConfirmar(page, context)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confira seu e-mail")
    await expect(page.getByText("ana@exemplo.invalid")).toBeVisible()
    await expect(page.getByRole("link", { name: "Alterar e-mail" })).toHaveAttribute(
      "href",
      "/signup",
    )
    await expect(page.getByRole("button", { name: "Reenviar link de confirmação" })).toBeEnabled()
    await expect(page.locator("input")).toHaveCount(0)
  })

  test("reenvio aceito pelo servidor inicia o contador; sem aceite, nada anda", async ({
    context,
    page,
  }) => {
    let resendCalls = 0
    await page.route("**/auth/v1/resend**", async (route) => {
      resendCalls += 1
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    await openConfirmar(page, context)
    await page.getByRole("button", { name: "Reenviar link de confirmação" }).click()
    await expect(page.getByRole("button", { name: /Reenviar em 0[01]:\d\d/ })).toBeDisabled()
    expect(resendCalls).toBe(1)
    // Recarregar não zera o contador: o estado é persistido na sessão, não é
    // animação de enfeite.
    await page.reload()
    await expect(page.getByRole("button", { name: /Reenviar em 00:/ })).toBeDisabled()
  })

  test("429 do servidor manda no contador e a mensagem é distinguível", async ({
    context,
    page,
  }) => {
    await page.route("**/auth/v1/resend**", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: 429,
          error_code: "over_email_send_rate_limit",
          msg: "For security purposes, you can only request this after 47 seconds.",
          message: "For security purposes, you can only request this after 47 seconds.",
        }),
      })
    })
    await openConfirmar(page, context)
    await page.getByRole("button", { name: "Reenviar link de confirmação" }).click()
    await expect(page.getByText("Aguarde 47s para pedir outro link.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Reenviar em 00:47" })).toBeDisabled()
    // O limite não se disfarça de enviado: a mensagem neutra não aparece.
    await expect(page.getByText(/já está a caminho/)).toHaveCount(0)
  })

  test("falha de rede não vira contador nem promessa", async ({ context, page }) => {
    await page.route("**/auth/v1/resend**", async (route) => {
      await route.abort("connectionrefused")
    })
    await openConfirmar(page, context)
    await page.getByRole("button", { name: "Reenviar link de confirmação" }).click()
    await expect(page.getByText("Verifique sua conexão e tente de novo.")).toBeVisible()
    await expect(page.getByText(/já está a caminho/)).toHaveCount(0)
  })

  test("painel expirado oferece envio novo, sem material vencido", async ({ context, page }) => {
    await openConfirmar(page, context, { url: "/auth/confirmar-email?estado=expirado" })
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confira seu e-mail")
    await expect(page.getByText("Este link expirou ou já foi usado.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Enviar novo link" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Preciso de ajuda" })).toHaveAttribute(
      "href",
      "/recuperar-senha",
    )
    await expect(page.locator("input")).toHaveCount(0)
  })
})
