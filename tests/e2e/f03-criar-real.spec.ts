import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { type BrowserContext, expect, type Page, test } from "@playwright/test"
import sharp from "sharp"
import {
  chaveAnonimaDoSupabase,
  MEMBRO_SEMEADO,
  semearSessaoDeMembro,
  urlDoSupabase,
} from "./entrada-real-ajuda"

// RUN-015: Next + Supabase local com seed; execução serial no CI nas três larguras.
// node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f03-criar-real.spec.ts
async function conferirBanco(context: BrowserContext, tabela: string, id: string) {
  const cookie = (await context.cookies()).find((item) => /^sb-.*-auth-token$/.test(item.name))
  if (!cookie) throw new Error("Sessão semeada ausente")
  const sessao = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { access_token: string }
  const resposta = await context.request.get(
    `${urlDoSupabase()}/rest/v1/${tabela}?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      headers: { apikey: chaveAnonimaDoSupabase(), Authorization: `Bearer ${sessao.access_token}` },
    },
  )
  expect(resposta.ok()).toBe(true)
  const linhas = (await resposta.json()) as Record<string, unknown>[]
  expect(linhas).toHaveLength(1)
  return linhas[0]
}

async function capturar(page: Page, nome: string) {
  const pasta = join(process.cwd(), ".visual", "run-015")
  mkdirSync(pasta, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.screenshot({ path: join(pasta, `${nome}-${tema}.png`), fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
  await page.emulateMedia({ colorScheme: "light" })
}

test.describe("F03 — criação real", { tag: "@stateful" }, () => {
  test.beforeEach(async ({ context }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
  })

  test("pergunta: rascunho, revisão, falha preservada e persistência", async ({
    page,
    context,
  }, info) => {
    const titulo = `Indicam escola para crianças? F03 ${info.project.name} ${Date.now()}`
    await page.goto("/app/inicio")
    await page.locator('[data-acao="criar"]').click()
    await page.locator('[data-escolha="ask"]').click()
    const form = page.locator('[data-fluxo="perguntar"]')
    await form.locator("#nova-pergunta").fill(titulo)
    await form.locator("#topico-pergunta").fill("Educação")
    await form.getByRole("button", { name: "Salvar rascunho" }).click()
    await page.reload()
    await page.locator('[data-acao="perguntar"]').click()
    await expect(form.locator("#nova-pergunta")).toHaveValue(titulo)
    const rota = /\/api\/app\/perguntas$/
    await page.route(rota, (pedido) =>
      pedido.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } }),
    )
    await form.getByRole("button", { name: "Revisar pergunta" }).click()
    await form.getByRole("button", { name: "Publicar pergunta" }).click()
    await expect(form.getByRole("alert")).toContainText("Seu texto foi mantido")
    await page.unroute(rota)
    await form.getByRole("button", { name: "Revisar pergunta" }).click()
    await capturar(page, `${info.project.name}-pergunta-revisao`)
    await form.getByRole("button", { name: "Publicar pergunta" }).click()
    await expect(page).toHaveURL(/\/app\/pergunta\/[0-9a-f-]+$/)
    const id = new URL(page.url()).pathname.split("/").at(-1) ?? ""
    await expect(page.getByText(titulo, { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText(titulo, { exact: true })).toBeVisible()
    expect(await conferirBanco(context, "recommendation_requests", id)).toMatchObject({
      title: titulo,
      category: "educacao",
    })
  })

  test("anúncio com foto: publicar, recarregar e acompanhar em Meus anúncios", async ({
    page,
    context,
  }, info) => {
    const titulo = `Mesa seminova F03 ${info.project.name} ${Date.now()}`
    const foto = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#448877" },
    })
      .png()
      .toBuffer()
    await page.goto("/app/inicio")
    await page.locator('[data-acao="criar"]').click()
    await page.locator('[data-escolha="create-item"]').click()
    const form = page.locator('[data-formulario-criacao="create-item"]')
    await form.locator("#criacao-titulo").fill(titulo)
    await form.locator("#criacao-complemento").fill("Flores")
    await form.locator("#criacao-preco").fill("750.50")
    await form
      .locator("#criacao-descricao")
      .fill("Mesa de madeira em bom estado. Retirada a combinar.")
    await form
      .locator("#criacao-foto")
      .setInputFiles({ name: "mesa.png", mimeType: "image/png", buffer: foto })
    await expect(form.getByAltText("Foto escolhida para o anúncio")).toBeVisible()
    await form.getByRole("button", { name: "Salvar rascunho" }).click()
    await page.reload()
    await page.locator('[data-acao="criar"]').click()
    await page.locator('[data-escolha="create-item"]').click()
    await expect(form.locator("#criacao-titulo")).toHaveValue(titulo)
    const rota = /\/api\/app\/mercado$/
    await page.route(rota, (pedido) =>
      pedido.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } }),
    )
    await form.getByRole("button", { name: "Revisar anúncio" }).click()
    await form.getByRole("button", { name: "Publicar anúncio" }).click()
    await expect(form.getByRole("alert")).toContainText("campos e a foto foram mantidos")
    await page.unroute(rota)
    await form.getByRole("button", { name: "Revisar anúncio" }).click()
    await capturar(page, `${info.project.name}-desapego-revisao`)
    await form.getByRole("button", { name: "Publicar anúncio" }).click()
    await expect(page).toHaveURL(/\/app\/anuncio\/[0-9a-f-]+$/)
    const id = new URL(page.url()).pathname.split("/").at(-1) ?? ""
    await page.reload()
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible()
    expect(await conferirBanco(context, "listings", id)).toMatchObject({
      title: titulo,
      price_cents: 75050,
      status: "active",
    })
    const detalhe = await page.request.get(`/api/app/mercado/${id}`)
    const corpo = (await detalhe.json()) as { anuncio: { fotos: string[] } }
    expect(corpo.anuncio.fotos).toHaveLength(1)
    const fotoUrl = corpo.anuncio.fotos[0]
    expect(fotoUrl).toBeTruthy()
    expect((await page.request.get(fotoUrl ?? "")).ok()).toBe(true)
    await page.goto("/app/meus-anuncios")
    await expect(
      page.locator('[data-tela="meus-anuncios"] [data-cartao="anuncio"]').first(),
    ).toBeVisible()
    // A lista é paginada e as personas podem ter criado mais de 20 anúncios no CI.
    while (await page.getByRole("button", { name: "Ver mais anúncios" }).isVisible()) {
      if (await page.getByRole("heading", { name: titulo }).isVisible()) break
      await page.getByRole("button", { name: "Ver mais anúncios" }).click()
      await expect(page.getByRole("button", { name: "Carregando…" })).toHaveCount(0)
    }
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible()
  })

  test("nega escrita sem sessão, sem CSRF e retomada de anúncio alheio", async ({
    page,
    playwright,
  }) => {
    const anonimo = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL ?? "http://127.0.0.1:3000",
    })
    try {
      expect(
        (
          await anonimo.post("/api/app/perguntas", { data: { titulo: "Alguém indica escola?" } })
        ).status(),
      ).toBe(401)
      expect((await anonimo.get("/api/app/mercado/meus")).status()).toBe(401)
    } finally {
      await anonimo.dispose()
    }
    expect(
      (
        await page.request.post("/api/app/perguntas", { data: { titulo: "Alguém indica escola?" } })
      ).status(),
    ).toBe(403)
    await page.goto("/app/meus-anuncios")
    const cabecalhos = { origin: new URL(page.url()).origin, "x-bivaque-app": "bivaque-spa" }
    const result = await page.request.post("/api/app/mercado", {
      headers: cabecalhos,
      data: {
        chave: "b1000000-0000-4000-8000-000000000005",
        titulo: "Não pode alterar terceiro",
        bairro: "Flores",
        preco: "750",
        descricao: "Item sintético de teste",
        categoria: "outros",
        condicao: "used",
        foto: null,
      },
    })
    expect(result.status()).toBe(404)
    expect(
      (
        await page.request.post("/api/app/mercado", {
          headers: { ...cabecalhos, origin: "https://invasor.invalid" },
          data: { chave: randomUUID() },
        })
      ).status(),
    ).toBe(403)
  })
})
