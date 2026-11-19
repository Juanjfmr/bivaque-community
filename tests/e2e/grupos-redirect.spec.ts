import { expect, test } from "@playwright/test"

test("rotas antigas redirecionam para o app e preservam a consulta", async ({ request }) => {
  for (const [origem, destino] of [
    ["/groups?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/community?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/indicacoes?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/recommendations?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/communities?origem=aviso", "/app/comunidade?origem=aviso"],
  ] as const) {
    const resposta = await request.get(origem, { maxRedirects: 0 })
    expect(resposta.status()).toBe(307)
    expect(resposta.headers()["location"]).toContain(destino)
  }
})
