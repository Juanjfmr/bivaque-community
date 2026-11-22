import { type Browser, type BrowserContext, expect, test } from "@playwright/test"
import { CURRENT_CONSENT, signInAs } from "./helpers/session"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

// SEC-010, ADR-20261110-superficie-publica-do-proxy.
//
// O redirect de configuração (`apps/web/next.config.ts`) roda antes do proxy e
// antes do filesystem. Toda a subárvore /onboarding* é inalcançável por HTTP;
// nesses casos a resposta é do redirect de configuração, não do portão. A
// decisão do proxy é observada em rotas não interceptadas (/admissions, /prestadorx).
//
// TROCA-005: a operação /admissions segue atrás do portão; prestadores são
// confinados ao destino do app /app/meu-negocio.
//
// `fetch` nativo com `redirect: "manual"` em vez de `maxRedirects: 0` do
// APIRequestContext do Playwright: é o mesmo efeito (devolve o 307 sem seguir) e
// o padrão já usado em `tests/e2e/events-redirects.spec.ts`.

async function pedir(caminho: string, cookie?: string): Promise<Response> {
  const init: RequestInit = { redirect: "manual" }
  if (cookie) init.headers = { cookie }
  return fetch(`${BASE_URL}${caminho}`, init)
}

function localizacao(resposta: Response): URL {
  return new URL(resposta.headers.get("location") ?? "", BASE_URL)
}

async function abrirSessao(
  browser: Browser,
  email: string,
): Promise<{ context: BrowserContext; cookie: string }> {
  const context = await browser.newContext()
  await signInAs(context, email)
  const cookies = await context.cookies()
  const cookie = cookies.map((item) => `${item.name}=${item.value}`).join("; ")
  return { context, cookie }
}

const VERIFICADO_SEM_CIDADE = "verified-no-membership@bivaque.example.invalid"
const PENDENTE = "admissao-1@bivaque.example.invalid"

test.describe("anônimo", () => {
  test("GET /admissions é recusado pelo proxy e termina na entrada do app", async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: "bivaque-consent-version", value: CURRENT_CONSENT, domain: "127.0.0.1", path: "/" },
    ])

    const recusa = await pedir("/admissions")
    expect(recusa.status).toBe(307)
    const destino = localizacao(recusa)
    expect(destino.pathname).toBe("/app/entrar")
    expect(destino.searchParams.get("redirect")).toBe("/admissions")

    const page = await context.newPage()
    await page.goto("/admissions")

    // O proxy leva direto à entrada do app, preservando o destino pedido.
    await expect(page).toHaveURL(/\/app\/entrar(?:\?|$)/)
    await context.close()
  })

  test("subrotas e prefixos vizinhos não abrem o portão", async () => {
    const casos: Array<[string, string]> = [
      ["/convite/ABCD1234", "/app/entrar"],
      ["/auth/confirmar-email", "/app/entrar"],
      ["/prestadorx", "/app/entrar"],
      ["/loginx", "/app/entrar"],
      ["/apiario", "/app/entrar"],
    ]
    for (const [caminho, esperado] of casos) {
      const resposta = await pedir(caminho)
      expect(resposta.status, caminho).toBe(307)
      expect(localizacao(resposta).pathname, caminho).toBe(esperado)
    }
  })

  test("/landing exato vai para /, /landing/* entrega asset e /landing/qualquer é 404", async ({
    page,
  }) => {
    const exato = await pedir("/landing")
    expect(exato.status).toBe(307)
    expect(localizacao(exato).pathname).toBe("/")

    await page.goto("/landing")
    await expect(page).toHaveURL("http://127.0.0.1:3000/")

    const asset = await pedir("/landing/hero-bivaque-arrival.webp")
    expect(asset.status).toBe(200)
    expect(asset.headers.get("content-type") ?? "").toContain("image/")

    const inexistente = await pedir("/landing/qualquer")
    expect(inexistente.status).toBe(404)
  })

  test("/api/health still returns the health contract (middleware bypass)", async ({ request }) => {
    const response = await request.get("/api/health")

    await expect(response).toBeOK()
    expect(await response.text()).toBe('{"status":"ok"}')
  })
})

test.describe("pré-admissão", () => {
  test("pré-admissões verificadas e pendentes terminam na entrada em um salto", async ({
    browser,
  }) => {
    // Ambos passam pelo mesmo ramo kind === null; a entrada do app resolve o estado.
    for (const email of [VERIFICADO_SEM_CIDADE, PENDENTE]) {
      const { context, cookie } = await abrirSessao(browser, email)
      const resposta = await pedir("/admissions", cookie)
      expect(resposta.status, email).toBe(307)
      expect(localizacao(resposta).pathname, email).toBe("/app/entrar")
      await context.close()
    }
  })

  test("prestador é confinado à área do negócio no app", async ({ browser }) => {
    const { context, cookie } = await abrirSessao(browser, "prestador-seed@bivaque.example.invalid")

    for (const caminho of ["/admissions", "/prestadorx"]) {
      const resposta = await pedir(caminho, cookie)
      expect(resposta.status, caminho).toBe(307)
      expect(localizacao(resposta).pathname, caminho).toBe("/app/meu-negocio")
    }

    await context.close()
  })

  test("a lista /onboarding* é inalcançável por HTTP: a configuração redireciona antes", async () => {
    // Drift registrado no ADR: /onboarding/:caminho* tem redirect de
    // configuração, então nem o funil permitido nem o prefixo vizinho
    // (/onboarding/statusx) chegam ao proxy. Prova a precedência da
    // configuração, sem remover redirect nenhum.
    for (const caminho of ["/onboarding/status", "/onboarding/statusx"]) {
      const resposta = await pedir(caminho)
      expect(resposta.status, caminho).toBe(307)
      expect(localizacao(resposta).pathname, caminho).toBe("/app/entrar")
    }
  })
})
