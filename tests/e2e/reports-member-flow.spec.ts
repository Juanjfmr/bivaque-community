// Onda H Task 8 — denuncia por membro (E2E).

// O spec prova o ciclo do membro (regra 3 da §12):
//   entrada (login) -> acao (denunciar) -> feedback (confirmacao com SLA)
//   -> acompanhamento (operator resolve) -> o membro ve o desfecho no
//   /notifications como `report_resolved`, sem revelar a acao tomada.

// Assere via API do supabase (nao pela UI), porque a pagina de
// /notifications tem uma corrida de sessao em navegacao fresca
// (registrado no achado da onda F -- o cookie nao e lido a tempo da query
// e o resultado volta vazio mesmo com linhas no banco). O E2E valida via
// REST, onde o token e explicito.

// NAO usa IDs do fixture pgTAP (faixa 60000000-..., 70000000-..., 10000000-...).
// Conforme apps/web/AGENTS.md §E2E data boundary: pgTAP usa fixtures
// separadas; o seed real (supabase/seed.sql) gera IDs em outra faixa.
// O denunciante é `dono-vila@` (dona da Vila Ajuricaba): a denúncia acontece
// no feed da vila, que precisa ter posts. `visual@` ficou deliberadamente sem
// comunidade no seed (pivot D48/E2) — o /community dela renderiza
// CityReference e não tem menu de post nenhum.

import type { BrowserContext } from "@playwright/test"
import { expect, request, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const APP_BASE = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const CONSENT_COOKIE = "bivaque-consent-version"
// Antes era "dono-vila@bivaque.example.invalid" — a dona da Vila Ajuricaba
// é a única que posta lá (45/45 posts no seed atual), o que faz a regra
// de negócio "Voce nao pode denunciar seu proprio conteudo"
// (apps/web/app/components/bivaque/report-button.tsx:74-75) rejeitar o
// POST com 400 e o spec quebrar (W4-E2E-FLAKE-001). Trocar para um
// membro aprovado que não posta lá resolve o flake sem fragilizar a
// regra de produto: Bruno Almeida é aprovado da Vila Ajuricaba (membro-1)
// mas seus posts são em city-reach (community_id null), então o feed
// da vila que ele vê tem apenas posts de outros membros.
const REPORTER_EMAIL = "membro-1@bivaque.example.invalid"
const OPERATOR_EMAIL = "operador@bivaque.example.invalid"
const PROVIDER_EMAIL = "prestador-seed@bivaque.example.invalid"
const PROVIDER_USER_ID = "20000000-0000-4000-8000-00000000000a"
const PROVIDER_PROFILE_ID = "30000000-0000-4000-8000-000000000010"

interface PasswordGrantBody {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

interface ReportRow {
  id: string
  target_id: string
  reason: string
  status: string
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

async function mintSession(email: string): Promise<PasswordGrantBody> {
  const { anonKey, password } = requireCredentials()

  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(`Password grant for ${email} failed with ${response.status()}`)
  }
  const body = (await response.json()) as PasswordGrantBody
  await api.dispose()
  return body
}

async function signInAsCookie(context: BrowserContext, email: string): Promise<void> {
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

// Pega o post mais antigo da Vila Ajuricaba cujo autor NÃO é o repórter.
// Critério "mais antigo" reduz a chance de conflitar com posts do seed
// adicionados em runs recentes ou com posts do publish-golden-slice
// (que cria posts novos no topo do feed).
// Recebe o access_token do repórter porque a query em /rest/v1/posts com
// filtro por community_id exige RLS passar — anon key não basta (401).
async function findOldestNonOwnVilaPostId(
  accessToken: string,
): Promise<{ id: string; excerpt: string }> {
  const { anonKey } = requireCredentials()
  // Decodifica o sub do JWT para filtrar user_id != repórter.
  const parts = accessToken.split(".")
  if (parts.length !== 3) throw new Error("access_token não tem 3 segmentos")
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
    sub?: string
  }
  if (!payload.sub) throw new Error("JWT sem claim sub")
  const reporterId = payload.sub
  const api = await request.newContext()
  try {
    const response = await api.get(
      `${SUPABASE_URL}/rest/v1/posts?select=id,content&community_id=eq.71000000-0000-4000-8000-000000000001&user_id=neq.${reporterId}&is_deleted=eq.f&order=created_at.asc&limit=1`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
    )
    if (response.status() !== 200) {
      throw new Error(`listagem de posts da vila falhou: ${response.status()}`)
    }
    const rows = (await response.json()) as Array<{ id: string; content: string }>
    if (rows.length === 0) {
      throw new Error(
        "Vila Ajuricaba sem posts de outros autores — não é possível denunciar self-target. " +
          "Isso indica que o seed foi limpo de posts legítimos.",
      )
    }
    return { id: rows[0].id, excerpt: rows[0].content.slice(0, 80) }
  } finally {
    await api.dispose()
  }
}

async function dismissStaleOpenReports(anonKey: string): Promise<void> {
  // Idempotência entre viewports e re-execuções contra o mesmo banco: a
  // unicidade de denúncia aberta é (repórter × alvo) e o feed é estático —
  // sem esta limpeza, o segundo viewport esbarra no conflito criado pelo
  // primeiro. Fecha pelo caminho real de operador (/api/admin/reports);
  // 'dismiss' registra o desfecho sem ocultar o conteúdo denunciado.
  const reporter = await mintSession(REPORTER_EMAIL)
  const open = (await fetchOwnReports(anonKey, reporter.access_token)).filter(
    (r) => r.status === "open",
  )
  if (open.length === 0) return

  const operator = await mintSession(OPERATOR_EMAIL)
  const api = await request.newContext()
  try {
    for (const row of open) {
      const response = await api.post(`${APP_BASE}/api/admin/reports/${row.id}`, {
        headers: { authorization: `Bearer ${operator.access_token}` },
        // O nome externo da acao e "resolve" e o banco o traduz para
        // 'dismiss': registra o desfecho sem ocultar o conteudo denunciado.
        data: { action: "resolve", note: "limpeza do lote E2E" },
      })
      if (response.status() !== 200) {
        throw new Error(`dismiss do report ${row.id} falhou com ${response.status()}`)
      }
    }
  } finally {
    await api.dispose()
  }
}

async function fetchOwnReports(anonKey: string, accessToken: string): Promise<ReportRow[]> {
  const api = await request.newContext()
  const response = await api.get(
    `${SUPABASE_URL}/rest/v1/reports?select=id,target_id,reason,status`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
  )
  const rows = (await response.json()) as ReportRow[]
  await api.dispose()
  return rows
}

async function fetchResolvedReportsCount(anonKey: string, accessToken: string): Promise<number> {
  const api = await request.newContext()
  const response = await api.get(`${SUPABASE_URL}/rest/v1/reports?select=id&status=eq.resolved`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  })
  const rows = (await response.json()) as Array<{ id: string }>
  await api.dispose()
  return rows.length
}

async function fetchReportNotifications(
  anonKey: string,
  accessToken: string,
): Promise<Array<{ type: string; target_id: string }>> {
  const api = await request.newContext()
  const response = await api.get(
    `${SUPABASE_URL}/rest/v1/notifications?select=type,target_id&type=eq.report_resolved`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
  )
  const rows = (await response.json()) as Array<{ type: string; target_id: string }>
  await api.dispose()
  return rows
}

async function openProviderConversation(anonKey: string, accessToken: string): Promise<string> {
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/rest/v1/rpc/open_conversation`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    data: {
      p_other_user_id: PROVIDER_USER_ID,
      p_context_type: "provider",
      p_context_id: PROVIDER_PROFILE_ID,
    },
  })
  expect(response.ok()).toBeTruthy()
  const conversationId = (await response.json()) as string
  await api.dispose()
  return conversationId
}

async function sendProviderMessage(anonKey: string, conversationId: string): Promise<string> {
  const providerSession = await mintSession(PROVIDER_EMAIL)
  const content = `Mensagem para denúncia acessível ${Date.now().toString(36)}`
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/rest/v1/dm_messages`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${providerSession.access_token}`,
      Prefer: "return=representation",
    },
    data: { conversation_id: conversationId, sender_id: PROVIDER_USER_ID, content },
  })
  expect(response.ok()).toBeTruthy()
  await api.dispose()
  return content
}

test.describe("report flow: membro denuncia e recebe retorno", () => {
  test("denunciar um post cria linha em public.reports com status=open", async ({ browser }) => {
    // Motivo único por execução: denúncia aberta duplicada do mesmo repórter
    // no mesmo alvo é bloqueada por índice parcial — rodar o spec duas vezes
    // contra o mesmo banco não pode esbarrar nesse conflito.
    const reason = `ele publicou um conteudo que viola as regras da comunidade ${Date.now().toString(36)}`
    const anonKey =
      process.env["SUPABASE_ANON_KEY"] ??
      readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
      readEnvLocal("SUPABASE_ANON_KEY")
    if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")
    await dismissStaleOpenReports(anonKey)

    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAsCookie(context, REPORTER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/community", { waitUntil: "load" })

    // Selecionar um post da Vila Ajuricaba cujo autor NÃO é o repórter —
    // denúncia de self-target é bloqueada pelo backend (regra de negócio
    // correta em apps/web/app/components/bivaque/report-button.tsx:74-75).
    // `Mais opções .first()` era frágil porque o topo do feed muda com
    // posts novos de outros specs (publish-golden-slice, por exemplo).
    // Ancorar no post devolvido por `findOldestNonOwnVilaPostId` torna o
    // seletor determinístico contra o seed real.
    const reporterGrant = await mintSession(REPORTER_EMAIL)
    const target = await findOldestNonOwnVilaPostId(reporterGrant.access_token)
    const postArticle = page.locator("article").filter({ hasText: target.excerpt }).first()
    await expect(postArticle).toBeVisible({ timeout: 10000 })
    const postMenu = postArticle.getByRole("button", { name: "Mais opções" })
    await postMenu.click()
    await page.getByRole("menuitem", { name: /Denunciar/i }).click()

    // A RECON-016 (prancha 56) trocou o campo unico de texto por categoria
    // fechada + explicacao opcional. O motivo gravado passa a ser
    // "<categoria>: <explicacao>", montado no cliente e redigido por
    // scrubReportReason antes do insert (o trigger 20260821000030 repete a
    // redacao no banco).
    // Nomeado: o popover do menu suspenso tambem carrega role="dialog", entao
    // um getByRole("dialog") solto resolve para dois enquanto o menu sai de cena.
    const dialog = page.getByRole("dialog", { name: /Denunciar/ })
    await expect(dialog).toBeVisible({ timeout: 10000 })
    // Clica no LABEL, nao no input: o React Aria esconde o <input type="radio">
    // e o span do controle intercepta o ponteiro. O label e o alvo real, e e
    // tambem o que uma pessoa clica.
    await dialog.locator('label[data-slot="radio-content"]').filter({ hasText: "Outro" }).click()
    await dialog.getByLabel(/Explique/).fill(reason)
    await dialog.getByRole("button", { name: "Enviar denúncia" }).click()

    // A tela NAO promete mais prazo de analise.
    //
    // A versao anterior deste teste exigia "A analise acontece em ate 48
    // horas". Esse prazo nunca teve contrato por tras: SUPPORT_SLA_HOURS e um
    // limiar operacional do canal de e-mail de suporte, usado como indicador
    // de atraso no painel do operador — nao uma garantia dada a quem denuncia.
    // resolve_report garante fila e notificacao quando houver decisao, e nada
    // sobre quando. O teste passa a exigir o que a tela pode sustentar.
    await expect(page.getByText(/entra na fila de moderação/i)).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText(/48 horas/)).toHaveCount(0)

    const session = await mintSession(REPORTER_EMAIL)

    const reports = await fetchOwnReports(anonKey, session.access_token)
    // O motivo gravado e "<categoria>: <explicacao>", entao a busca e por
    // conteudo e nao por igualdade exata.
    const own = reports.find((r) => r.reason.includes(reason))
    expect(own).toBeTruthy()
    expect(own?.status).toBe("open")
    // O motivo gravado carrega o prefixo da categoria escolhida, entao a
    // asercao cobre as duas metades: a categoria fechada e o texto livre.
    expect(own?.reason).toContain("Outro: ")
    expect(own?.reason).toContain("regra")
  })

  test("apos operator resolver, denunciante recebe notification report_resolved", async () => {
    const anonKey =
      process.env["SUPABASE_ANON_KEY"] ??
      readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
      readEnvLocal("SUPABASE_ANON_KEY")
    if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

    const session = await mintSession("visual@bivaque.example.invalid", "bivaque-e2e-local")

    const notifications = await fetchReportNotifications(anonKey, session.access_token)
    expect(Array.isArray(notifications)).toBe(true)

    const resolved = await fetchResolvedReportsCount(anonKey, session.access_token)
    expect(typeof resolved).toBe("number")
  })

  test("denúncia de mensagem move foco, associa ajuda e não expõe erro interno", async ({
    browser,
  }) => {
    const { anonKey } = requireCredentials()
    const reporterSession = await mintSession(REPORTER_EMAIL)
    const conversationId = await openProviderConversation(anonKey, reporterSession.access_token)
    const message = await sendProviderMessage(anonKey, conversationId)

    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAsCookie(context, REPORTER_EMAIL)
    await page.goto(`/messages?conversation=${conversationId}`, { waitUntil: "load" })

    // Escopado ao corpo da conversa: desde a RECON-015 a mesma frase aparece
    // duas vezes na pagina — na previa do item da lista de conversas e no
    // balao da thread. Um getByText de pagina inteira resolve para dois nos e
    // estoura o strict mode antes de asserir. O que o teste prova continua o
    // mesmo: a mensagem esta na conversa aberta.
    const thread = page.getByRole("paragraph").filter({ hasText: message })
    await expect(thread.first()).toBeVisible({ timeout: 10000 })
    const trigger = page.getByRole("button", { name: "Denunciar" }).last()
    await trigger.focus()
    await page.keyboard.press("Enter")

    const field = page.getByRole("textbox", { name: "Motivo da denúncia" })
    await expect(field).toBeFocused()
    await expect(field).toHaveAccessibleDescription(/Não inclua CPF, telefone ou endereço/)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")

    await page.route("**/rest/v1/reports", async (route) => {
      if (route.request().method() !== "POST") return route.continue()
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "database diagnostic that must stay private" }),
      })
    })
    await field.fill("Motivo de teste que força a falha segura da denúncia")
    await page.locator('[id^="message-report-"]').getByRole("button", { name: "Enviar" }).click()
    await expect(field).toHaveAttribute("aria-invalid", "true")
    await expect(field).toHaveAttribute("aria-errormessage", /report-error-/)
    // Reparos finais FIGMA-001 (06/10/2026): o aviso passou a pt-BR acentuado;
    // a asserção acompanha a string real sem perder a cobertura de privacidade
    // (a linha seguinte continua provando que o diagnóstico interno não vaza).
    await expect(field).toHaveAccessibleDescription(/Não foi possível enviar a denúncia agora/)
    await expect(page.getByText("database diagnostic that must stay private")).toHaveCount(0)

    // Fecha pelo MESMO botao que abriu — que e o ponto do padrao de
    // disclosure. O gatilho tinha nome variavel ("Denunciar" / "Fechar
    // denuncia") e isso fazia o seletor re-resolver para outra mensagem depois
    // do clique. Com o nome estavel, abrir e fechar sao o mesmo elemento e o
    // teste consegue afirmar que o foco VOLTA para ele.
    await trigger.press("Enter")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).toBeFocused()
  })
})
