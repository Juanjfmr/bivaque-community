import { type BrowserContext, expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

// RECON-021 — fluxo da busca global: o campo do cabeçalho entrega o termo ao app.
//
// Contas do seed (mesma senha publica bivaque-e2e-local):
//   visual@    — membro de Manaus, NAO e da Vila Ajuricaba (nao ve prestador)
//   membro-25@ — membro aprovado da Vila Ajuricaba (ve "Climatiza Manaus")
// A negacao tambem e provada sem interface, por chamada direta ao RPC com o
// JWT da conta sem direito.

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const ANON_KEY =
  process.env["SUPABASE_ANON_KEY"] ?? readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? ""

const PROVIDER_ID = "30000000-0000-4000-8000-000000000010"

// Senha publica e descartavel do seed local, na mesma convencao dos outros
// specs: lida do ambiente com fallback. Nunca inlineada como propriedade
// `password: "..."`, que o secrets-scan barra.
const password = process.env["USER_PASSWORD"] ?? "bivaque-e2e-local"

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
  test("o campo envia o termo diretamente à busca do app", async ({ browser }) => {
    const context = await browser.newContext()
    await signIn(context, "visual@bivaque.example.invalid")
    const page = await context.newPage()

    await page.goto("/profile")
    // O shell monta dois campos (desktop e celular, um sempre escondido), cada
    // um com o próprio id desde 25/09/2026: o teste usa o que está à vista.
    const field = page.getByLabel("Buscar no Bivaque").locator("visible=true")
    await expect(field).toBeVisible()

    await field.fill("escola")
    await page.keyboard.press("Enter")

    // O Enter navega do shell web para o app: esperar a navegação assentar antes
    // de avaliar o state, senão o poll corre com a troca de contexto de execução.
    await page.waitForURL(/\/app\/busca/)
    await expect
      .poll(() => page.evaluate(() => window.history.state?.bivaqueEntrada?.versao ?? 0))
      .toBe(1)
    await expect(page).toHaveURL(/\/app\/busca\?q=escola/)

    await context.close()
  })

  test("a URL antiga responde 307 para o app e preserva q", async () => {
    const baseUrl = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
    const resposta = await fetch(`${baseUrl}/explorar/busca?q=escola`, { redirect: "manual" })
    expect(resposta.status).toBe(307)
    const destino = new URL(resposta.headers.get("location") ?? "", baseUrl)
    expect(destino.pathname).toBe("/app/busca")
    expect(destino.searchParams.get("q")).toBe("escola")
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
    await expect(page).toHaveURL(new RegExp(`/app/negocio/${PROVIDER_ID}$`))

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
