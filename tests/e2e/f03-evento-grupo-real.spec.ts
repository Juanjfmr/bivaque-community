import { expect, test } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

// F03-001: o encontro passa pela revisão antes de gravar, o grupo diz a cidade
// que vem do servidor e as escritas sem sessão são recusadas. A publicação no
// grupo com foto, gravada e relida depois de recarregar, é provada no
// f04-grupos-real.spec.ts (passo "publicar com foto"), contra o mesmo servidor.
// Grupo aberto da semente em Manaus (supabase/seed.sql, groups 60000000-…-01).
const GRUPO_ABERTO = "60000000-0000-4000-8000-000000000001"

test.describe("F03 — encontro com revisão e grupo com a cidade do servidor", {
  tag: "@stateful",
}, () => {
  test("cria o encontro pela revisão e ele sobrevive ao recarregar", async ({
    page,
    context,
  }, info) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    const titulo = `Encontro revisado ${info.project.name} ${Date.now()}`
    let envios = 0
    page.on("request", (pedido) => {
      if (pedido.method() === "POST" && pedido.url().endsWith("/api/app/eventos")) envios += 1
    })
    await page.goto("/app/inicio")
    await page.locator('[data-acao="criar"]').click()
    await page.locator('[data-escolha="create-event"]').click()
    const folha = page.getByRole("dialog")
    await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
    await folha.getByLabel("Título").fill(titulo)
    await folha.getByLabel("Data").fill("10/02/2027")
    await folha.getByLabel("Hora").fill("18:30")
    await folha.getByLabel("Local").fill("Praça da Saudade")
    await folha.getByRole("button", { name: "Revisar encontro", exact: true }).click()

    const revisao = folha.locator('[data-revisao="encontro"]')
    await expect(revisao).toContainText(titulo)
    await expect(revisao).toContainText("Praça da Saudade")
    expect(envios, "a revisão não grava").toBe(0)

    await folha.getByRole("button", { name: "Criar encontro", exact: true }).click()
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible({
      timeout: 30_000,
    })
    expect(new URL(page.url()).pathname).toMatch(/^\/app\/evento\/[0-9a-f-]{36}$/)
    expect(envios, "criar grava uma vez").toBe(1)
    await page.reload()
    await expect(
      page.getByRole("heading", { level: 1, name: titulo }),
      "o encontro gravado sobrevive ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
  })

  test("o grupo diz a cidade que vem do servidor", async ({ page, context }) => {
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    const leitura = page.waitForResponse((resposta) =>
      new URL(resposta.url()).pathname.endsWith(`/api/app/grupos/${GRUPO_ABERTO}`),
    )
    await page.goto(`/app/grupo/${GRUPO_ABERTO}`)
    const resposta = await leitura
    expect(resposta.status()).toBe(200)
    const corpo = (await resposta.json()) as { cidade: string; grupo: { id: string } }
    expect(corpo.cidade).toBe("Manaus")
    expect(corpo.grupo.id).toBe(GRUPO_ABERTO)
    await expect(page.getByText(/Manaus · \d+ membros/)).toBeVisible({ timeout: 30_000 })
  })

  test("sem sessão, criar encontro e publicar no grupo respondem 401", async ({ request }) => {
    const encontro = await request.post("/api/app/eventos", {
      data: { titulo: "Sem sessão", comecaEm: "2027-02-10T21:30:00.000Z" },
      headers: { "x-bivaque-app": "bivaque-spa" },
    })
    expect(encontro.status()).toBe(401)
    const publicacao = await request.post(`/api/app/grupos/${GRUPO_ABERTO}/publicacoes`, {
      data: { texto: "Sem sessão", fotos: [] },
      headers: { "x-bivaque-app": "bivaque-spa" },
    })
    expect(publicacao.status()).toBe(401)
    expect((await request.get(`/api/app/grupos/${GRUPO_ABERTO}`)).status()).toBe(401)
  })
})
