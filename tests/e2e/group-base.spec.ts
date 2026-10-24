// COM-003 (B1 do lote 5) — a base do grupo.
//
// A prova de ponta a ponta do contrato: criar grupo com regras (rótulos Aberto
// e Fechado), fixar uma publicação e trocar o aviso do grupo. A publicação é
// criada pela API (o composer de publicação de grupo é do C1; aqui o objeto do
// teste é a fixação, não a criação), com a sessão real da conta verificada.
//
// Tag @stateful: cria grupo e publicação no banco com seed, então roda no passo
// com estado (`test:e2e:stateful`), nunca no passo invertido do `test:e2e`.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const VISUAL_EMAIL = process.env["BIVAQUE_E2E_VISUAL_EMAIL"] ?? "visual@bivaque.example.invalid"
// Manaus e a conta de captura, do seed de desenvolvimento.
const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"
const VISUAL_DISPLAY_NAME = "Ana Verificada"

type PasswordGrantBody = {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

type Session = {
  accessToken: string
  anonKey: string
  userId: string
}

async function signInAs(page: Page, email: string): Promise<Session> {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password =
    process.env["USER_PASSWORD"] ??
    process.env["BIVAQUE_VISUAL_PASSWORD"] ??
    readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")
  if (!password) throw new Error("USER_PASSWORD is required")

  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
  }
  const body = (await response.json()) as PasswordGrantBody
  const claims = JSON.parse(
    Buffer.from(body.access_token.split(".")[1] ?? "", "base64").toString("utf8"),
  ) as { sub: string; aud: string; role: string }

  const cookieValue = encodeAuthCookieValue(body, email)
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
  await page.context().addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])

  return { accessToken: body.access_token, anonKey, userId: claims.sub }
}

async function findGroupId(page: Page, session: Session, name: string): Promise<string> {
  const response = await page
    .context()
    .request.get(`${SUPABASE_URL}/rest/v1/groups?select=id&name=eq.${encodeURIComponent(name)}`, {
      headers: {
        apikey: session.anonKey,
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
  const rows = (await response.json()) as Array<{ id: string }>
  const id = rows[0]?.id
  if (!id) throw new Error(`o grupo "${name}" não voltou na consulta`)
  return id
}

// A publicação de preparo tem data conhecida: a prova confere que o cartão da
// fixada mostra a data real da publicação, não um rótulo inventado. Doze dias
// atrás cai na faixa em que o cartão mostra a data completa (≥ 7 dias).
async function createGroupPost(
  page: Page,
  session: Session,
  groupId: string,
  content: string,
  createdAt: string,
): Promise<void> {
  const response = await page.context().request.post(`${SUPABASE_URL}/rest/v1/posts`, {
    headers: {
      apikey: session.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      locality_id: MANAUS_LOCALITY_ID,
      user_id: session.userId,
      group_id: groupId,
      post_type: "text",
      content,
      created_at: createdAt,
    },
  })
  if (response.status() >= 300) {
    throw new Error(`falha ao criar a publicação de preparo (HTTP ${response.status()})`)
  }
}

// Toda ação de tela aqui é uma Server Action: o cliente faz POST na própria
// rota. Esperar a resposta antes de asserir evita correr contra a navegação.
function waitForGroupPost(page: Page, groupId: string) {
  return page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().includes(`/groups/${groupId}`),
    { timeout: 20_000 },
  )
}

// O ciclo é longo (cria grupo pela tela, cria e fixa a publicação, responde,
// denuncia e troca o aviso, nos três tamanhos): o teto padrão de 30 s não cabe.
// Mesmo remédio de close-label-ptbr.spec.ts e feed-attachment-publish.spec.ts.
test.setTimeout(120_000)

test.describe("COM-003 — a base do grupo", { tag: "@stateful" }, () => {
  test("cria grupo com regras, fixa a publicação e troca o aviso", async ({ page }) => {
    const session = await signInAs(page, VISUAL_EMAIL)

    const suffix = Date.now()
    const groupName = `Grupo COM-003 ${suffix}`
    const rulesText = "Regras COM-003: respeito, sem dado pessoal de terceiros."
    const postContent = "Publicação que a prova do COM-003 vai fixar no topo."
    const commentText = "Primeira resposta da prova do COM-003."
    const postCreatedAt = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
    const postDate = new Date(postCreatedAt).toLocaleDateString("pt-BR")

    // ── Criar grupo, com as regras e o rótulo Aberto ────────────────────────
    await page.goto("/groups")
    await page.getByRole("button", { name: "Criar grupo" }).first().click()

    const nameField = page.getByRole("textbox", { name: "Nome do grupo" })
    await nameField.fill(groupName)
    await page.getByRole("textbox", { name: "Sobre o grupo" }).fill("Grupo criado pela prova.")
    await page.getByRole("textbox", { name: "Regras do grupo" }).fill(rulesText)
    await expect(page.getByRole("radio", { name: /Aberto/ })).toBeVisible()
    await expect(page.getByRole("radio", { name: /Fechado/ })).toBeVisible()

    const created = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/rest/v1/rpc/create_group"),
    )
    await page
      .locator("form")
      .filter({ has: nameField })
      .getByRole("button", { name: "Criar", exact: true })
      .click()
    await created

    const groupLink = page.getByRole("link", { name: groupName })
    await expect(groupLink).toBeVisible({ timeout: 15_000 })

    const groupId = await findGroupId(page, session, groupName)

    // ── Detalhe: rótulo Aberto e as regras ─────────────────────────────────
    await groupLink.click()
    await page.waitForURL(`**/groups/${groupId}`)
    await expect(page.getByRole("heading", { level: 1, name: groupName })).toBeVisible()
    await expect(page.getByText("Aberto", { exact: true })).toBeVisible()

    // O resumo de "Regras do grupo" abre com o clique de verdade do Playwright —
    // nunca um `el.click()` pelo DOM, que passaria por fora do teste de alvo.
    const rulesSummary = page.locator("summary", { hasText: "Regras do grupo" })
    await rulesSummary.click()
    // O texto das regras também vive no textarea do painel de administração
    // (mesma conta dona). A prova lê o parágrafo dentro do `<details>` que a
    // pessoa acabou de abrir, não o campo de edição.
    const rulesPanel = page.locator("details", { hasText: "Regras do grupo" })
    await expect(rulesPanel.getByText(rulesText, { exact: true })).toBeVisible()

    // ── Fixar uma publicação do grupo ──────────────────────────────────────
    await createGroupPost(page, session, groupId, postContent, postCreatedAt)
    await page.reload()

    await expect(page.getByText(postContent)).toBeVisible()
    // De volta ao topo: com a página rolada, o cabeçalho pegajoso cobre o alvo
    // do clique.
    await page.evaluate(() => window.scrollTo(0, 0))
    const pinResponse = waitForGroupPost(page, groupId)
    await page.getByRole("button", { name: /Fixar publicação de/ }).click()
    await pinResponse

    await expect(page.getByRole("heading", { name: "Aviso fixado" })).toBeVisible()
    const pinned = page.getByRole("region", { name: "Aviso fixado" })
    // A publicação fixada é uma publicação comum: autor, data, comentários e
    // denúncia continuam ali.
    await expect(pinned.getByText(VISUAL_DISPLAY_NAME)).toBeVisible()
    await expect(pinned.getByText(postDate)).toBeVisible()
    await expect(pinned.getByRole("button", { name: /Responder/ })).toBeVisible()
    await expect(page.getByRole("button", { name: "Desafixar" })).toBeVisible()

    // ── Responder de verdade, de dentro da fixada ──────────────────────────
    await page.evaluate(() => window.scrollTo(0, 0))
    await pinned.getByRole("button", { name: /Responder/ }).click()
    await pinned.getByRole("textbox", { name: "Comentário" }).fill(commentText)
    await pinned.getByRole("button", { name: "Enviar comentário" }).click()
    await expect(pinned.getByText(commentText)).toBeVisible({ timeout: 15_000 })

    // ── A denúncia abre a partir da fixada ────────────────────────────────
    await pinned.getByRole("button", { name: "Mais opções" }).click()
    await page.getByRole("menuitem", { name: "Denunciar publicação" }).click()
    await expect(page.getByText("Por que você está denunciando esta publicação?")).toBeVisible()
    await page.getByRole("button", { name: "Cancelar" }).click()

    // ── Trocar o aviso do grupo ────────────────────────────────────────────
    const notifySelect = page.getByLabel("Avisos do grupo")
    await expect(notifySelect).toHaveValue("highlights")

    const notifyResponse = waitForGroupPost(page, groupId)
    await page.evaluate(() => window.scrollTo(0, 0))
    await notifySelect.selectOption("none")
    await page.getByRole("button", { name: "Salvar avisos" }).click()
    await notifyResponse

    // Recarrega para provar a persistência: o valor e a dica vêm do banco, e o
    // comentário enviado de dentro da fixada continua na publicação.
    await page.reload()
    await expect(page.getByLabel("Avisos do grupo")).toHaveValue("none")
    await expect(page.getByText("As publicações aparecem só na Início")).toBeVisible()
    // O comentário enviado de dentro da fixada continua na publicação: a lista
    // carrega ao abrir "Responder", como qualquer pessoa faria.
    const pinnedAfterReload = page.getByRole("region", { name: "Aviso fixado" })
    // Depois do comentário o rodapé passa a mostrar "1 resposta".
    await pinnedAfterReload.getByRole("button", { name: /Responder|resposta/ }).click()
    await expect(pinnedAfterReload.getByText(commentText)).toBeVisible({ timeout: 15_000 })
  })
})
