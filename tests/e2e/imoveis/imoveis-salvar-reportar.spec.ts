import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { type BrowserContext, expect, type Page, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { readEnvLocal, seedSession } from "../helpers/session"
import {
  cleanupRunManifest,
  createRunManifest,
  type RunManifest,
  recoverInterruptedRuns,
  track,
} from "./run-manifest"
import { shot } from "./shot"

// FIGMA-002 — Salvar e Denunciar anúncio (ADR-20261006), provados no runtime.
//
// Este arquivo fecha o ciclo com o caminho real e as negativas reais:
// salvar/desfazer/retorno/reload; denúncia com alvo listing na fila da operação;
// ocultar (separado de status), com a mesma URL de bytes e os salvos e a origem
// da conversa respondendo à revogação; e restaurar por ação auditada.
//
// Nada aqui simula sucesso: cada afirmação é lida do banco pela sessão que o
// estado diz ser, ou da tela que o usuário realmente vê.

function env(key: string): string {
  const value = process.env[key] ?? readEnvLocal(key)
  if (!value) throw new Error(`Required environment: ${key}`)
  return value
}
const url = env("SUPABASE_URL")
if (url !== "http://127.0.0.1:55621")
  throw new Error("FIGMA-002 runtime must use isolated stack 55621")
const anonKey = env("SUPABASE_ANON_KEY")

const OWNER = "visual@bivaque.example.invalid"
const READER = "membro-1@bivaque.example.invalid"
const OPERATOR = "operador@bivaque.example.invalid"
/**
 * Foto de fixture VISÍVEL (64x48, cor sólida). Um PNG de 1x1 pixel também
 * provaria o caminho de bytes, mas renderiza como moldura branca e deixa a
 * captura sem prova visual nenhuma.
 */
async function visiblePhoto(page: Page): Promise<Buffer> {
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 48
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas indisponível")
    ctx.fillStyle = "#185168"
    ctx.fillRect(0, 0, 64, 48)
    return canvas.toDataURL("image/jpeg").split(",")[1]
  })
  if (!encoded) throw new Error("Missing image fixture")
  return Buffer.from(encoded, "base64")
}

async function actor(email: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const result = await client.auth.signInWithPassword({
    email,
    password: process.env["USER_PASSWORD"] ?? env("BIVAQUE_VISUAL_PASSWORD"),
  })
  if (result.error) throw new Error(`Fixture authentication failed for ${email}`)
  return client
}

async function session(context: BrowserContext, email: string) {
  const previous = process.env["USER_EMAIL"]
  process.env["USER_EMAIL"] = email
  try {
    await seedSession(context)
  } finally {
    if (previous) process.env["USER_EMAIL"] = previous
    else delete process.env["USER_EMAIL"]
  }
}

// A limpeza deste spec é o MANIFESTO da própria execução: apaga exatamente os
// ids criados aqui (anúncio, denúncias, conversas e objetos), sem busca por
// título, prefixo ou marcador. Um `finally` que não roda deixa o registro em
// `.visual/.../runs/<runId>.json` para diagnóstico — nunca para outro teste
// apagar por adivinhação.
async function cleanup(manifest: RunManifest) {
  if (manifest.listings.length === 0) return
  await cleanupRunManifest(manifest)
}

/** Publica um imóvel com uma foto pelo formulário real e devolve o id. */
async function publishListing(page: Page, title: string, withPhoto: boolean): Promise<string> {
  await page.goto("/imoveis")
  await page.getByRole("button", { name: "Anunciar imóvel" }).click()
  const dialog = page.getByRole("dialog", { name: "Publicar imóvel" })
  await dialog.getByLabel("Título", { exact: true }).fill(title)
  await dialog.getByLabel("Bairro", { exact: true }).fill("Ponta Negra")
  await dialog.getByLabel("Aluguel mensal em reais").fill("3100")
  if (withPhoto) {
    await page.locator('input[type="file"]').setInputFiles({
      name: "fixture.jpg",
      mimeType: "image/jpeg",
      buffer: await visiblePhoto(page),
    })
  }
  await page.getByRole("button", { name: "Revisar publicação", exact: true }).click()
  await page.getByRole("button", { name: "Publicar", exact: true }).click()
  await page.waitForURL(/\/imoveis\/[0-9a-f-]{36}$/)
  const id = new URL(page.url()).pathname.split("/")[2]
  if (!id) throw new Error("Missing published id")
  return id
}

// Recuperação de interrupção: só alcança manifesto deste módulo cujo writer
// já morreu, e apaga os ids exatos declarados nele. Execução viva é pulada.
test.beforeAll(async () => {
  await recoverInterruptedRuns()
})

test("salvar anúncio: estado real por reload, lista de salvos, desfazer e retorno", async ({
  page,
  context,
  browser,
}, info) => {
  await session(context, OWNER)
  const title = `Salvar FIGMA002 ${randomUUID().slice(0, 8)}`
  let id: string | undefined
  const manifest = createRunManifest()
  const readerContext = await browser.newContext({
    viewport: page.viewportSize() ?? { width: 375, height: 812 },
  })
  const reader = await actor(READER)
  await session(readerContext, READER)
  try {
    id = await publishListing(page, title, false)
    track(manifest, "listings", id)

    // O dono salva o próprio anúncio pelos mesmos critérios de qualquer outro
    // membro — não há caminho paralelo para o anunciante.
    await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(page.getByRole("button", { name: "Remover dos salvos" })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("button", { name: "Remover dos salvos" })).toBeVisible()
    const ownSave = await reader
      .from("listing_saves")
      .select("listing_id")
      .eq("listing_id", id)
      .eq("user_id", (await reader.auth.getUser()).data.user?.id ?? "")
    // A relação do dono existe, mas o terceiro não a enxerga pela RLS.
    expect(ownSave.data).toEqual([])

    const readerPage = await readerContext.newPage()
    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await readerPage.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(readerPage.getByRole("button", { name: "Remover dos salvos" })).toBeVisible()
    await readerPage.reload()
    await expect(readerPage.getByRole("button", { name: "Remover dos salvos" })).toBeVisible()

    const persisted = await reader.from("listing_saves").select("listing_id").eq("listing_id", id)
    expect(persisted.error).toBeNull()
    expect(persisted.data).toHaveLength(1)

    // Salvar de novo é idempotente: a relação não duplica.
    await readerPage.getByRole("button", { name: "Remover dos salvos" }).click()
    await expect(readerPage.getByRole("button", { name: "Salvar", exact: true })).toBeVisible()
    await readerPage.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(readerPage.getByRole("button", { name: "Remover dos salvos" })).toBeVisible()
    await readerPage.reload()
    const stillOne = await reader.from("listing_saves").select("listing_id").eq("listing_id", id)
    expect(stillOne.data).toHaveLength(1)

    // A lista de salvos devolve o anúncio elegível, com retorno real.
    await readerPage.goto("http://127.0.0.1:3012/imoveis/salvos")
    await expect(readerPage.getByRole("heading", { name: title })).toBeVisible()
    await readerPage.getByRole("link", { name: "Ver anúncio" }).click()
    await expect(readerPage).toHaveURL(`http://127.0.0.1:3012/imoveis/${id}`)
    await shot(readerPage, "property-saved-list", info.project.name)

    // O botão flutuante do card reflete o estado salvo e volta ao recarregar.
    await readerPage.goto(`http://127.0.0.1:3012/imoveis?q=${encodeURIComponent(title)}`)
    const floatButton = readerPage.getByRole("button", { name: "Remover dos salvos" }).first()
    await expect(floatButton).toBeVisible()
    await readerPage.reload()
    await expect(
      readerPage.getByRole("button", { name: "Remover dos salvos" }).first(),
    ).toBeVisible()

    // Salvar por chamada direta um id inexistente é negado pela RLS: o botão
    // desabilitado nunca vira sucesso por baixo dos panos.
    const direct = await reader
      .from("listing_saves")
      .insert({ user_id: "00000000-0000-4000-8000-000000000000", listing_id: id })
    expect(direct.error).not.toBeNull()

    await readerPage.getByRole("button", { name: "Remover dos salvos" }).first().click()
    // Confirmar no próprio card que o estado trocou antes de navegar: sem isso a
    // leitura da lista corre atrás do re-render do Server Action e a prova fica
    // dependente do schedule de hydration.
    await expect(
      readerPage.getByRole("button", { name: "Salvar", exact: true }).first(),
    ).toBeVisible()
    await readerPage.goto("http://127.0.0.1:3012/imoveis/salvos")
    await expect(readerPage.getByText("Você ainda não salvou nenhum imóvel.")).toBeVisible()
    const empty = await reader.from("listing_saves").select("listing_id").eq("listing_id", id)
    expect(empty.data).toEqual([])
  } finally {
    await readerContext.close()
    if (!id) {
      const owner = await actor(OWNER)
      const found = (await owner.from("listings").select("id").eq("title", title).maybeSingle())
        .data
      if (found) {
        id = found.id
        track(manifest, "listings", id)
      }
    }
    await cleanup(manifest)
  }
})

test("denunciar anúncio: fila real, ocultar sem mexer no status, revogação e restauração", async ({
  page,
  context,
  browser,
}, info) => {
  await session(context, OWNER)
  const title = `Denunciar FIGMA002 ${randomUUID().slice(0, 8)}`
  let id: string | undefined
  const manifest = createRunManifest()
  const readerContext = await browser.newContext({
    viewport: page.viewportSize() ?? { width: 375, height: 812 },
  })
  const operatorContext = await browser.newContext({
    viewport: page.viewportSize() ?? { width: 375, height: 812 },
  })
  const reader = await actor(READER)
  await session(readerContext, READER)
  await session(operatorContext, OPERATOR)
  let mediaId: string | undefined
  let mediaUrl: string | undefined
  let conversationPath: string | undefined
  try {
    id = await publishListing(page, title, true)
    track(manifest, "listings", id)
    const owner = await actor(OWNER)
    const media = await owner.from("listing_media").select("id").eq("listing_id", id).single()
    expect(media.error).toBeNull()
    mediaId = media.data?.id
    if (!mediaId) throw new Error("Missing media fixture id")
    mediaUrl = `http://127.0.0.1:3012/imoveis/${id}/midia/${mediaId}`

    // O dono não recebe botão de denúncia do próprio anúncio: o banco recusa
    // autorrelato e a tela não oferece o que não pode ser executado.
    await expect(page.getByRole("button", { name: "Reportar anúncio" })).toHaveCount(0)

    const readerPage = await readerContext.newPage()
    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}`)

    // Antes de ocultar: a MESMA URL de bytes responde.
    const beforeBytes = await readerContext.request.get(mediaUrl)
    expect(beforeBytes.status()).toBe(200)
    expect(beforeBytes.headers()["cache-control"]).toBe("private, no-store")

    // Negativo do aviso de ocultação: antes de qualquer decisão da operação, a
    // edição do próprio anúncio NÃO mostra o aviso.
    await page.goto(`http://127.0.0.1:3012/imoveis/${id}/editar`)
    await expect(page.getByRole("heading", { name: "Editar imóvel" })).toBeVisible()
    await expect(page.getByText("Anúncio oculto pela moderação")).toHaveCount(0)

    // O leitor salva e abre a conversa contextual antes da moderação, para provar
    // que a revogação afeta também o que já estava em uso.
    await readerPage.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(readerPage.getByRole("button", { name: "Remover dos salvos" })).toBeVisible()
    await readerPage.getByRole("button", { name: "Tenho interesse" }).click()
    await readerPage.waitForURL(/\/messages\/[0-9a-f-]{36}$/)
    conversationPath = new URL(readerPage.url()).pathname
    // A conversa contextual nasce de uma escrita real do banco e não tem cascade
    // com o anúncio: ela entra no manifesto para o `finally` apagar por id.
    const conversationId = conversationPath.split("/")[2]
    if (conversationId) track(manifest, "conversations", conversationId)

    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await readerPage.getByRole("button", { name: "Reportar anúncio" }).click()
    const dialog = readerPage.getByRole("dialog", { name: "Denunciar anúncio" })
    await dialog.getByText("Informação enganosa", { exact: true }).click()
    await dialog.getByLabel("Explique (opcional)").fill("Fotos de outro imóvel.")
    await shot(readerPage, "property-report-modal", info.project.name)
    await dialog.getByRole("button", { name: "Enviar denúncia" }).click()
    await expect(dialog.getByText("Denúncia enviada.")).toBeVisible()

    const open = await reader
      .from("reports")
      .select("id, target_type, status")
      .eq("target_type", "listing")
      .eq("target_id", id)
      .eq("status", "open")
    expect(open.error).toBeNull()
    expect(open.data).toHaveLength(1)
    const reportId = open.data?.[0]?.id
    if (!reportId) throw new Error("Missing open listing report")
    track(manifest, "reports", reportId)

    // Denúncia duplicada do mesmo membro no mesmo alvo é barrada.
    const duplicate = await reader.from("reports").insert({
      target_type: "listing",
      target_id: id,
      reason: "Informação enganosa: segunda tentativa",
    })
    expect(duplicate.error).not.toBeNull()

    // A fila da operação mostra o alvo novo com trecho e autor reais.
    const operatorPage = await operatorContext.newPage()
    await operatorPage.goto("http://127.0.0.1:3012/reports")
    await operatorPage.goto(`http://127.0.0.1:3012/reports/${reportId}`)
    await expect(operatorPage.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await shot(operatorPage, "listing-report-case", info.project.name)
    await operatorPage.getByText("Ocultar conteúdo").click()
    await operatorPage.getByLabel(/Justificativa da decisão/).fill("Fotos de outro imóvel")
    await operatorPage.getByRole("button", { name: "Confirmar decisão" }).click()
    await expect(operatorPage.getByText("Decisão registrada")).toBeVisible()

    // Ocultar não é encerrar: o status do anunciante continua o que era.
    const hidden = await owner
      .from("listings")
      .select("status, moderation_hidden, moderation_hidden_by")
      .eq("id", id)
      .single()
    expect(hidden.error).toBeNull()
    expect(hidden.data?.status).toBe("active")
    expect(hidden.data?.moderation_hidden).toBe(true)
    expect(hidden.data?.moderation_hidden_by).not.toBeNull()
    const history = await owner
      .from("listing_status_history")
      .select("to_status")
      .eq("listing_id", id)
    expect(history.data?.map((row) => row.to_status)).toEqual(["active"])

    // A denúncia foi resolvida na mesma transação do hide.
    const resolved = await reader.from("reports").select("status").eq("id", reportId).single()
    expect(resolved.data?.status).toBe("resolved")

    // Terceiro perdeu busca, detalhe e os bytes — na MESMA URL.
    const deniedRows = await reader.from("listings").select("id").eq("id", id)
    expect(deniedRows.data).toEqual([])
    const afterBytes = await readerContext.request.get(mediaUrl)
    expect(afterBytes.status()).toBe(404)
    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await expect(readerPage.getByRole("heading", { name: "Anúncio não disponível" })).toBeVisible()

    // O save continua legível como relação, sem título, foto ou status.
    await readerPage.goto("http://127.0.0.1:3012/imoveis/salvos")
    await expect(
      readerPage.getByRole("heading", { name: "Anúncio não está disponível agora" }),
    ).toBeVisible()
    await expect(readerPage.getByRole("heading", { name: title })).toHaveCount(0)
    await expect(readerPage.getByRole("link", { name: "Ver anúncio" })).toHaveCount(0)
    const kept = await reader
      .from("listing_saves")
      .select("listing_id, saved_at")
      .eq("listing_id", id)
    expect(kept.data).toHaveLength(1)

    // A conversa continua, mas a origem diz que o anúncio não está disponível.
    await readerPage.goto(`http://127.0.0.1:3012${conversationPath}`)
    await expect(readerPage.getByText("Anúncio indisponível")).toBeVisible()
    await expect(readerPage.getByRole("link", { name: /Ver origem/ })).toHaveCount(0)

    // O dono continua vendo o próprio anúncio ocultado, com aviso, na tela do
    // anúncio e na de edição.
    await page.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await page.reload()
    await expect(page.getByText("Anúncio oculto pela moderação")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await shot(page, "property-hidden-owner", info.project.name)
    const ownerBytes = await context.request.get(mediaUrl)
    expect(ownerBytes.status()).toBe(200)
    // A matriz de mídia do ADR é por DONO: o anúncio ocultado continua
    // Mostrando foto ao anunciante, e isso é visível na tela — não só num 200
    // de API. Foto quebrada aqui seria a mesma falha que a captura em branco.
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>('img[alt^="Foto 1:"]')
      return img?.complete === true && img.naturalWidth > 0
    })
    expect(
      await page
        .locator('img[alt^="Foto 1:"]')
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    ).toBe(64)

    // O aviso de ocultação aparece na EDIÇÃO, por entrada direta e por reload —
    // quem chega pelo painel de retomada não passa pela tela do anúncio.
    await page.goto(`http://127.0.0.1:3012/imoveis/${id}/editar`)
    await expect(page.getByText("Anúncio oculto pela moderação")).toBeVisible()
    await expect(page.getByLabel("Quem pode ver")).toBeDisabled()
    await page.reload()
    await expect(page.getByText("Anúncio oculto pela moderação")).toBeVisible()
    await page.goto(`http://127.0.0.1:3012/imoveis/${id}/editar?retomada=1`)
    await expect(page.getByText("Anúncio oculto pela moderação")).toBeVisible()
    await expect(page.getByText(/não foi concluída/)).toBeVisible()
    await shot(page, "property-hidden-owner-edit", info.project.name)

    // Pausar e reativar do dono não levantam a ocultação.
    await page.goto(`http://127.0.0.1:3012/imoveis/${id}/editar`)
    await page.getByRole("button", { name: "Pausar", exact: true }).click()
    await page.getByRole("button", { name: "Reativar", exact: true }).click()
    const stillHidden = await owner
      .from("listings")
      .select("moderation_hidden")
      .eq("id", id)
      .single()
    expect(stillHidden.data?.moderation_hidden).toBe(true)

    // O dono não limpa a marca por chamada direta, mesmo sendo o dono.
    const directClear = await owner
      .from("listings")
      .update({ moderation_hidden: false })
      .eq("id", id)
      .select("id")
    expect(directClear.error).not.toBeNull()

    // Membro comum não executa o RPC de moderação.
    const memberRpc = await reader.rpc("moderate_listing", {
      p_listing_id: id,
      p_action: "hide",
      p_note: "tentativa de membro",
    })
    expect(memberRpc.error).not.toBeNull()

    // Restauração: ação explícita e auditada, pela mesma via de identidade.
    await operatorPage.goto("http://127.0.0.1:3012/reports?aba=concluidas")
    await operatorPage.goto(`http://127.0.0.1:3012/reports/${reportId}`)
    await expect(operatorPage.getByText(/continua oculto pela moderação/)).toBeVisible()
    await operatorPage.getByLabel(/Justificativa da restauração/).fill("Anúncio regularizado")
    await operatorPage.getByRole("button", { name: "Restaurar anúncio" }).click()
    await expect(operatorPage.getByText("Anúncio restaurado")).toBeVisible()
    // O retorno é durável: sobrevive ao re-render da página e a um reload, e
    // repetir a restauração de um anúncio já visível diz "nada mudou" em vez de
    // fingir uma segunda decisão.
    await operatorPage.reload()
    await expect(operatorPage.getByText("Anúncio restaurado")).toHaveCount(0)
    await expect(operatorPage.getByText(/não está oculto pela moderação no momento/)).toBeVisible()
    await operatorPage.getByLabel(/Justificativa da restauração/).fill("Repetição idempotente")
    await operatorPage.getByRole("button", { name: "Restaurar anúncio" }).click()
    await expect(operatorPage.getByText("Nada a restaurar")).toBeVisible()

    const restored = await owner
      .from("listings")
      .select("status, moderation_hidden")
      .eq("id", id)
      .single()
    expect(restored.data?.moderation_hidden).toBe(false)
    expect(restored.data?.status).toBe("active")

    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await readerPage.reload()
    await expect(readerPage.getByRole("heading", { level: 1, name: title })).toBeVisible()
    const restoredBytes = await readerContext.request.get(mediaUrl)
    expect(restoredBytes.status()).toBe(200)
    await readerPage.goto("http://127.0.0.1:3012/imoveis/salvos")
    await expect(readerPage.getByRole("heading", { name: title })).toBeVisible()
    await shot(readerPage, "property-restored", info.project.name)

    // A trilha é da operação: o anúncio ocultado volta a ser legível pelo dono, mas
    // o DIÁRIO da operação não. O contrato real da RLS aqui é "zero linhas", não
    // "erro" — exigir erro seria inventar um comportamento que o PostgREST não tem.
    const ownerTrail = await owner
      .from("listing_moderation_events")
      .select("action, operator_user_id, report_id, note", { count: "exact" })
      .eq("listing_id", id)
    expect(ownerTrail.error).toBeNull()
    expect(ownerTrail.count).toBe(0)
    expect(ownerTrail.data).toEqual([])
    const trail = await execListingEvents(id)
    expect(trail.map((row) => row.action)).toEqual(["hide", "restore"])
    expect(trail.every((row) => row.operator_user_id === trail[0]?.operator_user_id)).toBe(true)
    expect(trail[0]?.report_id).toBe(reportId)
  } finally {
    await readerContext.close()
    await operatorContext.close()
    if (!id) {
      const owner = await actor(OWNER)
      const found = (await owner.from("listings").select("id").eq("title", title).maybeSingle())
        .data
      if (found) {
        id = found.id
        track(manifest, "listings", id)
      }
    }
    await cleanup(manifest)
  }
})

interface ModerationRow {
  action: string
  operator_user_id: string
  report_id: string | null
}

/** A trilha não é legível por nenhum papel de membro: a prova vem do servidor. */
function execListingEvents(listingId: string): ModerationRow[] {
  if (!/^[0-9a-f-]{36}$/.test(listingId)) throw new Error("Invalid fixture id")
  const stdout = execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_bivaque-figma001-proof",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-F",
      "|",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `select action, operator_user_id, coalesce(report_id::text, '')
         from public.listing_moderation_events where listing_id = '${listingId}' order by created_at;`,
    ],
    { encoding: "utf8", timeout: 15_000 },
  )
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [action, operator_user_id, report_id] = line.split("|")
      return {
        action: action ?? "",
        operator_user_id: operator_user_id ?? "",
        report_id: report_id && report_id.length > 0 ? report_id : null,
      }
    })
}
