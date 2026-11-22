import { expect, test } from "@playwright/test"

test("rotas antigas redirecionam para o app e preservam a consulta", async ({ request }) => {
  for (const [origem, destino] of [
    [
      "/groups/41000000-0000-4000-8000-000000000051?origem=aviso",
      "/app/grupo/41000000-0000-4000-8000-000000000051?origem=aviso",
    ],
    ["/groups?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/community?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/indicacoes?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/recommendations?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/communities/123/invite?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/invite/token?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/gerir-comunidades?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/communities?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/communities/123/indicar-prestador?origem=aviso", "/app/negocios?origem=aviso"],
    ["/communities/123/admin?origem=aviso", "/app/comunidade?origem=aviso"],
    ["/communities/123/admin/pending?origem=aviso", "/app/comunidade?origem=aviso"],
  ] as const) {
    const resposta = await request.get(origem, { maxRedirects: 0 })
    expect(resposta.status()).toBe(307)
    expect(resposta.headers()["location"]).toContain(destino)
  }
})

test("rotas antigas levam visitantes anônimos à entrada sem ciclo", async ({ page, request }) => {
  for (const [origem, destino] of [
    [
      "/groups/41000000-0000-4000-8000-000000000051",
      "/app/grupo/41000000-0000-4000-8000-000000000051",
    ],
    ["/groups", "/app/comunidade"],
    ["/community", "/app/comunidade"],
    ["/communities/123/invite", "/app/comunidade"],
    ["/invite/token", "/app/comunidade"],
    ["/gerir-comunidades", "/app/comunidade"],
    ["/communities/123/indicar-prestador", "/app/negocios"],
    ["/communities/123/admin", "/app/comunidade"],
    ["/communities/123/admin/pending", "/app/comunidade"],
  ] as const) {
    const resposta = await request.get(origem, { maxRedirects: 0 })
    expect(resposta.status()).toBe(307)
    expect(new URL(resposta.headers()["location"] ?? "", "http://127.0.0.1:3000").pathname).toBe(
      destino,
    )
    await page.goto(origem)
    await page.waitForURL(/\/app\/entrar(?:\?|$)/)
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(destino)
  }
})

test("entrada retoma o destino validado", async ({ page }) => {
  await page.route("**/api/app/**", (rota) => rota.fulfill({ json: {} }))
  await page.route("**/api/app/entry/progress", (rota) =>
    rota.fulfill({
      json: { autenticado: true, progresso: { versao: 2, etapa: "inicio", estado: {} } },
    }),
  )
  await page.route("**/api/app/entry/verification", (rota) =>
    rota.fulfill({ json: { membroDaCidade: true } }),
  )
  await page.addInitScript(() => {
    sessionStorage.setItem("marcador", String(Number(sessionStorage.getItem("marcador") ?? 0) + 1))
  })
  await page.goto(`/app/entrar?redirect=${encodeURIComponent("/app/grupo/123?origem=aviso")}`)
  await page.waitForURL(/\/app\/grupo\/123/)
  expect(new URL(page.url()).searchParams.get("origem")).toBe("aviso")
  expect(await page.evaluate(() => sessionStorage.getItem("marcador"))).toBe("1")
})
