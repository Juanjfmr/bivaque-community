// RUN-133 / F05 — a tela antiga de eventos saiu e os endereços antigos passam a
// chegar às telas do app. Este spec prova, num navegador de verdade, o 307 com
// id e query preservados e o destino renderizado, nas três larguras da suíte
// (mobile-375, tablet-768, desktop-1440 vêm dos projects do playwright.config).
//
// A prova roda sem sessão de propósito: o redirect de configuração acontece
// antes do portão (apps/web/proxy.ts) e entrega a pessoa ao app, que responde
// com o próprio estado de sessão vencida. Se o endereço antigo ainda passasse
// pelo portão, a URL final seria /app/entrar e o teste falharia.
//
// E2E da web depende do Next + Supabase local (CI); não roda neste worktree.

import { expect, test } from "@playwright/test"

// Evento semeado (Piquenique das famílias, 5..10 são `upcoming` no seed). O id
// precisa chegar ao destino; a existência não é o que este spec mede.
const EVENT_ID = "70000000-0000-4000-8000-000000000005"
const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

// `fetch` com redirect manual: o APIRequestContext do Playwright lança
// "Max redirect count exceeded" com maxRedirects 0 em vez de devolver o 307.
async function esperaTroca(
  caminho: string,
  destino: { pathname: string; query?: Record<string, string> },
): Promise<void> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
  expect(resposta.status, `status de ${caminho}`).toBe(307)

  const localizacao = resposta.headers.get("location")
  expect(localizacao, `location de ${caminho}`).toBeTruthy()
  const url = new URL(localizacao ?? "", "http://127.0.0.1:3000")
  expect(url.pathname, `destino de ${caminho}`).toBe(destino.pathname)
  for (const [chave, valor] of Object.entries(destino.query ?? {})) {
    expect(url.searchParams.get(chave), `query ${chave} de ${caminho}`).toBe(valor)
  }
}

test.describe("endereços antigos de eventos", () => {
  test("/events chega à agenda preservando a query", async () => {
    await esperaTroca("/events?origem=aviso&texto=ol%C3%A1", {
      pathname: "/app/agenda",
      query: { origem: "aviso", texto: "olá" },
    })
  })

  test("/events/:id chega ao encontro com o mesmo id e a query", async () => {
    await esperaTroca(`/events/${EVENT_ID}?origem=aviso`, {
      pathname: `/app/evento/${EVENT_ID}`,
      query: { origem: "aviso" },
    })
  })

  test("/events/novo chega à agenda, não a um encontro chamado novo", async () => {
    await esperaTroca("/events/novo?origem=aviso", {
      pathname: "/app/agenda",
      query: { origem: "aviso" },
    })
  })

  test("não há segundo salto: o destino responde 200", async ({ request }) => {
    for (const [caminho, destino] of [
      ["/events", "/app/agenda"],
      [`/events/${EVENT_ID}`, `/app/evento/${EVENT_ID}`],
      ["/events/novo", "/app/agenda"],
    ] as const) {
      const resposta = await request.get(caminho, { failOnStatusCode: false, maxRedirects: 1 })
      expect(resposta.status(), `status final de ${caminho}`).toBe(200)
      expect(new URL(resposta.url()).pathname, `destino final de ${caminho}`).toBe(destino)
    }
  })

  test("o navegador mostra a agenda do app em /events e /events/novo", async ({ page }) => {
    for (const caminho of ["/events", "/events/novo"]) {
      await page.goto(caminho)
      await expect(page).toHaveURL(/\/app\/agenda$/)
      await expect(page.locator('[data-tela="agenda"]')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole("heading", { name: "Agenda da cidade" })).toBeVisible()
    }
  })

  test("o navegador mostra o encontro do app em /events/:id", async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}`)
    await expect(page).toHaveURL(new RegExp(`/app/evento/${EVENT_ID}$`))
    await expect(page.locator('[data-tela="evento"]')).toBeVisible({ timeout: 15_000 })
    // Sem sessão o app não inventa conteúdo: pede entrada de novo.
    await expect(page.locator('[data-estado="sessao-vencida"]')).toBeVisible()
  })
})
