// Golden-slice E2E: Minha comunidade → compositor → audiência → publicação →
// feedback → reload → persistência, mais o caminho de erro.
//
// Cobre a fatia W1 do compositor com prova de UI real: dois cenários
// encadeados na mesma página, ambos terminados por um post visível e
// persistente no feed.
//
//   - Caminho feliz: o membro abre o compositor, escreve texto único
//     prefixado com "GS-E2E", deixa a audiência default (a sua vila),
//     confirma que o aviso de audiência descreve quem vai ler, submete
//     e verifica que aparece um feedback de sucesso (toast OU estado
//     pending), que o post renderiza no feed e que sobrevive a um reload
//     — prova de persistência real (não otimista).
//
//   - Caminho de erro: o mesmo membro intercepta o POST /rest/v1/posts
//     com route.abort() para simular falha de rede/PostgREST, submete
//     com texto novo, verifica que o FeedbackAlert danger aparece, que
//     o rascunho é preservado, que o modal continua aberto, e então
//     limpa a interceptação e publica com sucesso.
//
// Persona: dono-vila@bivaque.example.invalid — owner aprovada da Vila
// Ajuricaba (community 71000000-0000-4000-8000-000000000001 segundo o
// seed local). Mesma identidade usada por vila-home.spec.ts e
// audience-selector.spec.ts para a vila; é importante NÃO reusar o
// default session (visual@) que tem comunidade nula, porque sem
// comunidade /community renderiza CityReference e não há feed onde
// publicar.
//
// Determinístico: serial-safe (workers=1 no playwright.config) e os
// textos únicos por timestamp impedem colisão com execuções anteriores.
// Roda nos 3 viewports (mobile-375, tablet-768, desktop-1440) porque o
// shell é responsivo e o modal abre nos três.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { BrowserContext, Page } from "@playwright/test"
import { expect, request, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const CONSENT_COOKIE = "bivaque-consent-version"

// A mesma persona de vila-home.spec.ts (owner da Vila Ajuricaba, único
// membro aprovado que existe no seed).
const VILA_OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

// `import.meta.dirname` não funciona aqui — spec é transpilado para CJS e
// `require` quebra a coleta. Ler a partir do cwd (Playwright é sempre
// invocado da raiz do repo).
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
  const password = process.env["USER_PASSWORD"] ?? "bivaque-e2e-local"
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")
  if (!password) throw new Error("USER_PASSWORD is required")
  return { anonKey, password }
}

interface PasswordGrant {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

async function seedVilaOwnerSession(context: BrowserContext): Promise<void> {
  const { anonKey, password } = requireCredentials()
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email: VILA_OWNER_EMAIL, password },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(`Password grant for ${VILA_OWNER_EMAIL} failed: ${response.status()}`)
  }
  const grant = (await response.json()) as PasswordGrant
  await api.dispose()
  const cookieValue = encodeAuthCookieValue(grant, VILA_OWNER_EMAIL)
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: cookieValue,
      domain: "127.0.0.1",
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: CONSENT_COOKIE,
      value: CURRENT_CONSENT,
      domain: "127.0.0.1",
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ])
}

async function openComposer(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
  // O shell pode estar hidratando quando o Next respondeu. Esperar o h1
  // da vila aparecer antes de tentar abrir o compositor — sem isso, o
  // primeiro clique pode cair fora do handler de React e o modal nunca
  // abre.
  await expect(page.getByRole("heading", { name: "Vila Ajuricaba" })).toBeVisible({
    timeout: 20000,
  })
  await page.getByRole("button", { name: "Publicar" }).first().click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Criar publicação" })).toBeVisible()
}

test.setTimeout(180_000)

test.describe("golden slice: publicar → feedback → reload → persistência", {
  tag: "@stateful",
}, () => {
  test("caminho feliz publica na vila e o post persiste após reload", async ({ page }) => {
    // Given — sessão da owner aprovada da Vila Ajuricaba
    await seedVilaOwnerSession(page.context())

    const runToken = `gs-e2e-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const postText = `GS-E2E Olá vila, marcador da fatia W1 ${runToken}`

    // When — abre o compositor a partir da vila
    await openComposer(page)
    const dialog = page.getByRole("dialog")

    // And — vê o aviso de audiência descrevendo quem vai ler (a vila)
    const audienceNotice = dialog.getByTestId("audience-notice")
    await expect(audienceNotice).toBeVisible()
    await expect(audienceNotice).toContainText(/aprovados desta vila/i)

    // And — digita o texto único e submete
    await dialog.getByLabel("Conteúdo").fill(postText)
    const submit = dialog.getByTestId("publish-submit")
    const insertResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/posts") && response.request().method() === "POST",
      { timeout: 15000 },
    )
    await submit.click()

    // Then — a request ao PostgREST chega e responde 2xx (sucesso).
    const response = await insertResponse
    expect(response.status(), "POST /rest/v1/posts deve ser aceito").toBeGreaterThanOrEqual(200)
    expect(response.status()).toBeLessThan(300)

    // And — feedback de sucesso visível: toast OU estado pending; a rede
    // local costuma ser rápida demais para capturar o spinner, então o
    // assert é tolerante. O modal fecha (o contratual em publish-error
    // é success → resetForm + modal.close).
    const successToast = page
      .getByText(/Publicado na sua vila|Publicado para toda a cidade/i)
      .first()
    const successModalClosed = await dialog.isHidden().catch(() => false)
    if (!successModalClosed) {
      // Se o modal ainda está aberto (slow CI), o pending também prova
      // o caminho. Aceitamos qualquer um dos dois como prova de progresso.
      await expect(dialog.getByTestId("publish-submit")).toContainText(/Publicando/i)
    } else {
      // Modal fechou: o toast precisa estar visível na pilha do ToastProvider
      // montado em (shell)/layout.tsx. Esperar com tolerância a auto-dismiss.
      await expect(successToast).toBeVisible({ timeout: 5000 })
    }

    // And — o post aparece no feed da vila após o reload do onCreated()
    const post = page.locator("article", { hasText: postText })
    await expect(post).toBeVisible({ timeout: 15000 })

    // And — persiste depois de recarregar (prova de persistência real,
    // não otimista: o post foi mesmo escrito em posts e voltou via RLS).
    // Timeout generoso: o servidor dev local serve a primeira passagem
    // pós-reload bem mais devagar que o build de produção.
    await page.reload({ waitUntil: "load" })
    await expect(page.locator("article", { hasText: postText })).toBeVisible({
      timeout: 30000,
    })
  })

  test("caminho de erro: insert abortado mostra FeedbackAlert, preserva o rascunho, depois publica com sucesso", async ({
    page,
  }) => {
    // Given — sessão da owner aprovada
    await seedVilaOwnerSession(page.context())

    const runToken = `gs-e2e-err-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const errorPostText = `GS-E2E Rascunho do caminho de erro ${runToken}`
    const recoveryText = `GS-E2E Recuperação após erro ${runToken}`

    // When — o compositor está aberto
    await openComposer(page)
    const dialog = page.getByRole("dialog")

    // And — instalamos a interceptação do POST /rest/v1/posts antes de
    // submeter. O erro 500 do PostgREST força o caminho server do
    // classificador (classifyPublishError), que mantém a copy genérica
    // e preserva o draft.
    await page.route("**/rest/v1/posts", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "simulated upstream failure" }),
        })
      }
      return route.continue()
    })

    // And — o membro escreve e tenta publicar (vai falhar pelo abort)
    await dialog.getByLabel("Conteúdo").fill(errorPostText)
    await dialog.getByTestId("publish-submit").click()

    // Then — FeedbackAlert danger aparece com copy genérica
    // (DESIGN_SPEC §3.2: anti-enumeração; mensagem nunca cita o 500)
    await expect(
      dialog.getByText(/Não foi possível criar a publicação|Verifique sua conexão/i).first(),
    ).toBeVisible({ timeout: 10000 })

    // And — o rascunho foi preservado (texto continua no TextArea)
    await expect(dialog.getByLabel("Conteúdo")).toHaveValue(errorPostText)

    // And — o modal continua aberto para o caminho de recuperação
    await expect(dialog).toBeVisible()

    // And — o post NÃO chegou ao banco: o feed da vila ainda não o contém
    // porque a request foi abortada antes de chegar ao PostgREST.
    await expect(page.locator("article", { hasText: errorPostText })).toHaveCount(0)

    // And — limpamos a interceptação e reescrevemos o rascunho com novo
    // texto para publicar com sucesso
    await page.unroute("**/rest/v1/posts")
    await dialog.getByLabel("Conteúdo").fill(recoveryText)
    const successInsert = page.waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/posts") &&
        response.request().method() === "POST" &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 15000 },
    )
    await dialog.getByTestId("publish-submit").click()
    const okResponse = await successInsert
    expect(okResponse.status()).toBeGreaterThanOrEqual(200)
    expect(okResponse.status()).toBeLessThan(300)

    // And — feedback de sucesso visível (toast ou modal fechou)
    const modalClosed = await dialog.isHidden().catch(() => false)
    if (modalClosed) {
      await expect(
        page.getByText(/Publicado na sua vila|Publicado para toda a cidade/i).first(),
      ).toBeVisible({ timeout: 5000 })
    } else {
      await expect(dialog.getByTestId("publish-submit")).toContainText(/Publicando/i)
    }

    // And — o post de recuperação aparece no feed
    await expect(page.locator("article", { hasText: recoveryText })).toBeVisible({
      timeout: 15000,
    })
  })
})
