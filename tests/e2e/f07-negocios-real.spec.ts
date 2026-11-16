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
import { encerrarPedidoAberto } from "./helpers/pedidos"
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

// RUN-177 (F07): a página de negócio do MEMBRO. Uma persona isolada por largura
// (as mesmas do spec web que este bloco substitui) e limpeza por service_role
// antes de cada uma: a ficha, o catálogo, as fotos e os pedidos que ela recebeu
// são da fixture, não do seed.
const DONOS_DO_NEGOCIO: Record<string, { email: string; id: string }> = {
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
}
const NOME_DO_NEGOCIO = "Bivaque Vizinhança"
const APRESENTACAO = "Apoio prático para quem está chegando à cidade."
const APRESENTACAO_EDITADA = "Atendimento acolhedor para famílias que acabaram de chegar."
const SERVICO = "Orientação para mudança"
const LEGENDA_DA_FOTO = "Acolhida de quem chega à cidade"

/**
 * Apaga a ficha de negócio da persona e o que pende dela (cascata nas linhas;
 * os objetos do Storage saem antes, porque o bucket não conhece a ficha).
 */
async function limparNegocioDoDono(ownerId: string): Promise<void> {
  const chave =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY")
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY é necessária para limpar a fixture.")
  const api = await apiRequest.newContext({
    baseURL: urlDoSupabase(),
    extraHTTPHeaders: { apikey: chave, Authorization: `Bearer ${chave}` },
  })
  try {
    const perfis = await api.get("rest/v1/provider_profiles", {
      params: { owner_user_id: `eq.${ownerId}`, select: "id" },
    })
    expect(perfis.ok(), "limpar a ficha do negócio").toBe(true)
    const ids = (await perfis.json()) as { id: string }[]
    const caminhos: string[] = []
    for (const { id } of ids) {
      const fotos = await api.get("rest/v1/provider_portfolio_photos", {
        params: { provider_id: `eq.${id}`, select: "photo_path" },
      })
      expect(fotos.ok()).toBe(true)
      caminhos.push(...((await fotos.json()) as { photo_path: string }[]).map((r) => r.photo_path))
    }
    if (caminhos.length > 0) {
      const removidos = await api.delete("storage/v1/object/provider-photos", {
        data: { prefixes: caminhos },
      })
      expect(removidos.ok(), "remover as fotos da fixture").toBe(true)
    }
    const apagados = await api.delete("rest/v1/provider_profiles", {
      params: { owner_user_id: `eq.${ownerId}` },
    })
    expect(apagados.ok(), "apagar a ficha da fixture").toBe(true)
  } finally {
    await api.dispose()
  }
}

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
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  // Tema claro: o lançamento (14/11) é só claro; o app ignora o esquema do sistema.
  await expect
    .poll(async () => {
      const cor = await page
        .locator("[data-tela] h1")
        .first()
        .evaluate((elemento) => getComputedStyle(elemento).color)
      const canais = (cor.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3)
      return canais.length === 3 && canais.every((canal) => canal < 128)
    })
    .toBe(true)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.screenshot({
    path: join(CAPTURAS, `${projeto}-claro-${etapa}.png`),
    fullPage: true,
    animations: "disabled",
  })
}

async function abrirFicha(page: Page) {
  await page.goto(`/prestadores/${NEGOCIO}`)
  await expect(page).toHaveURL(new RegExp(`/app/negocio/${NEGOCIO}$`))
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
    await expect(page.getByRole("heading", { level: 1, name: "Mercado da cidade" })).toBeVisible({
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

    // A próxima largura usa a mesma persona: encerrar devolve a vaga do teto.
    await encerrarPedidoAberto(context, gravado.pedido.id)
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

    // A RLS sempre deixou o destinatário ler o pedido; desde o RUN-177 (F07) a
    // porta também serve os DOIS lados — o dono do negócio vê o que recebeu, com
    // `lado: "dono"`. Quem não participa continua sem ver (provado acima).
    await context.clearCookies()
    await semearSessaoDeMembro(context, PRESTADOR)
    const doDestinatario = await page.request.get(`/api/app/pedidos/${PEDIDO_SEMEADO}`)
    expect(doDestinatario.status()).toBe(200)
    expect((await doDestinatario.json()).pedido.lado).toBe("dono")
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

/**
 * RUN-177 (F07) — a jornada do DONO do negócio, que vivia no spec web
 * `provider-member-business.spec.ts` e agora é do app. Cada garantia do spec
 * morto está aqui: entrada de produto, validação do nome, falha de escrita que
 * preserva o texto, criação, edição, ficha pública, item de catálogo, foto do
 * portfólio, presença na lista da cidade, e o pedido recebido — que o dono
 * encerra e o solicitante vê encerrado.
 */
test.describe("F07 — página de negócio do membro (dono)", { tag: "@stateful" }, () => {
  test.beforeAll(exigirAmbienteLocal)

  test.beforeEach(async ({ page: _pagina }, testInfo) => {
    const dono = DONOS_DO_NEGOCIO[testInfo.project.name]
    if (!dono) throw new Error(`Sem dono de negócio para ${testInfo.project.name}.`)
    await limparNegocioDoDono(dono.id)
  })

  test("cria, edita, publica catálogo e foto, aparece na lista e acompanha o pedido", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(240_000)
    const dono = DONOS_DO_NEGOCIO[testInfo.project.name]
    if (!dono) throw new Error(`Sem dono de negócio para ${testInfo.project.name}.`)
    await semearSessaoDeMembro(context, dono.email)

    // Entrada de produto: o Mercado da cidade leva a Meu negócio.
    await page.goto("/app/negocios")
    await page.getByRole("button", { name: "Divulgar meu negócio", exact: true }).first().click()
    await expect(page).toHaveURL(/\/app\/meu-negocio$/)
    await expect(page.getByRole("heading", { level: 1, name: "Meu negócio" })).toBeVisible({
      timeout: 30_000,
    })

    // Nome curto é recusado e o texto digitado continua no campo.
    await page.getByLabel("Nome do negócio").fill("A")
    await page.getByRole("button", { name: "Criar minha página" }).click()
    await expect(page.getByRole("alert")).toContainText("entre 2 e 80")
    await expect(page.getByLabel("Nome do negócio")).toHaveValue("A")

    await page.getByLabel("Nome do negócio").fill(NOME_DO_NEGOCIO)
    await page.getByLabel("Categoria").selectOption("assistencia_tecnica")
    await page.getByLabel("O que você oferece (opcional)").fill(APRESENTACAO)

    // Falha simulada da porta: a mensagem promete o texto preservado, e ele está.
    await page.route(
      (url) => url.pathname === "/api/app/negocio",
      async (rota) => {
        if (rota.request().method() !== "POST") return rota.fallback()
        await rota.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } })
      },
    )
    await page.getByRole("button", { name: "Criar minha página" }).click()
    await expect(page.getByRole("alert")).toContainText("continuam preenchidos")
    await expect(page.getByLabel("Nome do negócio")).toHaveValue(NOME_DO_NEGOCIO)
    await capturar(page, testInfo.project.name, "09-meu-negocio-falha")
    await page.unrouteAll({ behavior: "wait" })

    await page.getByRole("button", { name: "Criar minha página" }).click()
    await expect(page.getByText("Sua página foi criada.")).toBeVisible({ timeout: 30_000 })

    // Edição da apresentação.
    await page.getByLabel("O que você oferece (opcional)").fill(APRESENTACAO_EDITADA)
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Sua página foi salva.")).toBeVisible({ timeout: 30_000 })

    // A página pública: mesmo id que o link carrega.
    await page.getByRole("button", { name: "Ver página pública" }).click()
    await expect(page).toHaveURL(/\/app\/negocio\/[0-9a-f-]+$/)
    const fichaPublica = new URL(page.url())
    const providerId = fichaPublica.pathname.split("/").at(-1)
    expect(providerId).toBeTruthy()
    await expect(page.getByRole("heading", { level: 1, name: NOME_DO_NEGOCIO })).toBeVisible()
    await expect(page.getByText(APRESENTACAO_EDITADA)).toBeVisible()
    await capturar(page, testInfo.project.name, "10-ficha-publica")

    // Catálogo: publicar o item e vê-lo na própria ficha.
    await page.goto("/app/meu-negocio")
    await page.getByLabel("Título do item").fill(SERVICO)
    await page.getByLabel("Descrição do item (opcional)").fill("Atendimento sob orçamento.")
    await page.getByRole("button", { name: "Publicar item", exact: true }).click()
    await expect(page.getByText("Serviço publicado.")).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-lista="servicos"]')).toContainText(SERVICO)

    // Foto do portfólio: upload pela porta, assinatura na leitura, e a imagem
    // sobrevive à recarga (nada de estado só na tela).
    await page.getByLabel("Legenda da foto (opcional)").fill(LEGENDA_DA_FOTO)
    const envioDaFoto = page.waitForResponse(
      (resposta) =>
        new URL(resposta.url()).pathname === "/api/app/negocio/fotos" &&
        resposta.request().method() === "POST",
    )
    await page
      .locator("#foto-arquivo")
      .setInputFiles(
        join(process.cwd(), "apps", "web", "public", "landing", "hero-bivaque-arrival.webp"),
      )
    expect((await envioDaFoto).status()).toBe(201)
    await page.reload()
    await expect(page.getByRole("img", { name: LEGENDA_DA_FOTO })).toBeVisible({
      timeout: 30_000,
    })
    await capturar(page, testInfo.project.name, "11-meu-negocio")

    // A ficha aparece na busca de serviços da cidade. RUN-177: `/explorar/servicos`
    // NÃO foi trocada (a busca global da web linka para lá e o global-search-flow
    // a exercita); a garantia do spec morto volta a ser provada na tela web viva.
    await page.goto("/explorar/servicos?q=vizinhanca")
    await expect(page.getByText(NOME_DO_NEGOCIO, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })

    // /negocio é 307 para a gestão no app.
    await page.goto("/negocio")
    await expect(page).toHaveURL(/\/app\/meu-negocio$/)
    await expect(page.getByRole("heading", { level: 1, name: "Meu negócio" })).toBeVisible()

    // ── O pedido, dos dois lados ────────────────────────────────────────────
    // O membro pede à ficha recém-publicada.
    await context.clearCookies()
    await semearSessaoDeMembro(context, MEMBRO)
    await page.goto(`/app/negocio/${providerId}`)
    await page.getByRole("link", { name: "Pedir orçamento", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/app/pedidos/novo\\?destino=${providerId}$`))
    const descricaoDoPedido = `Orientação para a mudança — ${testInfo.project.name}`
    await page.getByLabel("O que você precisa?").fill(descricaoDoPedido)
    await page.getByLabel("Quando precisa? (opcional)").fill("Nesta semana")
    const criacao = page.waitForResponse(
      (resposta) =>
        resposta.url().endsWith(`/api/app/negocios/${providerId}/pedidos`) &&
        resposta.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Enviar pedido", exact: true }).click()
    const enviado = await criacao
    expect(enviado.status()).toBe(201)
    const pedidoId = ((await enviado.json()) as { pedido: { id: string } }).pedido.id
    await expect(page).toHaveURL(new RegExp(`/app/pedido/${pedidoId}$`))
    await expect(page.getByText("Em aberto", { exact: true })).toBeVisible()

    // O dono recebe, vê de que lado está, abre a conversa e encerra.
    await context.clearCookies()
    await semearSessaoDeMembro(context, dono.email)
    await page.goto("/app/pedidos")
    const recebidos = page.locator('[data-tela="pedidos"]', { hasText: "Recebidos" })
    await expect(recebidos).toContainText(descricaoDoPedido, { timeout: 30_000 })
    await capturar(page, testInfo.project.name, "12-pedidos-recebidos")
    await page.locator('[data-linha="lista"]', { hasText: descricaoDoPedido }).click()
    await expect(page.getByText("Recebido", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Abrir conversa" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancelar pedido" })).toHaveCount(0)
    await page.getByRole("button", { name: "Encerrar pedido" }).click()
    const confirmacao = page.locator('[data-sobreposicao="confirmacao"]')
    await expect(confirmacao).toBeVisible()
    await expect(page.locator("[data-sobreposicao]")).toHaveCount(1)
    await confirmacao.getByRole("button", { name: "Encerrar pedido" }).click()
    await expect(page.getByText("Pedido encerrado.")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Encerrado", { exact: true })).toBeVisible()
    await capturar(page, testInfo.project.name, "13-pedido-encerrado")

    // O solicitante vê o mesmo estado encerrado (persistido, não presumido).
    await context.clearCookies()
    await semearSessaoDeMembro(context, MEMBRO)
    await page.goto(`/app/pedido/${pedidoId}`)
    await expect(page.getByText("Encerrado", { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Encerrar pedido" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Abrir conversa" })).toBeVisible()

    // F06 resíduo: /mercado/novo segue chegando à lista do app.
    await page.goto("/mercado/novo")
    await expect(page).toHaveURL(/\/app\/mercado(\?.*)?$/)
  })
})
