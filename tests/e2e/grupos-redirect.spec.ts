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

test("rotas antigas levam visitantes anônimos à entrada sem ciclo", async ({ page, request }) => {
  for (const origem of ["/groups", "/community"]) {
    const resposta = await request.get(origem, { maxRedirects: 0 })
    expect(resposta.status()).toBe(307)
    expect(new URL(resposta.headers()["location"] ?? "", "http://127.0.0.1:3000").pathname).toBe(
      "/app/comunidade",
    )
    await page.goto(origem)
    await expect(page).toHaveURL(/\/app\/entrar/)
  }
})
