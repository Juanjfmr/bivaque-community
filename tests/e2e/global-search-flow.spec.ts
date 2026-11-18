import { type BrowserContext, expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

// RECON-021 — fluxo da busca global: o campo do cabeçalho entrega o termo ao app.
//
// Contas do seed (mesma senha publica bivaque-e2e-local):
//   visual@    — membro de Manaus, NAO e da Vila Ajuricaba (nao ve prestador)
//   membro-25@ — membro aprovado da Vila Ajuricaba (ve "Climatiza Manaus")
// A negacao tambem e provada sem interface, por chamada direta ao RPC com o
// JWT da conta sem direito.
//
// RUN-181: o painel de servicos da web saiu. Os testes 3-8 deste spec
// exercitavam aquela tela; cada garantia ganhou lar no app ou foi declarada
// morta na tabela do RELATORIO (.visual/troca-explorar). O que sobra aqui e o
// que continua sendo do servidor e da casca: o campo, as duas URLs antigas e a
// negacao de RLS por chamada direta.

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

    // RUN-172: o host era /profile; a casca web (e o mesmo campo) está em toda
    // rota viva do grupo. RUN-186: /salvos virou 307 para o app, então o host é
    // a Comunidade.
    await page.goto("/community")
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

  // RUN-181: a última tela de busca da web (o painel de serviços) morreu no
  // mesmo molde. A prova é de servidor: nenhuma interface, só o endereço.
  test("a URL antiga do painel de serviços responde 307 e preserva q", async () => {
    const baseUrl = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
    const resposta = await fetch(`${baseUrl}/explorar/servicos?q=climatiza`, { redirect: "manual" })
    expect(resposta.status).toBe(307)
    const destino = new URL(resposta.headers.get("location") ?? "", baseUrl)
    expect(destino.pathname).toBe("/app/busca")
    expect(destino.searchParams.get("q")).toBe("climatiza")
  })
})

test.describe("busca de servicos: a negacao que nao era da tela", () => {
  // Teste 5 da tabela do RUN-181 (testes numerados no RELATORIO): a negacao
  // mora na RLS, nao no painel. Nao ancora nenhuma tela da web — chamava o RPC
  // direto e continua igual. O vazio honesto e o resultado com ficha vivem no
  // app (apps/app/tests/e2e/busca-termo-url.spec.ts e busca-resultado-ficha).
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
})
