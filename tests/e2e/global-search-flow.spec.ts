import { type BrowserContext, expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

// RECON-021 — fluxo da busca global: campo do cabecalho -> /explorar/busca
// agrupada -> /explorar/servicos com filtros, contagem e ficha alcancavel.
//
// Contas do seed (mesma senha configurada no ambiente de teste):
//   visual@    — membro de Manaus, NAO e da Vila Ajuricaba (nao ve prestador)
//   membro-25@ — membro aprovado da Vila Ajuricaba (ve "Climatiza Manaus")
// A negacao tambem e provada sem interface, por chamada direta ao RPC com o
// JWT da conta sem direito.

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const ANON_KEY =
  process.env["SUPABASE_ANON_KEY"] ?? readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? ""

const PROVIDER_ID = "30000000-0000-4000-8000-000000000010"

const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")

if (!password) {
  throw new Error(
    "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
  )
}

async function mintSession(email: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`password grant failed for ${email}: ${response.status}`)
  return (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: string
  }
}

async function signIn(context: BrowserContext, email: string) {
  const body = await mintSession(email)
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0]
  const cookieValue = encodeAuthCookieValue(body, email)
  // Mesmo mecanismo do seedSession do helper — só o cookie base64- do
  // @supabase/ssr. Injetar o valor base64- no localStorage estragaria o
  // getSession() do supabase-js, que espera JSON puro ali.
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }
  await context.addCookies([
    { name: `sb-${ref}-auth-token`, value: cookieValue, ...shared },
    { name: "bivaque-consent-version", value: CURRENT_CONSENT, ...shared },
  ])
}

test.describe("busca global do cabecalho", () => {
  test("o campo existe no shell e leva a rota de resultados agrupados", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "visual@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/inicio")
    const field = page.getByLabel("Buscar no Bivaque")
    await expect(field).toBeVisible()

    await field.fill("escola")
    await page.keyboard.press("Enter")

    await expect(page).toHaveURL(/\/explorar\/busca\?q=escola/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Resultados para/)
    const guia = page.getByRole("region", { name: "Guia da cidade" })
    await expect(guia).toBeVisible()
    await expect(guia.getByText("Escola Modelo do Centro")).toBeVisible()

    // A entrada pendente da mesma cidade nao pode aparecer nem como item.
    await expect(page.getByText("Escola de Acolhimento Militar")).toHaveCount(0)

    await context.close()
  })

  test("ver todos do grupo Guia chega com o filtro preenchido", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "visual@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/explorar/busca?q=escola")
    await page.getByRole("link", { name: /Ver todos em Guia da cidade/ }).click()

    await expect(page).toHaveURL(/\/guide\?q=escola/)
    await expect(page.getByLabel("Buscar no guia")).toHaveValue("escola")
    await expect(page.getByText("Escola Modelo do Centro")).toBeVisible()

    await context.close()
  })

  test("sessao expirada e estado proprio, diferente de erro e de vazio", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "visual@bivaque.example.invalid")
    const page = await context.newPage()

    await page.route("**/rest/v1/rpc/search_providers", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "PGRST301", message: "JWT expired" }),
      }),
    )
    await page.goto("/explorar/busca?q=escola")
    await expect(page.getByText("Sua sessão expirou")).toBeVisible()
    await expect(page.getByRole("link", { name: "Entrar novamente" })).toBeVisible()

    await context.close()
  })

  test("falha de consulta nao vira vazio: erro recuperavel com nova tentativa", async ({
    browser,
  }) => {
    const context = await browser.newContext()
    await signIn(context, "visual@bivaque.example.invalid")
    const page = await context.newPage()

    await page.route("**/rest/v1/rpc/search_providers", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    )
    await page.goto("/explorar/busca?q=escola")
    await expect(page.getByText("Não foi possível buscar agora. Tente novamente.")).toBeVisible()

    await page.unroute("**/rest/v1/rpc/search_providers")
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page.getByText("Escola Modelo do Centro")).toBeVisible()

    await context.close()
  })
})

test.describe("busca de servicos (prancha 61, painel direito)", () => {
  test("membro com direito ve contagem real, localizacao e abre a ficha", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "membro-25@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/explorar/servicos?q=climatiza")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Resultados para “climatiza”/)
    await expect(page.getByText("1 resultado encontrado")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Climatiza Manaus" })).toBeVisible()
    await expect(page.getByText("Vila Ajuricaba, Manaus")).toBeVisible()

    await page.getByRole("button", { name: "Ver ficha" }).click()
    await expect(page).toHaveURL(new RegExp(`/prestadores/${PROVIDER_ID}`))

    await context.close()
  })

  test("membro sem direito ve vazio honesto, nao o item restrito", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "visual@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/explorar/servicos?q=climatiza")
    await expect(page.getByText("Nenhum prestador encontrado")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Climatiza Manaus" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Trocar de cidade" })).toBeVisible()

    await context.close()
  })

  test("sem interface, a RLS nega o mesmo prestador para a conta sem direito", async () => {
    const withoutRight = await mintSession("visual@bivaque.example.invalid")
    const denied = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_providers`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${withoutRight.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_query: "climatiza" }),
    })
    expect(denied.status).toBe(200)
    expect(await denied.json()).toEqual([])

    const withRight = await mintSession("membro-25@bivaque.example.invalid")
    const allowed = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_providers`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${withRight.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_query: "climatiza" }),
    })
    const rows = (await allowed.json()) as { id: string }[]
    expect(rows.map((row) => row.id)).toContain(PROVIDER_ID)
  })

  test("termo, filtro e pagina sobrevivem a recarregar, voltar e nova aba", async ({ browser }) => {
    test.info().annotations.push({
      type: "limitation",
      description:
        "page=99 prova o clamp pela URL; o seed de Manaus tem 1 prestador visivel, entao uma pagina 2 real depende de volume e nao pode ser inventada aqui.",
    })
    const context = await browser.newContext()
    await signIn(context, "membro-25@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/explorar/servicos?q=climatiza&page=99")
    await expect(page.getByText("1 resultado encontrado")).toBeVisible()
    await expect(page).toHaveURL(/page=99/)

    await page.getByLabel("Tipo de serviço").selectOption("assistencia_tecnica")
    await expect(page).toHaveURL(/tipo=assistencia_tecnica/)
    await expect(page).not.toHaveURL(/page=/)

    await page.getByLabel("Tipo de serviço").selectOption("")
    // A entrada anterior so vira historia depois que o push assenta; sem
    // esperar, os dois pushes consecutivos coalescem e o voltar pula um.
    await expect(page).toHaveURL(/\/explorar\/servicos\?q=climatiza$/)
    await page.goBack()
    await expect(page).toHaveURL(/tipo=assistencia_tecnica/)

    const tab2 = await context.newPage()
    await tab2.goto("/explorar/servicos?q=climatiza&page=99")
    await expect(tab2.getByRole("heading", { name: "Climatiza Manaus" })).toBeVisible()
    await tab2.close()

    await context.close()
  })

  test("alias antigo search e normalizado para q na borda", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "membro-25@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/explorar/servicos?search=climatiza")
    await expect(page).toHaveURL(/\/explorar\/servicos\?q=climatiza/)
    await expect(page.getByRole("heading", { name: "Climatiza Manaus" })).toBeVisible()

    await context.close()
  })

  test("limpar filtros remove bairro e tipo preservando o termo", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "membro-25@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/explorar/servicos?q=climatiza&tipo=assistencia_tecnica")
    await page.getByRole("button", { name: "Limpar filtros" }).click()

    await expect(page).toHaveURL(/q=climatiza/)
    await expect(page).not.toHaveURL(/tipo=/)
    await expect(page.getByRole("heading", { name: "Climatiza Manaus" })).toBeVisible()

    await context.close()
  })
})
