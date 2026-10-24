import { expect, request, test } from "@playwright/test"
import { seedSession, signInAs } from "../helpers/session"

const escapedId = "e0000000-0000-4000-8000-00000000f001"
const escapedTitle = `Pergunta de escape <img src=x onerror="window.__xss=1">"'`
const insertPath = "/rest/v1/recommendation_requests"
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]
const supabaseUrl = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"

async function openApp(page: import("@playwright/test").Page) {
  await page.goto("/app#comunidade")
}

test.describe("EXP-001 eliminatórios", () => {
  test("acesso: contas sem cidade e de outra cidade não leem perguntas de Manaus", async ({
    page,
    context,
  }) => {
    await signInAs(context, "exp-sem-cidade@bivaque.example.invalid")
    await openApp(page)
    await expect(page).toHaveURL(/\/onboarding/)

    await signInAs(context, "exp-outra-cidade@bivaque.example.invalid")
    await openApp(page)
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible()
    await expect(
      page
        .getByRole("list", { name: "Perguntas" })
        .getByRole("button", { name: escapedTitle, exact: true }),
    ).toHaveCount(0)
    await page.goto(`/app#pergunta/${escapedId}`)
    await expect(page.getByRole("heading", { name: "Indicação indisponível" })).toBeVisible()
    await expect(page.getByRole("heading", { name: escapedTitle })).toHaveCount(0)

    const scripts = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /\.js(?:\?|$)/.test(name)),
    )
    for (const src of scripts) {
      const body = await page.request.get(src).then((response) => response.text())
      expect(body).not.toContain("service_role")
      if (serviceKey) expect(body).not.toContain(serviceKey)
    }

    await signInAs(context, "exp-autora@bivaque.example.invalid")
    await openApp(page)
    await expect(page.getByRole("heading", { name: "Comunidade" })).toBeVisible()
    expect(
      serviceKey,
      "SUPABASE_SERVICE_ROLE_KEY deve estar presente no ambiente local do roteiro",
    ).toBeTruthy()
  })

  test("sem duplicar: repetir após resposta perdida deixa uma pergunta no banco", async ({
    page,
  }) => {
    await seedSession(page.context())
    await openApp(page)
    const uniqueTitle = `EXP-001 retry ${Date.now()}`
    const textbox = page.getByRole("textbox", { name: "Sua pergunta" })
    await page.getByRole("button", { name: "Perguntar", exact: true }).click()
    await textbox.fill(uniqueTitle)
    let first = true
    await page.route(`**${insertPath}**`, async (route) => {
      if (!first || route.request().method() !== "POST") return route.continue()
      first = false
      const response = await route.fetch()
      await route.fulfill({
        status: 504,
        body: "Gateway timeout",
        headers: { "content-type": "text/plain" },
      })
      await response.dispose()
    })
    await page.getByRole("button", { name: "Publicar pergunta", exact: true }).click()
    await expect(
      page.getByRole("alert").getByText("Não foi possível publicar. Sua pergunta continua aqui."),
    ).toBeVisible()
    await page.getByRole("button", { name: "Publicar pergunta", exact: true }).click()
    await expect(page.getByRole("dialog", { name: "Pedir indicação" })).toBeHidden()

    expect(
      serviceKey,
      "SUPABASE_SERVICE_ROLE_KEY deve estar presente no ambiente local do roteiro",
    ).toBeTruthy()
    const db = await request.newContext({
      baseURL: supabaseUrl,
      extraHTTPHeaders: { apikey: serviceKey as string, Authorization: `Bearer ${serviceKey}` },
    })
    const result = await db.get(
      `${insertPath}?select=id&title=eq.${encodeURIComponent(uniqueTitle)}`,
    )
    expect(result.ok()).toBeTruthy()
    expect(await result.json()).toHaveLength(1)
    await db.dispose()
  })

  test("rascunho: falha de rede conserva o texto digitado", async ({ page }) => {
    await seedSession(page.context())
    await openApp(page)
    await page.getByRole("button", { name: "Perguntar", exact: true }).click()
    const textbox = page.getByRole("textbox", { name: "Sua pergunta" })
    await textbox.fill("Preciso de indicação para uma escola")
    await page.route(`**${insertPath}**`, (route) => route.abort("failed"))
    await page.getByRole("button", { name: "Publicar pergunta", exact: true }).click()
    await expect(
      page.getByRole("alert").getByText("Não foi possível publicar. Sua pergunta continua aqui."),
    ).toBeVisible()
    await expect(textbox).toHaveValue("Preciso de indicação para uma escola")
  })

  test("escape: título com HTML aparece como texto e não executa", async ({ page }) => {
    await seedSession(page.context())
    await page.goto(`/app#pergunta/${escapedId}`)
    await expect(page.getByRole("heading", { level: 1, name: escapedTitle })).toBeVisible()
    expect(await page.evaluate(() => (window as Window & { __xss?: number }).__xss)).toBeUndefined()
  })
})
