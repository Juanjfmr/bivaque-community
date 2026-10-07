import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { LISTING_STATUS_LABELS } from "@bivaque/domain"
import { type BrowserContext, expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { readEnvLocal, seedSession } from "../helpers/session"
import { shot } from "./shot"

function env(key: string): string {
  const value = process.env[key] ?? readEnvLocal(key)
  if (!value) throw new Error(`Required environment: ${key}`)
  return value
}
const url = env("SUPABASE_URL")
if (url !== "http://127.0.0.1:55621")
  throw new Error("FIGMA-002 runtime must use isolated stack 55621")
const storageService = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
})
// listings deliberately has no service_role SELECT grant. Runtime assertions
// use the authenticated owner; storage administration is isolated to cleanup.
const service = createClient(url, env("SUPABASE_ANON_KEY"), { auth: { persistSession: false } })
test.beforeAll(async () => {
  const result = await service.auth.signInWithPassword({
    email: "visual@bivaque.example.invalid",
    password: process.env["USER_PASSWORD"] ?? env("BIVAQUE_VISUAL_PASSWORD"),
  })
  if (result.error) throw new Error("Owner fixture authentication failed")
})
async function actor(email: string) {
  const client = createClient(url, env("SUPABASE_ANON_KEY"), { auth: { persistSession: false } })
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
async function cleanup(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid cleanup fixture id")
  const media = await service.from("listing_media").select("object_path").eq("listing_id", id)
  if (media.error) throw media.error
  if (media.data?.length) {
    const removed = await storageService.storage
      .from("listing-photos")
      .remove(media.data.map((row) => row.object_path))
    if (removed.error) throw removed.error
  }
  // Fixture-only deletion, no reset/grants/schema edits. Container and API are
  // pinned to 556; SQL is constrained to the ID produced by this test.
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_bivaque-figma001-proof",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `begin; delete from public.listings where id='${id}'; delete from public.dm_conversations where context_type='listing' and context_id='${id}'; commit;`,
    ],
    { stdio: "pipe", timeout: 10_000 },
  )
}

test("imoveis publicar, buscar, editar, interesse e conversa com dois atores e reload", async ({
  page,
  context,
  browser,
}, info) => {
  await session(context, "visual@bivaque.example.invalid")
  const title = `Apartamento FIGMA002 ${randomUUID().slice(0, 8)}`
  let id: string | undefined
  const readerContext = await browser.newContext({
    viewport: page.viewportSize() ?? { width: 375, height: 812 },
  })
  try {
    await page.goto("/imoveis")
    await expect(page.getByRole("heading", { name: "Um lugar para chamar de casa" })).toBeVisible()
    await page.getByRole("button", { name: "Anunciar imóvel" }).click()
    const dialog = page.getByRole("dialog", { name: "Publicar imóvel" })
    await dialog.getByLabel("Título", { exact: true }).fill(title)
    await dialog.getByLabel("Bairro", { exact: true }).fill("Ponta Negra")
    await dialog.getByLabel("Aluguel mensal em reais").fill("3200")
    await dialog.getByLabel("Condomínio em reais").fill("720")
    await dialog.getByLabel("Quartos", { exact: true }).fill("3")
    await dialog.getByLabel("Área em m²").fill("98")
    await dialog
      .getByLabel("Descrição")
      .fill("Apartamento claro e ventilado. Agende uma visita para conhecer.")
    await shot(page, "property-publish", info.project.name)
    await dialog.getByRole("button", { name: "Revisar publicação", exact: true }).click()
    await expect(page.getByText("O conteúdo só será salvo quando você confirmar.")).toBeVisible()
    const before = await service.from("listings").select("id").eq("title", title)
    expect(before.error).toBeNull()
    expect(before.data).toEqual([])
    await shot(page, "property-review", info.project.name)
    await page.getByRole("button", { name: "Publicar", exact: true }).click()
    await page.waitForURL(/\/imoveis\/[0-9a-f-]{36}$/)
    id = new URL(page.url()).pathname.split("/")[2]
    expect(id).toBeTruthy()
    if (!id) throw new Error("Missing published id")
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole("region", { name: "Quem está anunciando" })).toBeVisible()
    await expect(
      page
        .getByRole("region", { name: "Quem está anunciando" })
        .getByRole("link", { name: /Ana Verificada/ }),
    ).toHaveAttribute("href", /\/profile\/[0-9a-f-]{36}$/)
    const neighborhoodLink = page.getByRole("link", { name: "Ver bairro no mapa ↗" })
    await expect(neighborhoodLink).toHaveAttribute(
      "href",
      /query=Ponta%20Negra%2C%20Manaus%2C%20Brasil/,
    )
    if (!(await page.evaluate(() => typeof navigator.share === "function"))) {
      await context.grantPermissions(["clipboard-read", "clipboard-write"])
      await page.getByRole("button", { name: "Compartilhar", exact: true }).click()
      await expect(page.getByRole("status").filter({ hasText: "Link copiado." })).toBeVisible()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        `http://127.0.0.1:3012/imoveis/${id}`,
      )
    }
    await expect(page.getByRole("button", { name: "Tenho interesse" })).toBeDisabled()
    await page.reload()
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await shot(page, "property-detail", info.project.name)
    await page.getByRole("link", { name: "Editar imóvel", exact: true }).click()
    await expect(page.getByLabel("Quem pode ver")).toBeDisabled()
    await page.getByLabel("Título", { exact: true }).fill(`${title} revisado`)
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Alterações salvas." })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue(`${title} revisado`)
    await shot(page, "property-edit", info.project.name)
    const closeEdit = page.getByRole("button", { name: "Fechar edição", exact: true })
    const closeBounds = await closeEdit.boundingBox()
    expect(closeBounds?.width).toBeGreaterThanOrEqual(44)
    expect(closeBounds?.height).toBeGreaterThanOrEqual(44)
    await closeEdit.click()
    await expect(page).toHaveURL(`http://127.0.0.1:3012/imoveis/${id}`)
    await page.goto(`/imoveis?q=${encodeURIComponent(title)}&tipo=casa`)
    await expect(page.getByText("0 resultados")).toBeVisible()
    await page.goto(`/imoveis?q=${encodeURIComponent(title)}&tipo=apartamento`)
    await expect(page.locator(`a[href="/imoveis/${id}"]`)).toBeVisible()
    await page.getByRole("button", { name: "Filtros", exact: true }).click()
    await page.getByLabel("Filtrar por bairro").fill("Ponta Negra")
    await page.getByLabel("Aluguel máximo em reais").fill("3100")
    await page.getByLabel("Mínimo de quartos").fill("3")
    await page.getByRole("button", { name: "Aplicar filtros" }).click()
    await expect(page).toHaveURL(/aluguel_max=3100/)
    await expect(page.getByText("0 resultados")).toBeVisible()
    await page.reload()
    await expect(page.getByText("0 resultados")).toBeVisible()
    await page.getByRole("button", { name: "Filtros", exact: true }).click()
    await expect(page.getByLabel("Filtrar por bairro")).toHaveValue("Ponta Negra")
    await page.getByLabel("Aluguel máximo em reais").fill("3200")
    await page.getByRole("button", { name: "Aplicar filtros" }).click()
    await expect(page.locator(`a[href="/imoveis/${id}"]`)).toBeVisible()
    await page.getByRole("button", { name: "Filtros", exact: true }).click()
    await page.getByRole("link", { name: "Limpar filtros" }).click()
    expect(new URL(page.url()).searchParams.has("aluguel_max")).toBe(false)
    await expect(page.locator(`a[href="/imoveis/${id}"]`)).toBeVisible()
    await shot(page, "property-list", info.project.name)

    await session(readerContext, "membro-1@bivaque.example.invalid")
    const readerPage = await readerContext.newPage()
    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await readerPage.getByRole("button", { name: "Tenho interesse" }).click()
    await readerPage.waitForURL(/\/messages\/[0-9a-f-]{36}$/)
    const conversationPath = new URL(readerPage.url()).pathname
    await expect(readerPage.getByText("Anúncio de imóvel", { exact: true }).first()).toBeVisible()
    await expect(readerPage.getByText(`${title} revisado`, { exact: true }).first()).toBeVisible()
    const question = `Interesse ${randomUUID().slice(0, 8)}`
    await readerPage.getByRole("textbox", { name: "Escreva sua resposta" }).fill(question)
    await readerPage.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(readerPage.getByText(question, { exact: true })).toBeVisible()
    await page.goto(conversationPath)
    await expect(page.getByText(question, { exact: true })).toBeVisible()
    const reply = `Resposta ${randomUUID().slice(0, 8)}`
    await page.getByRole("textbox", { name: "Escreva sua resposta" }).fill(reply)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.getByText(reply, { exact: true })).toBeVisible()
    await readerPage.reload()
    await expect(readerPage.getByText(reply, { exact: true })).toBeVisible()
    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await readerPage.getByRole("button", { name: "Ver conversa" }).click()
    await expect(readerPage).toHaveURL(`http://127.0.0.1:3012${conversationPath}`)
    const threads = await service
      .from("dm_conversations")
      .select("id")
      .eq("context_id", id)
      .eq("context_type", "listing")
    expect(threads.data).toHaveLength(1)
    await readerPage.goto(`http://127.0.0.1:3012/imoveis/${id}/editar`)
    await expect(readerPage.getByRole("heading", { name: "Anúncio não disponível" })).toBeVisible()
    const reader = await actor("membro-1@bivaque.example.invalid")
    const denied = await reader
      .from("listings")
      .update({ title: "INDEVIDO" })
      .eq("id", id)
      .select("id")
    expect(denied.data).toEqual([])
    const unchanged = await service.from("listings").select("title").eq("id", id).single()
    expect(unchanged.data?.title).toBe(`${title} revisado`)
    const publicChange = await service
      .from("listings")
      .update({ locality_id: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
      .eq("id", id)
    expect(publicChange.error).not.toBeNull()
  } finally {
    await readerContext.close()
    if (!id) {
      const row = await service.from("listings").select("id").eq("title", title).maybeSingle()
      id = row.data?.id
    }
    if (id) await cleanup(id)
  }
})

test("imoveis salvar rascunho explicitamente, fotos, reload e retomada privada", async ({
  page,
  context,
  browser,
}, info) => {
  await session(context, "visual@bivaque.example.invalid")
  const title = `Rascunho FIGMA002 ${randomUUID().slice(0, 8)}`
  let id: string | undefined
  const otherContext = await browser.newContext()
  try {
    await page.goto("/imoveis")
    await page.getByRole("button", { name: "Anunciar imóvel" }).click()
    await page.getByLabel("Título", { exact: true }).fill(title)
    await page.getByLabel("Bairro", { exact: true }).fill("Flores")
    const before = await service.from("listings").select("id").eq("title", title)
    expect(before.data).toEqual([])
    await page.route("**/imoveis", async (route) => {
      if (route.request().method() === "POST") await route.abort("failed")
      else await route.continue()
    })
    await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click()
    await expect(page.getByText(/Seus campos foram mantidos/)).toBeVisible()
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue(title)
    expect((await service.from("listings").select("id").eq("title", title)).data).toEqual([])
    await page.unroute("**/imoveis")
    await page.locator('input[type="file"]').setInputFiles({
      name: "draft.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMZkAAAAASUVORK5CYII=",
        "base64",
      ),
    })
    await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click()
    await page.waitForURL(/\/imoveis\/[0-9a-f-]{36}\/editar\?rascunho=1/)
    id = new URL(page.url()).pathname.split("/")[2]
    if (!id) throw new Error("Missing saved draft")
    await expect(page.getByRole("status").filter({ hasText: "Rascunho salvo." })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue(title)
    await expect(page.getByRole("button", { name: "Remover", exact: true })).toHaveCount(1)
    expect(
      (await service.from("listings").select("status").eq("id", id).single()).data?.status,
    ).toBe("draft")
    await shot(page, "property-draft-reload", info.project.name)
    await page.goto("/imoveis")
    await page.reload()
    await page.getByRole("link", { name: `Retomar: ${title}`, exact: true }).click()
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue(title)
    await session(otherContext, "membro-1@bivaque.example.invalid")
    const other = await otherContext.newPage()
    await other.goto(`http://127.0.0.1:3012/imoveis/${id}`)
    await expect(other.getByRole("heading", { name: "Anúncio não disponível" })).toBeVisible()
    await page.getByRole("button", { name: "Publicar", exact: true }).click()
    await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible()
    expect((await service.from("listings").select("id,status").eq("title", title)).data).toEqual([
      { id, status: "active" },
    ])
  } finally {
    await otherContext.close()
    await page.unroute("**/imoveis")
    if (!id)
      id = (await service.from("listings").select("id").eq("title", title).maybeSingle()).data?.id
    if (id) await cleanup(id)
  }
})

test("imoveis fallback e falha de publicação mantém campos e permite retomada", async ({
  page,
  context,
}) => {
  await session(context, "visual@bivaque.example.invalid")
  await page.goto("/imoveis/inexistente")
  await expect(page.getByRole("heading", { name: "Anúncio não disponível" })).toBeVisible()
  await page.goto("/imoveis")
  await page.getByRole("button", { name: "Anunciar imóvel" }).click()
  await page.getByLabel("Título", { exact: true }).fill("Imóvel sem perda de rascunho")
  await page.getByLabel("Bairro", { exact: true }).fill("Flores")
  await page.getByRole("button", { name: "Revisar publicação", exact: true }).click()
  await page.route("**/imoveis", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed")
    else await route.continue()
  })
  await page.getByRole("button", { name: "Publicar", exact: true }).click()
  await expect(page.getByText(/Seus campos foram mantidos/)).toBeVisible()
  await page.unroute("**/imoveis")
  await page.getByRole("button", { name: "Editar", exact: true }).click()
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
    "Imóvel sem perda de rascunho",
  )
  await page.getByRole("button", { name: "Cancelar", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  // A later transport failure has already created a draft: resume that exact
  // record rather than silently creating a second publication on retry.
  const draftTitle = `Retomada FIGMA002 ${randomUUID().slice(0, 8)}`
  let draftId: string | undefined
  try {
    await page.getByRole("button", { name: "Anunciar imóvel" }).click()
    await page.getByLabel("Título", { exact: true }).fill(draftTitle)
    const png = {
      name: "retry.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMZkAAAAASUVORK5CYII=",
        "base64",
      ),
    }
    await page.locator('input[type="file"]').setInputFiles(png)
    await page.getByRole("button", { name: "Revisar publicação", exact: true }).click()
    await page.route("**/imoveis/*/fotos", (route) => route.abort("failed"))
    await page.getByRole("button", { name: "Publicar", exact: true }).click()
    await page.waitForURL(/\/imoveis\/[0-9a-f-]{36}\/editar\?retomada=1/)
    draftId = new URL(page.url()).pathname.split("/")[2]
    if (!draftId) throw new Error("Missing resumed draft id")
    await expect(page.getByText(/O anúncio foi salvo como rascunho/)).toBeVisible()
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue(draftTitle)
    await page.unroute("**/imoveis/*/fotos")
    await page.getByLabel("Adicionar fotos", { exact: true }).setInputFiles(png)
    await page.getByRole("button", { name: "Adicionar fotos", exact: true }).click()
    await expect(page.getByRole("button", { name: "Remover", exact: true })).toHaveCount(1)
    await page.getByRole("button", { name: "Publicar", exact: true }).click()
    await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible()
    const resumed = await service.from("listings").select("id,status").eq("title", draftTitle)
    expect(resumed.data).toEqual([{ id: draftId, status: "active" }])
  } finally {
    await page.unroute("**/imoveis/*/fotos")
    if (draftId) await cleanup(draftId)
  }
})

test("imoveis público de comunidade: membro autorizado vê; membro de fora não vê nem registra interesse", async ({
  page,
  context,
}) => {
  const owner = await actor("membro-3@bivaque.example.invalid")
  const auth = await owner.auth.getUser()
  if (!auth.data.user) throw new Error("Missing authorized fixture actor")
  const memberships = await owner
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", auth.data.user.id)
    .eq("status", "approved")
  expect(memberships.error).toBeNull()
  const communityId = memberships.data?.[0]?.community_id
  if (!communityId) throw new Error("Missing seed community membership")
  const title = `Comunidade FIGMA002 ${randomUUID().slice(0, 8)}`
  const created = await owner.rpc("create_property_listing", {
    p_title: title,
    p_description: null,
    p_locality_id: null,
    p_community_id: communityId,
    p_property_type: "casa",
    p_neighborhood: "Flores",
    p_rent_cents: null,
    p_condo_fee_cents: null,
    p_iptu_cents: null,
    p_bedrooms: null,
    p_bathrooms: null,
    p_parking_spots: null,
    p_area_m2: null,
    p_available_from: null,
    p_is_furnished: false,
    p_accepts_pets: false,
    p_condo_included_in_rent: false,
  })
  expect(created.error).toBeNull()
  const id = created.data as string
  expect(id).toMatch(/^[0-9a-f-]{36}$/)
  try {
    const activated = await owner
      .from("listings")
      .update({ status: "active" })
      .eq("id", id)
      .select("id")
    expect(activated.error).toBeNull()
    expect(activated.data).toHaveLength(1)
    await session(context, "membro-3@bivaque.example.invalid")
    await page.goto(`/imoveis/${id}`)
    await expect(page.getByRole("heading", { name: title })).toBeVisible()
    await context.clearCookies()
    await session(context, "visual@bivaque.example.invalid")
    await page.goto(`/imoveis/${id}`)
    await expect(page.getByRole("heading", { name: "Anúncio não disponível" })).toBeVisible()
    const deniedRead = await service.from("listings").select("id").eq("id", id)
    expect(deniedRead.data).toEqual([])
    const deniedInterest = await service.rpc("register_listing_interest", { p_listing_id: id })
    expect(deniedInterest.error).not.toBeNull()
  } finally {
    await cleanup(id)
  }
})

test("imoveis fotos: EXIF real, remoção direta negada, remoção do dono e cota retomável", async ({
  page,
  context,
  browser,
}) => {
  await session(context, "visual@bivaque.example.invalid")
  await page.goto("/imoveis")
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 48
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas unavailable")
    ctx.fillStyle = "#185168"
    ctx.fillRect(0, 0, 64, 48)
    return canvas.toDataURL("image/jpeg").split(",")[1]
  })
  if (!encoded) throw new Error("Missing image fixture")
  const jpeg = Buffer.from(encoded, "base64")
  const payload = Buffer.from("Exif\0\0FIGMA002-GPS-FIXTURE")
  const header = Buffer.from([0xff, 0xe1, 0, payload.length + 2])
  const withExif = Buffer.concat([jpeg.subarray(0, 2), header, payload, jpeg.subarray(2)])
  const file = { name: "fixture-exif.jpg", mimeType: "image/jpeg", buffer: withExif }
  const largePayload = Buffer.alloc(65530)
  payload.copy(largePayload)
  const largeSegment = Buffer.concat([Buffer.from([0xff, 0xe1, 0xff, 0xfc]), largePayload])
  const largeFile = {
    ...file,
    name: "fixture-large-exif.jpg",
    buffer: Buffer.concat([
      jpeg.subarray(0, 2),
      ...Array.from({ length: 20 }, () => largeSegment),
      jpeg.subarray(2),
    ]),
  }
  expect(largeFile.buffer.length).toBeGreaterThan(1024 * 1024)
  const title = `Fotos FIGMA002 ${randomUUID().slice(0, 8)}`
  let id: string | undefined
  const readerContext = await browser.newContext()
  try {
    await page.getByRole("button", { name: "Anunciar imóvel" }).click()
    await page.getByLabel("Título", { exact: true }).fill(title)
    await page.getByLabel("Bairro", { exact: true }).fill("Flores")
    await page.locator('input[type="file"]').setInputFiles(largeFile)
    await page.getByRole("button", { name: "Revisar publicação", exact: true }).click()
    const uploadResponse = page.waitForResponse(
      (response) => response.url().endsWith("/fotos") && response.request().method() === "POST",
      { timeout: 15_000 },
    )
    await page.getByRole("button", { name: "Publicar", exact: true }).click()
    const upload = await uploadResponse
    expect(await upload.json()).toMatchObject({ ok: true })
    await page.waitForURL(/\/imoveis\/[0-9a-f-]{36}$/)
    id = new URL(page.url()).pathname.split("/")[2]
    if (!id) throw new Error("Missing media fixture id")
    const media = await service.from("listing_media").select("*").eq("listing_id", id).single()
    expect(media.error).toBeNull()
    if (!media.data) throw new Error("Missing uploaded row")
    const path = media.data.object_path as string
    const downloaded = await service.storage.from("listing-photos").download(path)
    expect(downloaded.error).toBeNull()
    if (!downloaded.data) throw new Error("Missing actual storage object")
    const stored = Buffer.from(await downloaded.data.arrayBuffer())
    expect(stored.includes(Buffer.from("Exif"))).toBe(false)
    expect(stored).toEqual(jpeg)
    // A galeria é renderizada por componente cliente: amostrar `naturalWidth`
    // no instante em que o <img> existe é uma race de hydration e devolve 0 sem
    // que a imagem esteja quebrada. Esperar o carregamento real torna a prova
    // determinística — e um 404 continua falhando aqui, com timeout.
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>('img[alt^="Foto 1:"]')
      return img?.complete === true && img.naturalWidth > 0
    })
    expect(
      await page
        .locator('img[alt^="Foto 1:"]')
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    ).toBe(64)

    await page.getByRole("link", { name: "Editar imóvel", exact: true }).click()
    let captured: { body: Buffer; headers: Record<string, string> } | undefined
    await page.route("**/imoveis/**/editar", async (route) => {
      const body = route.request().postDataBuffer()
      if (route.request().method() === "POST" && body) {
        captured = { body, headers: await route.request().allHeaders() }
        await route.abort("failed")
      } else await route.continue()
    })
    await page.getByRole("button", { name: "Remover", exact: true }).click()
    await expect(
      page.getByRole("alert").filter({ hasText: "Não foi possível alterar as fotos" }),
    ).toBeVisible()
    if (!captured) throw new Error("Missing real remove Server Action request")
    await page.unroute("**/imoveis/**/editar")
    await session(readerContext, "membro-1@bivaque.example.invalid")
    const direct = await readerContext.request.post(`http://127.0.0.1:3012/imoveis/${id}/editar`, {
      headers: {
        "next-action": captured.headers["next-action"] ?? "",
        "content-type": captured.headers["content-type"] ?? "",
        origin: "http://127.0.0.1:3012",
      },
      data: captured.body,
    })
    expect(await direct.text()).toContain("Não foi possível remover a foto.")
    const stillThere = await service.storage.from("listing-photos").download(path)
    expect(stillThere.error).toBeNull()
    const stillRow = await service.from("listing_media").select("id").eq("id", media.data.id)
    expect(stillRow.data).toHaveLength(1)
    await page.getByRole("button", { name: "Remover", exact: true }).click()
    await expect(page.getByRole("button", { name: "Remover", exact: true })).toHaveCount(0)
    const gone = await storageService.storage.from("listing-photos").download(path)
    expect(gone.error).not.toBeNull()
    const goneRow = await service.from("listing_media").select("id").eq("id", media.data.id)
    expect(goneRow.data).toEqual([])
    await page
      .getByLabel("Adicionar fotos", { exact: true })
      .setInputFiles(
        Array.from({ length: 12 }, (_, index) => ({ ...file, name: `photo-${index}.jpg` })),
      )
    await page.getByRole("button", { name: "Adicionar fotos", exact: true }).click()
    const twelve = page.getByRole("button", { name: "Remover", exact: true })
    // Budget explícito e dimensionado pelo trabalho: o action grava as 12 fotos
    // uma a uma (upload + insert por foto), então a tela só pode refletir o
    // resultado depois disso. O default de 5s estourava no viewport 375 sem que
    // houvesse falha — as asserções seguintes (13ª recusada, 12 objetos no
    // bucket) continuam provando o comportamento com o timeout padrão.
    await expect(twelve).toHaveCount(12, { timeout: 60_000 })
    await page.getByLabel("Adicionar fotos", { exact: true }).setInputFiles(file)
    await page.getByRole("button", { name: "Adicionar fotos", exact: true }).click()
    await expect(page.getByRole("alert").filter({ hasText: "no máximo 12 fotos" })).toBeVisible()
    const actualObjects = await storageService.storage.from("listing-photos").list(id)
    expect(actualObjects.error).toBeNull()
    expect(actualObjects.data).toHaveLength(12)
    await page.getByRole("button", { name: "Remover", exact: true }).nth(5).click()
    await expect(page.getByRole("button", { name: "Remover", exact: true })).toHaveCount(11)
    await page.getByLabel("Adicionar fotos", { exact: true }).setInputFiles(file)
    await page.getByRole("button", { name: "Adicionar fotos", exact: true }).click()
    await expect(page.getByRole("button", { name: "Remover", exact: true })).toHaveCount(12)
    await page.reload()
    await expect(page.getByRole("button", { name: "Remover", exact: true })).toHaveCount(12)
    await page.getByRole("button", { name: "Pausar", exact: true }).click()
    await expect(page.getByRole("button", { name: "Reativar", exact: true })).toBeVisible()
    const reader = await actor("membro-1@bivaque.example.invalid")
    const deniedInterest = await reader.rpc("register_listing_interest", { p_listing_id: id })
    expect(deniedInterest.error).not.toBeNull()
    await page.getByRole("button", { name: "Reativar", exact: true }).click()
    await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Encerrar", exact: true }).click()
    await expect(page.getByRole("button", { name: "Pausar", exact: true })).toHaveCount(0)
    await page.reload()
    await expect(
      page.getByText(`Situação: ${LISTING_STATUS_LABELS.closed}.`, { exact: false }),
    ).toBeVisible()
    const closed = await service.from("listings").select("status").eq("id", id).single()
    expect(closed.error).toBeNull()
    expect(closed.data?.status).toBe("closed")
  } finally {
    await readerContext.close()
    if (!id) {
      const row = await service.from("listings").select("id").eq("title", title).maybeSingle()
      id = row.data?.id
    }
    if (id) await cleanup(id)
  }
})
