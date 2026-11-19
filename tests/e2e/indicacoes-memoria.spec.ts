import { expect, test } from "@playwright/test"

test("endereços antigos de indicações redirecionam ao app", async ({ request }) => {
  for (const origem of ["/indicacoes", "/community", "/recommendations"]) {
    const resposta = await request.get(origem, { maxRedirects: 0 })
    expect(resposta.status()).toBe(307)
    expect(new URL(resposta.headers()["location"] ?? "", "http://127.0.0.1:3000").pathname).toBe(
      "/app/comunidade",
    )
  }
})
