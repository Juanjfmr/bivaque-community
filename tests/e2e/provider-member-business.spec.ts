import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { expect, request, test } from "@playwright/test"
import { readEnvLocal, signInAs } from "./helpers/session"

const BUSINESS_NAME = "Bivaque Vizinhança"
const UPDATED_BIO = "Atendimento acolhedor para famílias que acabaram de chegar."
const CATALOG_ITEM = "Orientação para mudança"
const PORTFOLIO_CAPTION = "Acolhida de quem chega à cidade"
const BUSINESS_OWNERS = {
  "mobile-375": {
    email: "negocio-e2e-mobile@bivaque.example.invalid",
    id: "21000000-0000-4000-8000-000000000001",
  },
  "tablet-768": {
    email: "negocio-e2e-tablet@bivaque.example.invalid",
    id: "21000000-0000-4000-8000-000000000002",
  },
  "desktop-1440": {
    email: "negocio-e2e-desktop@bivaque.example.invalid",
    id: "21000000-0000-4000-8000-000000000003",
  },
} as const
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"

test.beforeEach(async ({ page }, testInfo) => {
  await page.context().clearCookies()
  const owner = BUSINESS_OWNERS[testInfo.project.name as keyof typeof BUSINESS_OWNERS]
  if (!owner) throw new Error(`No business test owner is configured for ${testInfo.project.name}.`)
  const serviceKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY")
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for fixture cleanup.")

  const api = await request.newContext({
    baseURL: SUPABASE_URL,
    extraHTTPHeaders: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  try {
    const profiles = await api.get("rest/v1/provider_profiles", {
      params: { owner_user_id: `eq.${owner.id}`, select: "id" },
    })
    if (!profiles.ok()) throw new Error(`Could not inspect business fixtures: ${profiles.status()}`)
    const providerIds = (await profiles.json()) as { id: string }[]

    const storagePaths: string[] = []
    for (const { id } of providerIds) {
      const photos = await api.get("rest/v1/provider_portfolio_photos", {
        params: { provider_id: `eq.${id}`, select: "photo_path" },
      })
      if (!photos.ok()) throw new Error(`Could not inspect portfolio fixtures: ${photos.status()}`)
      const rows = (await photos.json()) as { photo_path: string }[]
      storagePaths.push(...rows.map((row) => row.photo_path))
    }
    if (storagePaths.length > 0) {
      const removed = await api.delete("storage/v1/object/provider-photos", {
        data: { prefixes: storagePaths },
      })
      if (!removed.ok()) {
        throw new Error(`Could not remove portfolio fixtures: ${removed.status()}`)
      }
    }

    const deleted = await api.delete("rest/v1/provider_profiles", {
      params: { owner_user_id: `eq.${owner.id}` },
    })
    if (!deleted.ok()) throw new Error(`Could not reset business fixture: ${deleted.status()}`)
  } finally {
    await api.dispose()
  }
})

test.describe("página de negócio do membro", { tag: "@stateful" }, () => {
  test("cria, edita, publica catálogo e chega pelas entradas do produto", async ({
    page,
  }, testInfo) => {
    const owner = BUSINESS_OWNERS[testInfo.project.name as keyof typeof BUSINESS_OWNERS]
    if (!owner)
      throw new Error(`No business test owner is configured for ${testInfo.project.name}.`)
    await signInAs(page.context(), owner.email)

    await page.goto("/explorar/servicos")
    await page.getByRole("link", { name: "Ofereça seus serviços" }).click()
    await expect(
      page.getByRole("heading", { name: /página do seu negócio|Seu negócio/ }),
    ).toBeVisible()

    const createMode = true
    const rpcName = "create_member_business_page"

    await page.getByLabel("Nome do negócio").fill("A")
    await page
      .getByRole("button", { name: createMode ? "Criar minha página" : "Salvar alterações" })
      .click()
    const nameIsValid = await page
      .getByLabel("Nome do negócio")
      .evaluate((element: HTMLInputElement) => element.validity.valid)
    expect(nameIsValid).toBe(false)
    await expect(page.getByLabel("Nome do negócio")).toHaveValue("A")

    await page.getByLabel("Nome do negócio").fill(BUSINESS_NAME)
    await page.getByLabel("Categoria").selectOption({ index: 1 })
    await page
      .getByLabel(/O que você oferece/)
      .fill("Apoio prático para quem está chegando à cidade.")

    await page.route(`**/rest/v1/rpc/${rpcName}`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "simulated network failure" }),
      }),
    )
    await page
      .getByRole("button", { name: createMode ? "Criar minha página" : "Salvar alterações" })
      .click()
    await expect(page.getByText(/seus dados continuam preenchidos/i)).toBeVisible()
    await expect(page.getByLabel("Nome do negócio")).toHaveValue(BUSINESS_NAME)
    await page.unroute(`**/rest/v1/rpc/${rpcName}`)

    await page
      .getByRole("button", { name: createMode ? "Criar minha página" : "Salvar alterações" })
      .click()
    await expect(page.getByRole("heading", { name: "Seu negócio" })).toBeVisible()

    await page.getByLabel(/O que você oferece/).fill(UPDATED_BIO)
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Sua página foi salva.")).toBeVisible()

    const publicLink = page.getByRole("link", { name: "Ver página pública" })
    const href = await publicLink.getAttribute("href")
    expect(href).toMatch(/^\/prestadores\/[0-9a-f-]+$/i)
    const providerId = href?.split("/").at(-1)
    expect(providerId).toBeTruthy()
    if (testInfo.project.name === "mobile-375") {
      mkdirSync(join(process.cwd(), ".visual", "fixtures"), { recursive: true })
      writeFileSync(
        join(process.cwd(), ".visual", "fixtures", "member-business.json"),
        JSON.stringify({ path: href }),
      )
    }

    await publicLink.click()
    await expect(page.getByRole("heading", { name: BUSINESS_NAME })).toBeVisible()
    await expect(page.getByText(UPDATED_BIO)).toBeVisible()

    await page.goto("/negocio/catalogo")
    await expect(page.getByRole("heading", { name: "Publicar item" })).toBeVisible()
    await page.getByLabel("Título do item").fill(CATALOG_ITEM)
    await page.getByLabel("Descrição", { exact: false }).fill("Atendimento sob orçamento.")
    await page.getByRole("button", { name: "Publicar", exact: true }).click()
    await expect(page.getByText(CATALOG_ITEM, { exact: true })).toBeVisible()

    await page
      .getByLabel(/Escolher imagem/)
      .setInputFiles(join(process.cwd(), "apps/web/public/landing/hero-bivaque-arrival.webp"))
    await page.getByLabel("Legenda da foto").fill(PORTFOLIO_CAPTION)
    const photoSubmission = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/negocio/catalogo",
    )
    await page.getByRole("button", { name: "Publicar foto" }).click()
    expect((await photoSubmission).ok()).toBe(true)
    await page.reload()
    await expect(page.getByRole("img", { name: PORTFOLIO_CAPTION })).toBeVisible()

    await page.goto("/explorar/servicos?q=vizinhanca")
    await expect(page.getByText(BUSINESS_NAME, { exact: true }).first()).toBeVisible()

    await page.goto("/profile")
    await page.getByRole("link", { name: "Seu negócio" }).click()
    await expect(page.getByRole("heading", { name: "Seu negócio" })).toBeVisible()

    await page.goto("/mercado")
    await page.getByRole("link", { name: "Meu negócio" }).click()
    await expect(page.getByRole("heading", { name: "Seu negócio" })).toBeVisible()

    await page.goto("/mercado/novo")
    await page.getByRole("link", { name: "Crie a página do seu negócio" }).click()
    await expect(page.getByRole("heading", { name: "Seu negócio" })).toBeVisible()

    expect(providerId).toBeTruthy()
  })
})
