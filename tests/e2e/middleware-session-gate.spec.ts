import { type Browser, type BrowserContext, expect, test } from "@playwright/test"
import { CURRENT_CONSENT, signInAs } from "./helpers/session"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

// SEC-010, ADR-20261110-superficie-publica-do-proxy.
//
// O redirect de configuração (`apps/web/next.config.ts`) roda antes do proxy e
// antes do filesystem. Para /login, /signup, /recuperar-senha, /nova-senha e
// toda a subárvore /onboarding*, a resposta HTTP é do redirect de configuração,
// não do portão — a lista do funil é inalcançável por HTTP (drift registrado no
// ADR). Por isso a decisão do proxy é observada numa rota que a configuração não
// intercepta (/community, /prestador, /prestadorx, /landing/*): o 307 com o
// `location` que o proxy escolheu é a prova, antes do próximo salto.
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

const VISUAL = "visual@bivaque.example.invalid"
const PRESTADOR = "prestador-seed@bivaque.example.invalid"
const VERIFICADO_SEM_CIDADE = "verified-no-membership@bivaque.example.invalid"
const PENDENTE = "admissao-1@bivaque.example.invalid"

test.describe("anônimo", () => {
  test("GET /community é recusado pelo proxy e termina na entrada do app", async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: "bivaque-consent-version", value: CURRENT_CONSENT, domain: "127.0.0.1", path: "/" },
    ])

    const recusa = await pedir("/community")
    expect(recusa.status).toBe(307)
    const destino = localizacao(recusa)
    expect(destino.pathname).toBe("/login")
    expect(destino.searchParams.get("redirect")).toBe("/community")

    const page = await context.newPage()
    await page.goto("/community")

    // O proxy manda a /login?redirect=...; a configuração leva a /app/entrar.
    await expect(page).toHaveURL("http://127.0.0.1:3000/app/entrar")
    await context.close()
  })

  test("subrotas e prefixos vizinhos não abrem o portão", async () => {
    const casos: Array<[string, string]> = [
      ["/convite/ABCD1234", "/login"],
      ["/auth/confirmar-email", "/login"],
      ["/prestadorx", "/login"],
      ["/loginx", "/login"],
      ["/apiario", "/login"],
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

test.describe("membro admitido", () => {
  test("/community abre com sessão; /landing exato continua indo para /", async ({ browser }) => {
    const { context, cookie } = await abrirSessao(browser, VISUAL)

    const comunidade = await pedir("/community", cookie)
    expect(comunidade.status).toBe(200)

    const landing = await pedir("/landing", cookie)
    expect(landing.status).toBe(307)
    expect(localizacao(landing).pathname).toBe("/")

    await context.close()
  })
})

test.describe("prestador", () => {
  test("é confinado à área /prestador, com fronteira: /prestadorx volta para /prestador", async ({
    browser,
  }) => {
    const { context, cookie } = await abrirSessao(browser, PRESTADOR)

    const propriaArea = await pedir("/prestador", cookie)
    expect(propriaArea.status).toBe(200)

    const fora = await pedir("/community", cookie)
    expect(fora.status).toBe(307)
    expect(localizacao(fora).pathname).toBe("/prestador")

    const vizinho = await pedir("/prestadorx", cookie)
    expect(vizinho.status).toBe(307)
    expect(localizacao(vizinho).pathname).toBe("/prestador")

    // /prestadores (ficha pública de membro) já era permitida pelo prefixo
    // solto antigo e não pode virar regressão: o proxy não pode desviar para
    // /prestador. A página responde 200/404 conforme o id, nunca o desvio.
    const ficha = await pedir("/prestadores/00000000-0000-4000-8000-000000000001", cookie)
    if (ficha.status >= 300 && ficha.status < 400) {
      expect(localizacao(ficha).pathname).not.toBe("/prestador")
    } else {
      expect([200, 404]).toContain(ficha.status)
    }

    await context.close()
  })
})

test.describe("pré-admissão", () => {
  test("verificada sem cidade é desviada pelo proxy para /onboarding/locality", async ({
    browser,
  }) => {
    const { context, cookie } = await abrirSessao(browser, VERIFICADO_SEM_CIDADE)

    const resposta = await pedir("/community", cookie)
    expect(resposta.status).toBe(307)
    expect(localizacao(resposta).pathname).toBe("/onboarding/locality")

    await context.close()
  })

  test("pendente é desviada pelo proxy para /onboarding/status com o caminho pedido", async ({
    browser,
  }) => {
    const { context, cookie } = await abrirSessao(browser, PENDENTE)

    const resposta = await pedir("/community", cookie)
    expect(resposta.status).toBe(307)
    const destino = localizacao(resposta)
    expect(destino.pathname).toBe("/onboarding/status")
    expect(destino.searchParams.get("next")).toBe("/community")

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
