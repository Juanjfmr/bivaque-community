// Interesses: a tela `/profile/interests` da web saiu (RUN-163, SPA ADR §8).
//
// O que este spec prova agora é a troca em si: a URL antiga — favorito,
// histórico, link de e-mail — responde 307 para `/app/voce` com a query
// preservada, e o bloco "Assuntos de interesse" da edição aponta direto ao app,
// sem passar pelo redirect. A cobertura funcional da folha (marcar, recarregar,
// persistir, limpar) mora no E2E do app:
// tests/e2e/f10-voce-real.spec.ts — "os interesses vêm do banco: marcar,
// recarregar, persistir e limpar".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("interesses", () => {
  test("a URL antiga leva ao app com a query preservada, sem sessão", async ({ page }) => {
    // Config redirect roda antes do proxy: nem sessão é preciso para cair no app.
    const resposta = await page.request.get("/profile/interests?origem=email", {
      maxRedirects: 0,
    })

    expect(resposta.status()).toBe(307)
    const destino = new URL(resposta.headers()["location"] ?? "/", "http://127.0.0.1:3000")
    expect(destino.pathname).toBe("/app/voce")
    expect(destino.searchParams.get("origem")).toBe("email")
  })

  test("o bloco da edição aponta direto ao app, sem depender do 307", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/profile/editar")

    await expect(page.getByRole("link", { name: /Assuntos de interesse/ })).toHaveAttribute(
      "href",
      "/app/voce",
    )
  })
})
