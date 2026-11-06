import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT } from "./helpers/session"

test("redirects unauthenticated GET /community to the app entry with redirect param", async ({
  browser,
}) => {
  const context = await browser.newContext()
  await context.addCookies([
    { name: "bivaque-consent-version", value: CURRENT_CONSENT, domain: "127.0.0.1", path: "/" },
  ])
  const page = await context.newPage()

  await page.goto("/community")

  // O proxy manda a /login?redirect=...; a web leva a /app/entrar (ENTRADA-WEB-ANTIGA).
  // O destino de retorno depois de entrar não é coberto aqui: o app perde a query ao
  // montar a entrada. Fica para um cartão (ver corpo do PR).
  await expect(page).toHaveURL("http://127.0.0.1:3000/app/entrar")
  await context.close()
})

test("/api/health still returns the health contract (middleware bypass)", async ({ request }) => {
  const response = await request.get("/api/health")

  await expect(response).toBeOK()
  expect(await response.text()).toBe('{"status":"ok"}')
})
