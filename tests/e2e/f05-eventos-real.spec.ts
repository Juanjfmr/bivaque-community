import { mkdirSync } from "node:fs"
import { join } from "node:path"
import {
  request as apiRequest,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

// F05 — a agenda e o encontro do app lendo e gravando no banco de verdade
// (RUN-007 / ADR-20261105). O que este arquivo prova é a jornada inteira:
// entrada, ação, gravação, retorno, acompanhamento e as falhas principais.
//
// Contra o Next que serve `/app` e o Supabase local com seed. Pré-requisitos:
//   * banco local migrado e semeado (supabase/seed.sql);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f05-eventos-real.spec.ts
//
// @stateful: cria evento e grava presença e pergunta com as personas do seed,
// então roda no lote serial (`--workers=1`). As três larguras rodam em série no
// mesmo usuário; por isso o evento de cada projeto leva o nome do projeto.

const DIRETORIO_DAS_CAPTURAS = join(process.cwd(), ".visual", "f05-eventos")

/** Persona semeada de outra cidade (Rio): lê Manaus, mas não participa. */
const MEMBRO_DE_OUTRA_CIDADE = "membro-rio@bivaque.example.invalid"

/** Evento semeado cujo organizador NÃO é a persona do teste. */
const EVENTO_DE_OUTRO_ORGANIZADOR = "70000000-0000-4000-8000-0000000000a1"

const ENCONTRO_FUTURO_SEMEADO = "Piquenique das famílias"
const ENCONTRO_PASSADO_SEMEADO = "Caminhada matinal no parque"

async function capturar(page: Page, projeto: string, etapa: string): Promise<void> {
  mkdirSync(DIRETORIO_DAS_CAPTURAS, { recursive: true })
  for (const tema of ["claro", "escuro"] as const) {
    await page.emulateMedia({ colorScheme: tema === "claro" ? "light" : "dark" })
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await page.screenshot({
      path: join(DIRETORIO_DAS_CAPTURAS, `${projeto}-${tema}-${etapa}.png`),
      fullPage: true,
    })
  }
  await page.emulateMedia({ colorScheme: "light" })
}

/** Canais do `color` computado do título da tela. */
async function corDoTitulo(page: Page): Promise<readonly number[]> {
  const cor = await page
    .locator("[data-tela] h1")
    .first()
    .evaluate((elemento) => getComputedStyle(elemento).color)
  return (cor.match(/\d+/g) ?? []).map(Number).slice(0, 3)
}

function canais(cor: string): readonly number[] {
  return (cor.match(/[\d.]+/g) ?? []).map(Number)
}

/** Luminância relativa da WCAG, a partir de um `rgb()/rgba()` computado. */
function luminancia(cor: string): number {
  const [r = 0, g = 0, b = 0] = canais(cor)
    .slice(0, 3)
    .map((valor) => valor / 255)
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

function contraste(texto: string, fundo: string): number {
  const a = luminancia(texto)
  const b = luminancia(fundo)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/**
 * Cor do texto do botão e o primeiro fundo opaco atrás dele. Um botão de contorno
 * não pinta o próprio fundo: o contraste real é contra a superfície da tela.
 */
async function coresDoBotao(
  page: Page,
  nome: string,
): Promise<{
  texto: string
  fundo: string
  borda: string
  temaEscuro: boolean
  fgVar: string
  bgVar: string
}> {
  return page.getByRole("button", { name: nome, exact: true }).evaluate((elemento) => {
    const alvo = elemento as HTMLElement
    const estilo = getComputedStyle(alvo)
    let no: HTMLElement | null = alvo
    let fundo = "rgb(0, 0, 0)"
    while (no !== null) {
      const cor = getComputedStyle(no).backgroundColor
      const alfa = (cor.match(/[\d.]+/g) ?? [])[3]
      if (cor !== "transparent" && cor !== "rgba(0, 0, 0, 0)" && alfa !== "0") {
        fundo = cor
        break
      }
      no = no.parentElement
    }
    const raiz = getComputedStyle(document.documentElement)
    return {
      texto: estilo.color,
      fundo,
      borda: estilo.borderTopColor,
      temaEscuro: window.matchMedia("(prefers-color-scheme: dark)").matches,
      fgVar: raiz.getPropertyValue("--foreground").trim(),
      bgVar: raiz.getPropertyValue("--background").trim(),
    }
  })
}

/**
 * Deixa a presença de partida em branco. As três larguras rodam em série com a
 * MESMA persona: um teste que começa presumindo "ainda não confirmei" quebra
 * quando a largura anterior deixou a presença gravada.
 */
async function garantirSemPresenca(page: Page): Promise<void> {
  const confirmada = page.getByRole("button", { name: "Presença confirmada" })
  if ((await confirmada.count()) === 0) return
  await page.getByRole("button", { name: "Cancelar presença" }).click()
  await expect(page.getByRole("button", { name: "Vou", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  )
}

/**
 * O token da sessão semeada, lido do próprio cookie que o app usa. O PostgREST
 * autentica por `Authorization: Bearer` — o cookie do `@supabase/ssr` só é
 * entendido pelo supabase-js —, então a leitura do banco pela mesma pessoa passa
 * por aqui, sob RLS.
 */
async function tokenDaSessao(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((item) => /^sb-.*-auth-token$/.test(item.name))
  if (cookie === undefined) throw new Error("a sessão semeada não está nos cookies")
  const sessao = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { access_token?: string }
  if (typeof sessao.access_token !== "string") throw new Error("cookie de sessão sem token")
  return sessao.access_token
}

async function entrarComo(context: BrowserContext, email: string): Promise<void> {
  await semearSessaoDeMembro(context, email)
}

test.describe("F05 — eventos reais no app", { tag: "@stateful" }, () => {
  test("a agenda é a da cidade da pessoa, com presença e pergunta gravadas", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    const projeto = testInfo.project.name
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto("/app/agenda")
    await expect(
      page.getByRole("heading", { level: 1, name: "Agenda da cidade" }),
      "a agenda real não está servida em /app/agenda: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    // O cabeçalho diz a cidade do vínculo `current`, não a da demonstração.
    await expect(
      page.getByText("Encontros da comunidade de Manaus."),
      "o título da agenda precisa usar a cidade que a rota devolveu",
    ).toBeVisible()

    const agenda = page.locator('[data-tela="agenda"]')
    const linhaDoFuturo = agenda.locator('[data-linha="lista"]', {
      hasText: ENCONTRO_FUTURO_SEMEADO,
    })
    await expect(linhaDoFuturo).toBeVisible({ timeout: 30_000 })
    await expect(
      agenda.locator('[data-linha="lista"]', { hasText: ENCONTRO_PASSADO_SEMEADO }),
      "encontro passado não entra na agenda",
    ).toHaveCount(0)

    // Cor computada no escuro: o tema do sistema chega até a tela.
    await page.emulateMedia({ colorScheme: "dark" })
    await page.waitForFunction(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
    const noEscuro = await corDoTitulo(page)
    expect(noEscuro, "no escuro o título é claro").toHaveLength(3)
    for (const canal of noEscuro) expect(canal).toBeGreaterThan(128)

    // A ação da tela é legível no escuro — medido, não olhado.
    const criar = await coresDoBotao(page, "Criar encontro")
    expect(
      contraste(criar.texto, criar.fundo),
      `"Criar encontro" no escuro: ${criar.texto} sobre ${criar.fundo} (temaEscuro=${criar.temaEscuro})`,
    ).toBeGreaterThanOrEqual(4.5)

    await page.emulateMedia({ colorScheme: "light" })
    const noClaro = await corDoTitulo(page)
    for (const canal of noClaro) expect(canal).toBeLessThan(128)
    await capturar(page, projeto, "agenda")

    await linhaDoFuturo.click()
    await expect(
      page.getByRole("heading", { level: 1, name: ENCONTRO_FUTURO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })
    // A cidade mostrada é a do ENCONTRO, não a da casca.
    await expect(page.locator("[data-cidade-do-evento]")).toHaveText("Manaus")

    // Presença: o que a tela mostra depois é o que ficou gravado.
    await garantirSemPresenca(page)
    await page.getByRole("button", { name: "Vou", exact: true }).click()
    await expect(page.getByRole("button", { name: "Presença confirmada" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await page.reload()
    await expect(
      page.getByRole("button", { name: "Presença confirmada" }),
      "a presença precisa sobreviver ao recarregamento",
    ).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 })

    // Contraste das ações de presença no escuro — medido, não olhado.
    await page.emulateMedia({ colorScheme: "dark" })
    await page.waitForFunction(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
    for (const nome of ["Não vou", "Cancelar presença"]) {
      const cores = await coresDoBotao(page, nome)
      expect(
        contraste(cores.texto, cores.fundo),
        `"${nome}" no escuro: ${cores.texto} sobre ${cores.fundo} (temaEscuro=${cores.temaEscuro}, --foreground=${cores.fgVar}, --background=${cores.bgVar})`,
      ).toBeGreaterThanOrEqual(4.5)
    }
    await page.emulateMedia({ colorScheme: "light" })
    await capturar(page, projeto, "encontro-com-presenca")

    // Cancelar volta ao estado anterior, e também sobrevive ao recarregamento.
    await page.getByRole("button", { name: "Cancelar presença" }).click()
    await expect(page.getByRole("button", { name: "Vou", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    await page.reload()
    await expect(page.getByRole("button", { name: "Vou", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
      { timeout: 30_000 },
    )

    // Pergunta: a tela diz que enviou E o texto está gravado na conversa do
    // evento. A leitura usa a mesma sessão do navegador, sob RLS.
    const resposta = page.waitForResponse(
      (r) => r.url().includes("/perguntas") && r.request().method() === "POST",
    )
    await page.getByLabel("Sua pergunta").fill("Vai ter estacionamento no local?")
    await page.getByRole("button", { name: "Enviar pergunta" }).click()
    await expect(page.getByText("Sua pergunta foi enviada.")).toBeVisible({ timeout: 30_000 })

    const enviada = await resposta
    expect(enviada.status()).toBe(201)
    const { conversaId } = (await enviada.json()) as { conversaId: string }
    expect(conversaId).toMatch(/^[0-9a-f-]{36}$/)
    const lidas = await page.request.get(
      `${process.env["NEXT_PUBLIC_SUPABASE_URL"]}/rest/v1/dm_messages?select=content&conversation_id=eq.${conversaId}`,
      {
        headers: {
          apikey: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "",
          authorization: `Bearer ${await tokenDaSessao(context)}`,
        },
      },
    )
    expect(lidas.status(), "a conversa precisa ser legível por quem perguntou").toBe(200)
    const mensagens = (await lidas.json()) as { content: string }[]
    expect(mensagens.map((m) => m.content)).toContain("Vai ter estacionamento no local?")
  })

  test("escrita que falha volta ao estado anterior com mensagem", async ({ page, context }) => {
    test.setTimeout(180_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto("/app/agenda")
    await page
      .locator('[data-tela="agenda"] [data-linha="lista"]', { hasText: ENCONTRO_FUTURO_SEMEADO })
      .click()
    await expect(
      page.getByRole("heading", { level: 1, name: ENCONTRO_FUTURO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })

    await garantirSemPresenca(page)

    // A rota de presença cai. A tela não pode fingir que gravou.
    await page.route("**/api/app/eventos/*/presenca", (rota) => rota.abort())
    await page.getByRole("button", { name: "Vou", exact: true }).click()
    await expect(page.locator('[data-tela="evento"] [role="alert"]')).toContainText("presença", {
      timeout: 30_000,
    })
    await expect(
      page.getByRole("button", { name: "Vou", exact: true }),
      "o estado anterior continua na tela",
    ).toHaveAttribute("aria-pressed", "false")

    // Com a rota de volta, a mesma ação grava.
    await page.unroute("**/api/app/eventos/*/presenca")
    await page.getByRole("button", { name: "Vou", exact: true }).click()
    await expect(page.getByRole("button", { name: "Presença confirmada" })).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 30_000 },
    )
  })

  test("o organizador cria e edita; quem não organiza não vê editar", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    const projeto = testInfo.project.name
    const titulo = `Encontro do piloto ${projeto}`
    const tituloEditado = `${titulo} (editado)`
    await entrarComo(context, MEMBRO_SEMEADO)

    // Evento de outro organizador: a tela abre, mas sem a ação de editar.
    await page.goto(`/app/evento/${EVENTO_DE_OUTRO_ORGANIZADOR}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Mutirão da horta comunitária" }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole("button", { name: "Editar" }),
      "quem não organiza não vê editar",
    ).toHaveCount(0)

    // Criar: a partir da agenda, e a tela vai para o encontro gravado.
    await page.goto("/app/agenda")
    await page.getByRole("button", { name: "Criar encontro" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByLabel("Título").fill(titulo)
    await page.getByLabel("Data e hora").fill("2027-01-15T19:00")
    await page.getByLabel("Local").fill("Ginásio Municipal")
    await page.getByLabel("Sobre o encontro").fill("Encontro criado pelo teste do piloto.")
    await capturar(page, projeto, "formulario-novo")
    await page.getByRole("button", { name: "Criar", exact: true }).click()

    await expect(
      page.getByRole("heading", { level: 1, name: titulo }),
      "criar leva ao detalhe do encontro gravado",
    ).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).pathname).toMatch(/^\/app\/evento\/[0-9a-f-]{36}$/)
    await expect(
      page.getByText("Você organiza este encontro: a presença é de quem participa."),
    ).toBeVisible()

    // Editar: o mesmo formulário, com o que já estava gravado.
    await page.getByRole("button", { name: "Editar" }).click()
    await expect(page.getByLabel("Título")).toHaveValue(titulo)
    await page.getByLabel("Título").fill(tituloEditado)
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByRole("heading", { level: 1, name: tituloEditado })).toBeVisible({
      timeout: 30_000,
    })
    await capturar(page, projeto, "encontro-do-organizador")

    await page.reload()
    await expect(
      page.getByRole("heading", { level: 1, name: tituloEditado }),
      "a edição precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
  })

  test("servidor fora mostra erro com Tentar de novo, nunca lista vazia", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.route("**/api/app/eventos", (rota) => rota.abort())
    await page.goto("/app/agenda")
    const erro = page.locator('[data-estado="erro"]')
    await expect(erro).toBeVisible({ timeout: 30_000 })
    await expect(erro).toContainText("Não foi possível carregar")
    await expect(
      page.getByText("Nenhum encontro agendado"),
      "banco fora não pode virar agenda vazia",
    ).toHaveCount(0)

    await page.unroute("**/api/app/eventos")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(
      page.locator('[data-tela="agenda"] [data-linha="lista"]', {
        hasText: ENCONTRO_FUTURO_SEMEADO,
      }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("sessão vencida e acesso negado têm saídas próprias", async ({ page, context }) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    // 401: a saída é entrar de novo — tentar de novo com o mesmo cookie não resolve.
    await page.route("**/api/app/eventos", (rota) =>
      rota.fulfill({ status: 401, body: '{"autenticado":false,"motivo":"sem-credencial"}' }),
    )
    await page.goto("/app/agenda")
    const sessao = page.locator('[data-estado="sessao-vencida"]')
    await expect(sessao).toBeVisible({ timeout: 30_000 })
    await expect(sessao.getByRole("button", { name: "Entrar de novo" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0)

    // 403: negado, sem botão que repete a mesma chamada.
    await page.unroute("**/api/app/eventos")
    await page.route("**/api/app/eventos", (rota) =>
      rota.fulfill({ status: 403, body: '{"erro":"recusado"}' }),
    )
    await page.goto("/app/agenda")
    await expect(page.locator('[data-estado="negado"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Entrar de novo" })).toHaveCount(0)
  })

  test("503 no detalhe do encontro mostra erro, não tela vazia", async ({ page, context }) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.route("**/api/app/eventos/*", (rota) => rota.fulfill({ status: 503, body: "{}" }))
    await page.goto("/app/agenda")
    await page
      .locator('[data-tela="agenda"] [data-linha="lista"]', { hasText: ENCONTRO_FUTURO_SEMEADO })
      .click()
    await expect(page.locator('[data-estado="erro"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Sobre o encontro")).toHaveCount(0)
  })

  test("membro de outra cidade lê o encontro como visita, sem presença nem pergunta", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_DE_OUTRA_CIDADE)

    // A agenda continua sendo a da cidade da pessoa: a de Manaus não aparece.
    await page.goto("/app/agenda")
    await expect(page.getByRole("heading", { level: 1, name: "Agenda da cidade" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.locator('[data-tela="agenda"] [data-linha="lista"]', {
        hasText: ENCONTRO_FUTURO_SEMEADO,
      }),
      "o corte por cidade é da sessão, não do cliente",
    ).toHaveCount(0)

    // O encontro de Manaus abre — por decisão de 25/09, ler é de qualquer membro.
    await page.goto("/app/evento/70000000-0000-4000-8000-000000000005")
    await expect(
      page.getByRole("heading", { level: 1, name: ENCONTRO_FUTURO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })
    // A cidade mostrada é a do evento, não a de quem olha.
    await expect(page.locator("[data-cidade-do-evento]")).toHaveText("Manaus")
    await expect(page.locator('[data-visitante="sim"]')).toContainText("Encontro de outra cidade")
    await expect(page.getByRole("button", { name: "Vou", exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Não vou", exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Sua pergunta")).toHaveCount(0)
    await capturar(page, testInfo.project.name, "encontro-de-visitante")

    // A tela esconde; o servidor precisa recusar. Escrita direta na rota, sem
    // passar pela interface e sem cookie (Bearer puro): mandar as duas
    // credenciais seria recusado como conflito e não provaria a autorização.
    const token = await tokenDaSessao(context)
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const cabecalhos = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    }
    const presenca = await api.put(
      "/api/app/eventos/70000000-0000-4000-8000-000000000005/presenca",
      { headers: cabecalhos, data: { situacao: "going" } },
    )
    expect(presenca.status(), "presença de visita é recusada no servidor").toBe(403)
    expect((await presenca.json()) as { erro: string }).toEqual({ erro: "de-outra-cidade" })

    const pergunta = await api.post(
      "/api/app/eventos/70000000-0000-4000-8000-000000000005/perguntas",
      { headers: cabecalhos, data: { texto: "Posso participar mesmo morando longe?" } },
    )
    expect(pergunta.status(), "pergunta de visita é recusada no servidor").toBe(403)
    expect((await pergunta.json()) as { erro: string }).toEqual({ erro: "de-outra-cidade" })
    await api.dispose()
  })
})
