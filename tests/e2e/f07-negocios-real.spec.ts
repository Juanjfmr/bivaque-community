import { mkdirSync } from "node:fs"
import { join } from "node:path"
import {
  request as apiRequest,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test"
import { chaveAnonimaDoSupabase, semearSessaoDeMembro, urlDoSupabase } from "./entrada-real-ajuda"
import { readEnvLocal } from "./helpers/session"

// RUN-010: usa somente o banco LOCAL semeado e a sessão de quem solicita.
// As variáveis vêm do processo ou do arquivo local do apps/web, pela mesma
// resolução dos demais specs reais (a CI escreve esse arquivo antes da prova).
const MEMBRO = "membro-1@bivaque.example.invalid"
const OUTRA_CIDADE = "membro-rio@bivaque.example.invalid"
const PRESTADOR = "prestador-seed@bivaque.example.invalid"
const NEGOCIO = "30000000-0000-4000-8000-000000000010"
const PEDIDO_SEMEADO = "40000000-0000-4000-8000-000000000023"
const CAPTURAS = join(process.cwd(), ".visual", "run-010", "capturas")
const CABECALHOS = { origin: "http://127.0.0.1:3000", "x-bivaque-app": "bivaque-spa" }

function exigirAmbienteLocal() {
  // A chave anônima tem erro próprio no helper; a senha segue a mesma ordem:
  // processo primeiro, depois apps/web. Nada é embutido aqui.
  chaveAnonimaDoSupabase()
  const senha = process.env["BIVAQUE_VISUAL_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!senha) throw new Error("BIVAQUE_VISUAL_PASSWORD não configurada antes da prova F07.")
  const url = new URL(urlDoSupabase())
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
    throw new Error("A prova F07 só pode rodar no banco local.")
}

async function tokenDaSessao(context: BrowserContext) {
  const cookie = (await context.cookies()).find((item) => /^sb-.*-auth-token$/.test(item.name))
  if (cookie === undefined) throw new Error("Sessão sem cookie de autenticação.")
  const sessao = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { access_token?: string }
  if (!sessao.access_token) throw new Error("Sessão sem token.")
  return sessao.access_token
}

async function capturar(page: Page, projeto: string, etapa: string) {
  mkdirSync(CAPTURAS, { recursive: true })
  for (const tema of ["claro", "escuro"] as const) {
    await page.emulateMedia({ colorScheme: tema === "claro" ? "light" : "dark" })
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await expect
      .poll(async () => {
        const cor = await page
          .locator("[data-tela] h1")
          .first()
          .evaluate((elemento) => getComputedStyle(elemento).color)
        const canais = (cor.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3)
        return (
          canais.length === 3 &&
          canais.every((canal) => (tema === "claro" ? canal < 128 : canal > 128))
        )
      })
      .toBe(true)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
    await page.screenshot({
      path: join(CAPTURAS, `${projeto}-${tema}-${etapa}.png`),
      fullPage: true,
      animations: "disabled",
    })
  }
  await page.emulateMedia({ colorScheme: "light" })
}

async function abrirFicha(page: Page) {
  await page.goto(`/app/negocio/${NEGOCIO}`)
  await expect(page.getByRole("heading", { level: 1, name: "Climatiza Manaus" })).toBeVisible({
    timeout: 30_000,
  })
}

test.describe("F07 — negócios e pedidos reais", { tag: "@stateful" }, () => {
  test.beforeAll(exigirAmbienteLocal)

  test("categorias, ficha e pedido com retorno e persistência", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO)
    await page.goto("/app/negocios")
    await expect(page.getByRole("heading", { level: 1, name: "Negócios locais" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.locator('[data-cartao="negocio"]', { hasText: "Climatiza Manaus" }),
    ).toBeVisible()
    await page.locator('[data-chip="assistencia_tecnica"]').click()
    await expect(
      page.locator('[data-cartao="negocio"]', { hasText: "Climatiza Manaus" }),
    ).toBeVisible()
    await capturar(page, testInfo.project.name, "01-negocios")

    await page.getByRole("button", { name: "Ver negócio: Climatiza Manaus", exact: true }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Climatiza Manaus" })).toBeVisible()
    await expect(page.getByText("Limpeza completa")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Onde atende", exact: true })).toBeVisible()
    await capturar(page, testInfo.project.name, "02-ficha")

    const pedir = page.getByRole("button", { name: "Pedir orçamento", exact: true })
    const alvo = await pedir.boundingBox()
    expect(alvo?.height).toBeGreaterThanOrEqual(44)
    expect(alvo?.width).toBeGreaterThanOrEqual(44)
    await pedir.click()
    await expect(page.getByRole("dialog")).toBeVisible()
    const descricao = `Limpar o ar-condicionado — ${testInfo.project.name}`
    await page.getByLabel("O que você precisa?").fill(descricao)
    await page.getByLabel("Quando precisa? (opcional)").fill("Nesta semana")
    await capturar(page, testInfo.project.name, "03-formulario")

    const retorno = page.waitForResponse(
      (resposta) =>
        resposta.url().endsWith(`/api/app/negocios/${NEGOCIO}/pedidos`) &&
        resposta.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Enviar pedido", exact: true }).click()
    const criada = await retorno
    expect(criada.status()).toBe(201)
    const gravado = (await criada.json()) as { pedido: { id: string; descricao: string } }
    expect(gravado.pedido.descricao).toBe(descricao)
    await expect(page).toHaveURL(new RegExp(`/app/pedido/${gravado.pedido.id}$`))
    await expect(page.locator("[data-descricao-do-pedido]")).toHaveText(descricao)
    await expect(page.getByText("Em aberto", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.locator("[data-descricao-do-pedido]")).toHaveText(descricao, {
      timeout: 30_000,
    })
    await capturar(page, testInfo.project.name, "04-pedido")

    // Confirma a linha pela mesma sessão sob RLS, sem cliente administrativo.
    const noBanco = await page.request.get(
      `${urlDoSupabase()}/rest/v1/service_requests?select=id,description,status&id=eq.${gravado.pedido.id}`.replace(
        "& id",
        "&id",
      ),
      {
        headers: {
          apikey: chaveAnonimaDoSupabase(),
          authorization: `Bearer ${await tokenDaSessao(context)}`,
        },
      },
    )
    expect(noBanco.status()).toBe(200)
    expect(await noBanco.json()).toEqual([
      { id: gravado.pedido.id, description: descricao, status: "open" },
    ])

    // A resposta perdida e o reenvio manual com a mesma chave não duplicam.
    const reenviada = await page.request.post(`/api/app/negocios/${NEGOCIO}/pedidos`, {
      headers: CABECALHOS,
      data: criada.request().postDataJSON(),
    })
    expect(reenviada.status()).toBe(201)
    expect((await reenviada.json()).pedido.id).toBe(gravado.pedido.id)

    await page.getByRole("button", { name: "Ver meus pedidos", exact: true }).click()
    const linha = page.locator('[data-tela="pedidos"] [data-linha="lista"]', { hasText: descricao })
    await expect(linha).toBeVisible()
    await page.reload()
    await expect(linha).toBeVisible({ timeout: 30_000 })
    await capturar(page, testInfo.project.name, "05-meus-pedidos")
    await linha.click()
    await expect(page.locator("[data-descricao-do-pedido]")).toHaveText(descricao)
  })

  test("falha ao gravar mantém o texto e a leitura permite tentar de novo", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO)
    await abrirFicha(page)
    await page.getByRole("button", { name: "Pedir orçamento", exact: true }).click()
    await page.getByLabel("O que você precisa?").fill("Conferir o ar sem perder este texto")
    await page.route("**/api/app/negocios/*/pedidos", (rota) => rota.abort())
    await page.getByRole("button", { name: "Enviar pedido", exact: true }).click()
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "Seu texto continua aqui",
    )
    await expect(page.getByLabel("O que você precisa?")).toHaveValue(
      "Conferir o ar sem perder este texto",
    )
    await expect(page.getByRole("button", { name: "Enviar pedido", exact: true })).toBeEnabled()
    await expect(page).toHaveURL(new RegExp(`/app/negocio/${NEGOCIO}$`))
    await capturar(page, testInfo.project.name, "06-falha-de-escrita")
    await page.getByRole("button", { name: "Cancelar", exact: true }).click()

    await page.route("**/api/app/negocios", (rota) =>
      rota.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"erro":"leitura-indisponivel"}',
      }),
    )
    await page.goto("/app/negocios")
    await expect(page.getByRole("button", { name: "Tentar de novo", exact: true })).toBeVisible()
    await expect(page.getByText("Ainda sem negócios cadastrados", { exact: true })).toHaveCount(0)
    await page.unroute("**/api/app/negocios")
    await page.getByRole("button", { name: "Tentar de novo", exact: true }).click()
    await expect(
      page.locator('[data-cartao="negocio"]', { hasText: "Climatiza Manaus" }),
    ).toBeVisible()
  })

  test("sem sessão, fora do alcance, pedido alheio e CSRF são recusados", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    const anonima = await apiRequest.newContext({ baseURL: "http://127.0.0.1:3000" })
    try {
      for (const caminho of [
        "/api/app/negocios",
        `/api/app/negocios/${NEGOCIO}`,
        "/api/app/pedidos",
        `/api/app/pedidos/${PEDIDO_SEMEADO}`,
      ]) {
        expect((await anonima.get(caminho)).status()).toBe(401)
      }
      expect(
        (
          await anonima.post(`/api/app/negocios/${NEGOCIO}/pedidos`, {
            headers: CABECALHOS,
            data: { descricao: "Limpar" },
          })
        ).status(),
      ).toBe(401)
    } finally {
      await anonima.dispose()
    }

    await semearSessaoDeMembro(context, OUTRA_CIDADE)
    expect((await page.request.get(`/api/app/negocios/${NEGOCIO}`)).status()).toBe(404)
    expect((await page.request.get(`/api/app/pedidos/${PEDIDO_SEMEADO}`)).status()).toBe(404)
    expect(
      (
        await page.request.post(`/api/app/negocios/${NEGOCIO}/pedidos`, {
          headers: CABECALHOS,
          data: { descricao: "Limpar" },
        })
      ).status(),
    ).toBe(404)
    const deOutraPessoa = await page.request.get(
      "/api/app/pedidos?user_id=30000000-0000-4000-8000-000000000001",
    )
    expect((await deOutraPessoa.json()).pedidos).toEqual([])

    await context.clearCookies()
    await semearSessaoDeMembro(context, MEMBRO)
    expect(
      (
        await page.request.post(`/api/app/negocios/${NEGOCIO}/pedidos`, {
          headers: { ...CABECALHOS, origin: "https://fora.example.invalid" },
          data: { descricao: "Limpar" },
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await page.request.post(`/api/app/negocios/${NEGOCIO}/pedidos`, {
          headers: { origin: CABECALHOS.origin },
          data: { descricao: "Limpar" },
        })
      ).status(),
    ).toBe(403)

    // A RLS deixa o destinatário ler o pedido; a API do membro exige solicitante.
    await context.clearCookies()
    await semearSessaoDeMembro(context, PRESTADOR)
    expect((await page.request.get(`/api/app/pedidos/${PEDIDO_SEMEADO}`)).status()).toBe(404)
  })

  test("vazios da cidade e dos próprios pedidos vêm de leituras reais", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, OUTRA_CIDADE)
    await page.goto("/app/negocios")
    await expect(page.getByText("Ainda sem negócios cadastrados", { exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.getByText("O que a comunidade de Rio de Janeiro está anunciando.", { exact: true }),
    ).toBeVisible()
    await capturar(page, testInfo.project.name, "07-negocios-vazio")
    await page.getByRole("button", { name: "Meus pedidos", exact: true }).click()
    await expect(page.getByText("Nenhum pedido ainda", { exact: true })).toBeVisible()
    await capturar(page, testInfo.project.name, "08-pedidos-vazio")
  })
})
