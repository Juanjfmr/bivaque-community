import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  request,
  test,
} from "@playwright/test"
import { TEST_GROUP_FEED_URL } from "./helpers/composer"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// ---------------------------------------------------------------------------
// Cinco pessoas sintéticas interagindo (uma janela por vez)
// ---------------------------------------------------------------------------
//
// Cenário multi-pessoa para ser assistido ao vivo com `--headed`: cada persona
// abre uma janela, age, fecha — a próxima só abre depois. As personas são os
// membros gerados pelo seed local (supabase/seed.sql): todos compartilham uma
// senha única e descartável, lida do ambiente — nunca embutida aqui (varredura
// de segredo).
//
// Três fluxos, cada um fechando o ciclo de ponta a ponta:
//   1. Feed + reação: a autora publica, duas pessoas curtem, a contagem sobe.
//   2. Notificação: um comentário de outra pessoa chega à aba "Minha atividade".
//   3. Grupo privado: um membro vê a lista de membros, um não-membro vê só os
//      metadados (a RLS decide, não a página).
//
// Roda apenas no viewport desktop: o cenário é sequencial por design (uma
// janela de cada vez), e multiplicar por 3 viewports estoura os timeouts
// conhecidos (PRODUCT_STATUS §"O que não foi verificado").

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

const CONSENT_COOKIE = "bivaque-consent-version"

// Identidades do seed (públicas e descartáveis por design), mesmo padrão de
// group-event-detail-denials.spec.ts. A fórmula de group_memberships do seed
// coloca membro-4 no grupo 6 ("Mães da Cidade") e membro-6 apenas no grupo 7.
// As personas do cenário publicam pelo compositor, que desde o lote 5 N2
// (ADR-20261023) publica SÓ dentro de um grupo, e o post aparece no feed do
// grupo escolhido — o "Pais e Filhos" (público), que qualquer membro da cidade
// lê e onde qualquer membro da cidade pode reagir e comentar.
const AUTHOR_EMAIL = "membro-1@bivaque.example.invalid"
const COMMENTER_EMAIL = "membro-2@bivaque.example.invalid"
const SECOND_REACTOR_EMAIL = "membro-3@bivaque.example.invalid"
const GROUP_MEMBER_EMAIL = "membro-4@bivaque.example.invalid"
const GROUP_OUTSIDER_EMAIL = "membro-6@bivaque.example.invalid"

// O feed onde estas publicações aparecem: o do grupo escolhido no compositor.
const GROUP_FEED_URL = TEST_GROUP_FEED_URL

const PRIVATE_GROUP_ID = "60000000-0000-4000-8000-000000000006"
const PRIVATE_GROUP_NAME = "Mães da Cidade"

const DESKTOP_VIEWPORT = { width: 1440, height: 900 }

function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(join(process.cwd(), "apps", "web", ".env.local"), "utf-8")
    for (const line of file.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== key) continue
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

function requireCredentials(): { anonKey: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) {
    throw new Error(
      "SUPABASE_ANON_KEY is required. Set it in the environment or as NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
    )
  }
  if (!password) {
    throw new Error(
      "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
    )
  }
  return { anonKey, password }
}

type PasswordGrant = {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

async function mintSession(email: string): Promise<PasswordGrant> {
  const { anonKey, password } = requireCredentials()
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
  }
  const body = (await response.json()) as PasswordGrant
  await api.dispose()
  return body
}

// Minta uma sessão via password grant e instale o par de cookies que o
// callback route teria escrito — mesmo fluxo de helpers/session.ts, mas
// parametrizado por conta para assinar mais de um usuário de seed.
async function signInContext(context: BrowserContext, email: string): Promise<void> {
  const grant = await mintSession(email)
  const cookieValue = encodeAuthCookieValue(grant, email)
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }
  await context.addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

function desktopOnly(): void {
  test.skip(
    test.info().project.name !== "desktop-1440",
    "cenário multi-pessoa roda apenas no viewport desktop",
  )
}

// Abre uma janela para a persona, executa `fn` e fecha antes de devolver. É o
// que garante o "uma janela por vez" do cenário — sem contextos simultâneos.
async function withPersona(
  browser: Browser,
  email: string,
  fn: (page: Page) => Promise<void>,
): Promise<void> {
  const ctx = await browser.newContext({ viewport: DESKTOP_VIEWPORT })
  await signInContext(ctx, email)
  const page = await ctx.newPage()
  try {
    await fn(page)
  } finally {
    await ctx.close()
  }
}

test.setTimeout(180_000)

// @stateful: publica, curte e comenta com as personas semeadas que os outros specs também usam;
// no lote paralelo competia com eles e estourava o tempo (CI-E2E-UPSTREAM-INSTAVEL, 02/11).
test.describe("cinco pessoas sintéticas interagindo", { tag: "@stateful" }, () => {
  test("publicação, duas curtidas e comentário viram notificação para a autora", async ({
    browser,
  }) => {
    desktopOnly()

    const runToken = `x${Date.now().toString(36)}`
    const postText = `Boa tarde! Ensaio de interação sintética ${runToken}`
    const commentText = `Combinado, valeu! ${runToken}`

    // 1. A autora publica
    await withPersona(browser, AUTHOR_EMAIL, async (page) => {
      // TROCA-005: publica pela tela do grupo no app, sem sair dela.
      await page.goto(`${APP_URL}${GROUP_FEED_URL}`, { waitUntil: "load" })
      await page.locator('[data-acao="escrever-grupo"]').click()
      const dialogo = page.locator('[data-dialogo="escrever-grupo"]')
      await dialogo.locator("#texto-grupo").fill(postText)
      await dialogo.getByRole("button", { name: "Publicar", exact: true }).click()
      await expect(dialogo).toHaveCount(0, { timeout: 15_000 })
      await page.reload({ waitUntil: "load" })
      await expect(page.locator("article", { hasText: postText })).toBeVisible({ timeout: 20_000 })
    })

    // 2. A comentarista participa, marca Útil e comenta no detalhe.
    await withPersona(browser, COMMENTER_EMAIL, async (page) => {
      await page.goto(`${APP_URL}${GROUP_FEED_URL}`, { waitUntil: "load" })
      await expect(page.locator('[data-controles-grupo="sim"]')).toBeVisible()
      const participar = page.getByRole("button", { name: "Participar do grupo" })
      if (await participar.isVisible()) {
        await participar.click()
        await expect(page.getByText("Participando", { exact: true })).toBeVisible()
      }
      const post = page.locator("article", { hasText: postText })
      const util = post.getByRole("button", { name: /Útil/ })
      await util.click()
      await expect(util).toHaveAttribute("aria-pressed", "true")
      await post.getByRole("button", { name: /Comentar|comentários/ }).click()
      await page.getByLabel("Seu comentário").fill(commentText)
      await page.getByRole("button", { name: "Comentar", exact: true }).last().click()
      await expect(page.getByText(commentText)).toBeVisible({ timeout: 10_000 })
    })

    // 3. A segunda pessoa participa e também marca Útil.
    await withPersona(browser, SECOND_REACTOR_EMAIL, async (page) => {
      await page.goto(`${APP_URL}${GROUP_FEED_URL}`, { waitUntil: "load" })
      await expect(page.locator('[data-controles-grupo="sim"]')).toBeVisible()
      const participar = page.getByRole("button", { name: "Participar do grupo" })
      if (await participar.isVisible()) {
        await participar.click()
        await expect(page.getByText("Participando", { exact: true })).toBeVisible()
      }
      const util = page
        .locator("article", { hasText: postText })
        .getByRole("button", { name: /Útil/ })
      await util.click()
      await expect(util).toHaveAttribute("aria-pressed", "true")
      await page.reload({ waitUntil: "load" })
      await expect(util).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 })
    })

    // 4. A autora vê as duas marcações persistidas.
    await withPersona(browser, AUTHOR_EMAIL, async (page) => {
      await page.goto(`${APP_URL}${GROUP_FEED_URL}`, { waitUntil: "load" })
      await expect(
        page.locator("article", { hasText: postText }).getByRole("button", { name: "Útil (2)" }),
      ).toBeVisible({ timeout: 15_000 })
    })

    // 5. O comentário disparou uma notificação para a autora. Verificamos
    //    via API (não pela página): a página de notificações tem uma corrida
    //    de sessão em navegação fresca e mostra a lista vazia mesmo com
    //    notificações no banco. O trigger notify_comment prova o pipeline.
    //    A busca é filtrada por alvo: um limit=100 sem filtro deixa a
    //    notificação deste run fora da primeira página conforme o banco
    //    acumula linhas ao longo das execuções.
    const authorGrant = await mintSession(AUTHOR_EMAIL)
    const { anonKey } = requireCredentials()
    const api = await request.newContext()
    const headers = { apikey: anonKey, Authorization: `Bearer ${authorGrant.access_token}` }
    const postRes = await api.get(
      `${SUPABASE_URL}/rest/v1/posts?select=id&content=ilike.*${runToken}*&limit=1`,
      { headers },
    )
    const postRows = (await postRes.json()) as Array<{ id: string }>
    expect(postRows).toHaveLength(1)
    const postId = postRows[0]?.id
    if (!postId) throw new Error("o post recém-publicado não voltou na consulta")
    const notifRes = await api.get(
      `${SUPABASE_URL}/rest/v1/notifications?select=type,target_id&type=eq.comment&target_id=eq.${postId}`,
      { headers },
    )
    const notifs = (await notifRes.json()) as Array<{ type: string; target_id: string }>
    await api.dispose()
    expect(notifs.some((n) => n.type === "comment" && n.target_id === postId)).toBe(true)
  })

  test("grupo privado: membro participa e não-membro não lê conteúdo", async ({ browser }) => {
    desktopOnly()
    await withPersona(browser, GROUP_MEMBER_EMAIL, async (page) => {
      const redirect = await page.request.get(`${APP_URL}/groups/${PRIVATE_GROUP_ID}`, {
        maxRedirects: 0,
      })
      expect(redirect.status()).toBe(307)
      expect(new URL(redirect.headers()["location"] ?? "", "http://127.0.0.1:3000").pathname).toBe(
        `/app/grupo/${PRIVATE_GROUP_ID}`,
      )
      await page.goto(`${APP_URL}/app/grupo/${PRIVATE_GROUP_ID}`, { waitUntil: "load" })
      await expect(page.getByRole("heading", { name: PRIVATE_GROUP_NAME })).toBeVisible()
      await expect(page.locator('[data-estado-participacao="membro"]')).toBeVisible()
      await expect(page.getByText("Administrar grupo")).toHaveCount(0)
    })
    await withPersona(browser, GROUP_OUTSIDER_EMAIL, async (page) => {
      const api = await page.request.get(`${APP_URL}/api/app/grupos/${PRIVATE_GROUP_ID}`)
      expect(api.status()).toBe(200)
      expect((await api.json()).publicacoes).toEqual([])
      expect(
        (await page.request.get(`${APP_URL}/api/app/grupos/${PRIVATE_GROUP_ID}/membros`)).status(),
      ).toBe(403)
      await page.goto(`${APP_URL}/app/grupo/${PRIVATE_GROUP_ID}`, { waitUntil: "load" })
      await expect(page.getByRole("heading", { name: PRIVATE_GROUP_NAME })).toBeVisible()
      await expect(
        page.getByText("O conteúdo dos grupos fechados é reservado aos membros."),
      ).toBeVisible()
      await expect(page.locator('[data-publicacao-na-lista="sim"]')).toHaveCount(0)
      await expect(page.getByText("Administrar grupo")).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Sair do grupo" })).toHaveCount(0)
    })
  })
})
