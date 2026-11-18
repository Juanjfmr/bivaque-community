// Interesses: a tela `/profile/interests` da web saiu (RUN-163, SPA ADR §8).
//
// O que este spec prova agora é a troca em si: as URLs antigas — favorito,
// histórico, link de e-mail, e a edição inteira (RUN-172) — respondem 307 para
// `/app/voce` com a query preservada. A cobertura funcional da folha (marcar,
// recarregar, persistir, limpar) mora no E2E do app:
// tests/e2e/f10-voce-real.spec.ts — "os interesses vêm do banco: marcar,
// recarregar, persistir e limpar".

import { expect, test } from "@playwright/test"

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

  // RUN-172: o bloco "Assuntos de interesse" era da edição web, que morreu. A
  // garantia (a folha sair do armazenamento da pessoa) foi MIGRADA para o e2e
  // do app, que abre a folha pela linha do Você e prova marcar, recarregar,
  // persistir e limpar: tests/e2e/f10-voce-real.spec.ts — "os interesses vêm do
  // banco: marcar, recarregar, persistir e limpar".
  test("a edição web não existe mais: a folha é a do app", async ({ page }) => {
    const resposta = await page.request.get("/profile/editar", { maxRedirects: 0 })

    expect(resposta.status()).toBe(307)
    expect(new URL(resposta.headers()["location"] ?? "/", "http://127.0.0.1:3000").pathname).toBe(
      "/app/voce",
    )
  })
})
