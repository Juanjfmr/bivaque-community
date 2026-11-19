import { expect, test } from "@playwright/test"

test("rotas antigas de grupos redirecionam para o app e preservam a consulta", async ({
  request,
}) => {
  for (const [origem, destino] of [
    ["/groups?origem=aviso", "/app/comunidade?origem=aviso"],
    [
      "/groups/60000000-0000-4000-8000-000000000006?origem=aviso",
      "/app/grupo/60000000-0000-4000-8000-000000000006?origem=aviso",
    ],
  ] as const) {
    const resposta = await request.get(origem, { maxRedirects: 0 })
    expect(resposta.status()).toBe(307)
    expect(resposta.headers()["location"]).toContain(destino)
  }
})
