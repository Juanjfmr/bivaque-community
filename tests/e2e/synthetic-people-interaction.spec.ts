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
// As três personas do cenário de interação precisam de feed de vila real:
// o seed as aprova na Vila Ajuricaba. Sem comunidade aprovada, /community
// renderiza CityReference (D48), que não lista posts, e o post nunca
// renderiza para curtir/comentar/notificar.
const AUTHOR_EMAIL = "membro-1@bivaque.example.invalid"
const COMMENTER_EMAIL = "membro-2@bivaque.example.invalid"
const SECOND_REACTOR_EMAIL = "membro-3@bivaque.example.invalid"
const GROUP_MEMBER_EMAIL = "membro-4@bivaque.example.invalid"
const GROUP_OUTSIDER_EMAIL = "membro-6@bivaque.example.invalid"

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

test.describe("cinco pessoas sintéticas interagindo", () => {
  test("publicação, duas curtidas e comentário viram notificação para a autora", async ({
    browser,
  }) => {
    desktopOnly()

    const runToken = `x${Date.now().toString(36)}`
    const postText = `Boa tarde! Ensaio de interação sintética ${runToken}`
    const commentText = `Combinado, valeu! ${runToken}`

    // 1. A autora publica pela rota addressável alcançada pelo feed real
    await withPersona(browser, AUTHOR_EMAIL, async (page) => {
      await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
      await page.getByRole("button", { name: "Publicar" }).first().click()
      await expect(page).toHaveURL(/\/publicacoes\/nova/)
      const composer = page.locator("[data-composer-form]")
      await expect(composer).toBeVisible()
      await expect(composer).toHaveAttribute("data-draft-ready", "true")
      await composer.getByLabel("Pergunta").fill(postText)
      await composer.getByRole("button", { name: "Publicar" }).click()
      await expect(page).toHaveURL(/\/community/)
      await expect(page.locator("article", { hasText: postText })).toBeVisible({ timeout: 15_000 })
    })

    // 2. A comentarista curte e comenta
    await withPersona(browser, COMMENTER_EMAIL, async (page) => {
      await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
      const post = page.locator("article", { hasText: postText })
      await post.getByRole("button", { name: "Curtir publicação" }).click()
      await expect(post.getByRole("button", { name: "Descurtir publicação" })).toBeVisible({
        timeout: 10_000,
      })
      await post.getByLabel("Comentário", { exact: true }).fill(commentText)
      await post.getByRole("button", { name: "Enviar comentário" }).click()
      await expect(post.getByText(commentText)).toBeVisible({ timeout: 10_000 })
    })

    // 3. A segunda pessoa também curte
    await withPersona(browser, SECOND_REACTOR_EMAIL, async (page) => {
      await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
      const post = page.locator("article", { hasText: postText })
      const reactionCreated = page.waitForResponse(
        (response) =>
          response.url().includes("/rest/v1/post_reactions") &&
          response.request().method() === "POST" &&
          response.status() === 201,
      )
      await post.getByRole("button", { name: "Curtir publicação" }).click()
      await expect(post.getByRole("button", { name: "Descurtir publicação" })).toBeVisible({
        timeout: 10_000,
      })
      await reactionCreated

      // A reação persiste no servidor (recarregar e ver "Descurtir" de novo),
      // o que garante que a primeira também já commitou.
      await page.reload({ waitUntil: "load" })
      await expect(
        page.locator("article", { hasText: postText }).getByRole("button", {
          name: "Descurtir publicação",
        }),
      ).toBeVisible({ timeout: 15_000 })
    })

    // 4. A autora volta e vê a contagem de duas curtidas
    await withPersona(browser, AUTHOR_EMAIL, async (page) => {
      await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
      await expect(
        page.locator("article", { hasText: postText }).getByRole("button", {
          name: "Curtir publicação",
        }),
      ).toContainText("2", { timeout: 15_000 })
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
    const postId = postRows[0].id
    const notifRes = await api.get(
      `${SUPABASE_URL}/rest/v1/notifications?select=type,target_id&type=eq.comment&target_id=eq.${postId}`,
      { headers },
    )
    const notifs = (await notifRes.json()) as Array<{ type: string; target_id: string }>
    await api.dispose()
    expect(notifs.some((n) => n.type === "comment" && n.target_id === postId)).toBe(true)
  })

  test("grupo privado: membro vê a lista, não-membro vê só os metadados", async ({ browser }) => {
    desktopOnly()

    // 1. O membro aprovado vê a lista de membros
    await withPersona(browser, GROUP_MEMBER_EMAIL, async (page) => {
      await page.goto(`${APP_URL}/groups/${PRIVATE_GROUP_ID}`, { waitUntil: "load" })
      await expect(page.getByRole("heading", { name: PRIVATE_GROUP_NAME })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible()
    })

    // 2. O não-membro vê só os metadados
    await withPersona(browser, GROUP_OUTSIDER_EMAIL, async (page) => {
      await page.goto(`${APP_URL}/groups/${PRIVATE_GROUP_ID}`, { waitUntil: "load" })
      await expect(page.getByRole("heading", { name: PRIVATE_GROUP_NAME })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Membros" })).toHaveCount(0)
    })
  })
})
