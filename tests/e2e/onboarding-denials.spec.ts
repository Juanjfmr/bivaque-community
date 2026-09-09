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
// protegida sem sessão. O que mudou é o destino da recusa. E o aceite, que era
// cobrado no portão, passou a ser cobrado na criação da conta — coberto no fim
// deste arquivo, porque sem isso o realinhamento seria só apagar prova.

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

  test("login page is accessible without auth", async ({ page }) => {
    const response = await page.goto("/login")
    expect(response?.ok()).toBeTruthy()

    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
    await expect(page.getByLabel("E-mail")).toBeVisible()
    // exact: o botão "Mostrar senha" também contém "senha" no aria-label.
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible()
  })

  test("consent page stays reachable as the exception path, not as a gate", async ({ page }) => {
    // ADR-20260907 manteve /consent como rota: é o caminho de exceção para quem
    // precisa reler ou registrar o aceite fora do cadastro.
    const response = await page.goto("/consent")
    expect(response?.ok()).toBeTruthy()

    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()
  })

  test("onboarding denies an anonymous visitor", async ({ page }) => {
    await page.goto("/onboarding")
    await page.waitForURL(/\/login/)
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

// ---------------------------------------------------------------------------
// O aceite depois do ADR: cobrado na criação da conta.
//
// Cobertura nova. Antes deste arquivo, /signup não tinha NENHUM teste e2e — o
// aceite tinha prova unitária (tests/unit/auth/consent-no-cadastro.test.ts) e
// nenhuma prova de navegador. Retargetar os testes do portão sem acrescentar
// isto teria removido a única evidência de que o aceite é exigido em algum
// lugar. Gate G4: contrato substituído por decisão explícita muda expectativa
// E cobertura do novo comportamento na mesma entrega.
// ---------------------------------------------------------------------------

test.describe("consent is enforced at account creation", () => {
  test("the signup form asks for consent and blocks until it is given", async ({ page }) => {
    await page.goto("/signup")

    await expect(page.getByRole("heading", { name: "Vamos começar." })).toBeVisible()

    const consent = page.getByRole("checkbox", { name: /Li e aceito a/ })
    await expect(consent).toBeVisible()
    await expect(consent).not.toBeChecked()

    // Negativa: sem aceite, não se cria conta
    const submit = page.getByRole("button", { name: "Criar conta" })
    await expect(submit).toBeDisabled()

    // Positiva: com aceite, o caminho abre
    await consent.check()
    await expect(consent).toBeChecked()
    await expect(submit).toBeEnabled()
  })

  test("the consent line links to both documents", async ({ page }) => {
    await page.goto("/signup")

    await expect(page.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute(
      "href",
      "/privacidade",
    )
    await expect(page.getByRole("link", { name: "Código de conduta" })).toHaveAttribute(
      "href",
      "/codigo-de-conduta",
    )
  })

  test("entering does not ask for consent again", async ({ page }) => {
    // ADR-20260907: o aceite não reaparece depois. A tela de entrada não tem
    // caixa de aceite — quem já aceitou no cadastro não é interrompido.
    await page.goto("/login")

    await expect(page.getByRole("checkbox", { name: /Li e aceito a/ })).toHaveCount(0)
  })
})
