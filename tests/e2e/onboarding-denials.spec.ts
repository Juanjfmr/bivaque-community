import { expect, test } from "@playwright/test"

// Realinhado em 2026-09-08 com ADR-20260907-consentimento-no-cadastro (approved,
// R3), que decidiu: "O portão de consentimento sai do proxy" e "/consent
// continua existindo como rota, sem ser portão".
//
// Antes, uma navegação sem o cookie de consentimento era desviada para
// /consent. Esses testes codificavam esse portão e ficaram vermelhos quando o
// ADR foi implementado — o realinhamento de 2026-09-07 cobriu o ADR de login e
// parou antes deste. O contrato de hoje, em apps/web/proxy.ts:114-118, é:
// sem sessão em rota protegida → /login?redirect=<pathname>.
//
// A propriedade de segurança NÃO mudou: continua impossível alcançar uma rota
// protegida sem sessão. O que mudou é o destino da recusa. O cadastro por senha
// em /signup saiu da web com a ENTRADA-WEB-ANTIGA; o aceite do app é coberto
// pelo F01 (tests/e2e/f01-entrada-real.spec.ts).

const PROTECTED_ROUTES = ["/community", "/groups", "/events", "/profile"]

test.describe("onboarding: denial paths", () => {
  test("protected routes deny an anonymous visitor and send them to login", async ({ page }) => {
    for (const route of PROTECTED_ROUTES) {
      await page.goto(route)
      await page.waitForURL(/\/login/)
      // O destino pretendido sobrevive à recusa, senão a pessoa perde o caminho
      expect(page.url()).toContain(`redirect=${encodeURIComponent(route)}`)
    }
  })

  test("an anonymous visitor never renders community content", async ({ page }) => {
    await page.goto("/community")
    await page.waitForURL(/\/login/)

    // A recusa é real: a tela de entrada, não o conteúdo protegido
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("the consent cookie is not a gate: garbage value changes nothing", async ({ page }) => {
    // Dado um cookie de consentimento adulterado
    await page
      .context()
      .addCookies([
        { name: "bivaque-consent-version", value: "garbage", path: "/", domain: "127.0.0.1" },
      ])

    // Quando o visitante anônimo tenta uma rota protegida
    await page.goto("/community")

    // Então a recusa é a mesma de sempre — o cookie não concede nem nega nada.
    // ADR-20260907: o portão saiu do proxy; quem decide é a sessão.
    await page.waitForURL(/\/login/)
  })

  test("consent page stays reachable as the exception path, not as a gate", async ({ page }) => {
    // ADR-20260907 manteve /consent como rota: é o caminho de exceção para quem
    // precisa reler ou registrar o aceite fora do cadastro. PORT-003: a tela é o
    // passo "Aceite" do protótipo, com o título da especificação.
    const response = await page.goto("/consent")
    expect(response?.ok()).toBeTruthy()

    await expect(page.getByRole("heading", { name: "Antes de entrar, as regras." })).toBeVisible()
  })

  test("onboarding denies an anonymous visitor", async ({ page }) => {
    // /onboarding saiu da web: a recusa segue para o portão, que manda à entrada,
    // e a web leva a /app/entrar (ENTRADA-WEB-ANTIGA).
    await page.goto("/onboarding")
    await page.waitForURL(/\/app\/entrar/)
  })

  test("health endpoint is always accessible", async ({ request }) => {
    const response = await request.get("/api/health")
    await expect(response).toBeOK()
    expect(await response.text()).toBe('{"status":"ok"}')
  })

  test("API onboarding endpoint requires auth", async ({ request }) => {
    const response = await request.post("/api/onboarding", {
      data: { action: "verify-cpf", cpf: "00000000000" },
    })
    expect(response.status()).toBe(401)
  })

  test("API onboarding endpoint rejects missing action", async ({ request }) => {
    const response = await request.post("/api/onboarding", {
      headers: { Authorization: "Bearer invalid-token" },
      data: {},
    })
    expect(response.status()).toBe(401)
  })
})
