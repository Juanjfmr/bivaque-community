import { expect, test } from "@playwright/test"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

test("/explorar/busca leva ao app com o termo em 375, 768 e 1440 px, sem sessão", async ({
  page,
}) => {
  const caminho = "/explorar/busca?q=escola"
  const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
  expect(resposta.status).toBe(307)
  const location = resposta.headers.get("location")
  expect(location).toBeTruthy()
  const destino = new URL(location ?? "", BASE_URL)
  expect(destino.pathname).toBe("/app/busca")
  expect(destino.searchParams.get("q")).toBe("escola")

  // O termo que o app usa sai no pedido de consulta: sem sessão a rota responde
  // 401, mas o pedido carrega o q do link. É a prova de que o termo chegou ao app
  // e foi usado — o mesmo padrão do E2E do app (busca-termo-url.spec.ts).
  const consultas: string[] = []
  page.on("request", (pedido) => {
    if (new URL(pedido.url()).pathname === "/api/app/busca") consultas.push(pedido.url())
  })

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(caminho)
    // Aterrissagem no app, não na tela antiga. A retenção do q na URL é provada
    // à parte (a rota /busca ainda não persiste search; lote próprio do app).
    expect(new URL(page.url()).pathname).toBe("/app/busca")
    const erro = page.locator('[data-estado="erro"]')
    await expect(erro).toBeVisible()
    await expect(erro.getByText("Não foi possível carregar")).toBeVisible()
    await expect(erro.getByText("Confira a conexão e tente de novo.")).toBeVisible()
    expect(consultas.some((u) => new URL(u).searchParams.get("q") === "escola")).toBe(true)
  }
})
