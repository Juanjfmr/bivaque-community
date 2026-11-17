import { mkdirSync } from "node:fs"
import { join } from "node:path"
import {
  type APIRequestContext,
  request as apiRequest,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

// F04 — as perguntas da cidade no app lendo e gravando no banco de verdade
// (RUN-014 / ADR-20261105). O que este arquivo prova é a jornada inteira:
// entrada, ação, gravação, retorno, acompanhamento e as falhas principais.
//
// Contra o Next que serve `/app` e o Supabase local com seed. Pré-requisitos:
//   * banco local migrado e semeado (supabase/seed.sql);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f04-perguntas-real.spec.ts
//
// @stateful: grava resposta com a persona do seed, então roda no lote serial
// (`--workers=1`). As três larguras rodam em série no mesmo usuário; por isso a
// resposta de cada projeto leva o nome do projeto.

const DIRETORIO_DAS_CAPTURAS = join(process.cwd(), ".visual", "run-014")

/** Persona semeada de outra cidade (Rio): não alcança as perguntas de Manaus. */
const MEMBRO_DE_OUTRA_CIDADE = "membro-rio@bivaque.example.invalid"

/** Pergunta aberta semeada de OUTRA pessoa ("Alguém conhece ortopedista bom?"). */
const PERGUNTA_SEMEADA = "80000000-0000-4000-8000-000000000f08"
const TEXTO_SEMEADO = "Alguém conhece ortopedista bom?"

/** Pergunta semeada da PRÓPRIA persona ("Alguém conhece um bom encanador?"). */
const TEXTO_DA_PESSOA = "Alguém conhece um bom encanador?"

/** Pergunta aberta de OUTRA pessoa, com resposta na conversa (RUN-153). */
const TEXTO_DA_OUTRA_PESSOA = "Diarista para faxina semanal no Parque Dez"

/** A pergunta acima e a resposta dela, de OUTRA pessoa: é nelas que a recusa é provada. */
const ID_DA_OUTRA_PESSOA = "80000000-0000-4000-8000-000000000f09"
const RESPOSTA_DA_OUTRA_PESSOA = "d0000000-0000-4000-8000-000000000019"
const TEXTO_DA_RESPOSTA_ALHEIA = "A Dona Célia faz faxina na minha casa há um ano."

async function capturar(page: Page, projeto: string, etapa: string): Promise<void> {
  mkdirSync(DIRETORIO_DAS_CAPTURAS, { recursive: true })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.screenshot({
    path: join(DIRETORIO_DAS_CAPTURAS, `${projeto}-claro-${etapa}.png`),
    fullPage: true,
  })
}

/**
 * O token da sessão semeada, lido do próprio cookie que o app usa: as chamadas
 * diretas à rota provam a autorização sem depender da interface.
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

/**
 * A API com o token da própria sessão. O teste de autoria cria o conteúdo que
 * vai editar: o seed que os outros specs leem não ganha pergunta nem resposta.
 */
async function apiDaSessao(
  page: Page,
  context: BrowserContext,
): Promise<{
  api: APIRequestContext
  cabecalhos: Record<string, string>
}> {
  const token = await tokenDaSessao(context)
  const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
  return {
    api,
    cabecalhos: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  }
}

/** Cria a pergunta do teste (e, quando pedido, uma resposta dela) pela sessão. */
async function criarPerguntaDoTeste(
  api: APIRequestContext,
  cabecalhos: Readonly<Record<string, string>>,
  titulo: string,
  textoDaResposta?: string,
): Promise<string> {
  const criada = await api.post("/api/app/perguntas", {
    headers: cabecalhos,
    data: { titulo, assunto: "Preciso de uma indicação esta semana." },
  })
  expect(criada.status(), "a pergunta do próprio teste precisa ser criada").toBe(201)
  const { pergunta } = (await criada.json()) as { pergunta: { id: string } }
  if (textoDaResposta !== undefined) {
    const respondida = await api.post(`/api/app/perguntas/${pergunta.id}/respostas`, {
      headers: cabecalhos,
      data: { texto: textoDaResposta },
    })
    expect(respondida.status(), "a resposta do próprio teste precisa ser gravada").toBe(201)
  }
  return pergunta.id
}

test.describe("F04 — perguntas reais no app", { tag: "@stateful" }, () => {
  test("a lista é a da cidade e a resposta sobrevive ao recarregar", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    const projeto = testInfo.project.name
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/comunidade")
    await expect(
      page.getByRole("heading", { level: 1, name: "Comunidade" }),
      "a comunidade real não está servida em /app/comunidade: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    // "Para ajudar" é pergunta aberta de OUTRA pessoa: a pergunta semeada dela
    // aparece, a da própria persona não.
    const linha = page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', {
      hasText: TEXTO_SEMEADO,
    })
    await expect(linha).toBeVisible({ timeout: 30_000 })
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', {
        hasText: TEXTO_DA_PESSOA,
      }),
      "a pergunta da própria pessoa não entra em Para ajudar",
    ).toHaveCount(0)

    await capturar(page, projeto, "comunidade")
    await linha.click()

    await expect(page.getByRole("heading", { level: 1, name: TEXTO_SEMEADO })).toBeVisible({
      timeout: 30_000,
    })

    const texto = `Passei pela mesma situação e indico a mesma equipe (${projeto}).`
    await page.getByLabel("Sua resposta").fill(texto)
    await page.getByRole("button", { name: "Enviar indicação" }).click()

    // O que a tela mostra depois é o que ficou gravado, com a autoria da sessão.
    // A asserção é pela BOLHA da resposta: o mesmo texto ainda pode estar no
    // campo, e o motor de texto do Playwright também casa o valor de um campo.
    await expect(
      page.getByRole("paragraph").filter({ hasText: texto }).first(),
      "a resposta gravada aparece na conversa",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel("Sua resposta")).toHaveValue("")
    await expect(page.getByText("Você").first()).toBeVisible()
    await capturar(page, projeto, "pergunta-respondida")

    await page.reload()
    await expect(
      page.getByRole("paragraph").filter({ hasText: texto }).first(),
      "a resposta precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
  })

  test("o filtro de tópico estreita a lista pela cidade real", async ({ page, context }) => {
    test.setTimeout(120_000)
    // RUN-025c (ADR-20261107 item 5): a lista fechada filtra no servidor. O
    // ortopedista semeado é `saude_bem_estar`; mudança de tópico o esconde.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/comunidade")
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })

    const pedidoSaude = page.waitForResponse((resposta) =>
      resposta.url().includes("topico=saude_bem_estar"),
    )
    await page.locator('[data-topicos="filtro-comunidade"] [data-chip="saude_bem_estar"]').click()
    await pedidoSaude
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })

    const pedidoTransporte = page.waitForResponse((resposta) =>
      resposta.url().includes("topico=transporte"),
    )
    await page.locator('[data-topicos="filtro-comunidade"] [data-chip="transporte"]').click()
    await pedidoTransporte
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO }),
      "tópico errado não pode deixar a pergunta de saúde na lista",
    ).toHaveCount(0)
    await expect(page.getByRole("alert")).toHaveCount(0)

    // Voltar a "todos" devolve a lista inteira, sem erro.
    const pedidoTodos = page.waitForResponse((resposta) =>
      resposta.url().includes("/api/app/perguntas"),
    )
    await page.locator('[data-topicos="filtro-comunidade"] [data-chip="todos"]').click()
    await pedidoTodos
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("Minhas é a autoria do servidor e a pergunta abre com a conversa", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/comunidade")
    await page.getByRole("radio", { name: "Filtrar por Minhas" }).click()

    const linha = page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', {
      hasText: TEXTO_DA_PESSOA,
    })
    await expect(linha).toBeVisible({ timeout: 30_000 })
    await expect(linha).toContainText("Você")
    await capturar(page, testInfo.project.name, "minhas")

    await linha.click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_DA_PESSOA })).toBeVisible({
      timeout: 30_000,
    })
    // A resposta semeada de outra pessoa aparece na conversa.
    await expect(
      page.getByText("O Seu Antônio atendeu aqui em casa e resolveu rápido."),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("quem é de outra cidade não alcança as perguntas de Manaus", async ({ page, context }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_DE_OUTRA_CIDADE)

    await page.goto("/app/comunidade")
    await expect(page.getByRole("heading", { level: 1, name: "Comunidade" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', {
        hasText: TEXTO_SEMEADO,
      }),
      "o corte por cidade é da sessão, não do cliente",
    ).toHaveCount(0)

    // A tela esconde; o servidor precisa recusar. Escrita direta na rota, sem
    // cookie (Bearer puro): mandar as duas credenciais seria recusado como
    // conflito e não provaria a autorização.
    const token = await tokenDaSessao(context)
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const cabecalhos = { authorization: `Bearer ${token}`, "content-type": "application/json" }

    const detalhe = await api.get(`/api/app/perguntas/${PERGUNTA_SEMEADA}`, { headers: cabecalhos })
    expect(detalhe.status(), "pergunta de outra cidade não existe para quem lê").toBe(404)

    const escrita = await api.post(`/api/app/perguntas/${PERGUNTA_SEMEADA}/respostas`, {
      headers: cabecalhos,
      data: { texto: "Resposta de quem não é da cidade." },
    })
    expect(escrita.status(), "responder de outra cidade é recusado no servidor").toBe(404)

    const seguir = await api.put(`/api/app/perguntas/${PERGUNTA_SEMEADA}/salvo`, {
      headers: cabecalhos,
    })
    expect(seguir.status(), "seguir de outra cidade é recusado no servidor").toBe(404)
    await api.dispose()
  })

  test("servidor fora mostra erro com Tentar de novo, nunca lista vazia", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.route(/\/api\/app\/perguntas(\?.*)?$/, (rota) => rota.abort())
    await page.goto("/app/comunidade")
    const erro = page.locator('[data-estado="erro"]')
    await expect(erro).toBeVisible({ timeout: 30_000 })
    await expect(erro).toContainText("Não foi possível carregar")
    await expect(
      page.getByText("Ninguém esperando resposta"),
      "banco fora não pode virar comunidade vazia",
    ).toHaveCount(0)

    await page.unroute(/\/api\/app\/perguntas(\?.*)?$/)
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("escrita que falha volta ao estado anterior com a mensagem", async ({ page, context }) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/comunidade")
    await page
      .locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO })
      .click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_SEMEADO })).toBeVisible({
      timeout: 30_000,
    })

    const antes = await page.locator('[data-tela="pergunta"]').innerText()

    // A rota de resposta cai. A tela não pode fingir que gravou.
    await page.route("**/api/app/perguntas/*/respostas", (rota) => rota.abort())
    const texto = "Resposta que não vai gravar."
    await page.getByLabel("Sua resposta").fill(texto)
    await page.getByRole("button", { name: "Enviar indicação" }).click()

    await expect(page.locator('[data-tela="pergunta"] [role="alert"]')).toContainText(
      "Não foi possível enviar sua resposta",
      { timeout: 30_000 },
    )
    await expect(page.getByLabel("Sua resposta"), "o texto digitado continua no campo").toHaveValue(
      texto,
    )
    // A resposta que falhou não entra na conversa: o estado anterior continua.
    await expect(
      page.locator('[data-tela="pergunta"] p').filter({ hasText: texto }),
      "a resposta que falhou não pode aparecer na conversa",
    ).toHaveCount(0)
    expect(antes).not.toContain(texto)
  })

  test("o autor reabre e marca a resposta que resolveu, e o estado sobrevive ao recarregar", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    // RUN-153: as RPCs de resolução já existiam; o que faltava era o caminho do
    // app. O seed deixa a pergunta da própria persona resolvida pela resposta do
    // Seu Antônio — este teste reabre e marca de novo, devolvendo o seed.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/comunidade")
    await page.getByRole("radio", { name: "Filtrar por Minhas" }).click()
    await page
      .locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_DA_PESSOA })
      .click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_DA_PESSOA })).toBeVisible({
      timeout: 30_000,
    })
    // Sem `exact`: a etiqueta carrega o ícone (aria-hidden) antes do texto, e o
    // texto do elemento é "check_circleResolvida" — `exact: true` nunca casa.
    await expect(
      page.getByText("Resolvida"),
      "o seed deixa a pergunta da própria pessoa resolvida",
    ).toBeVisible({ timeout: 30_000 })

    const respostaDoAntonio = page.locator('[data-tela="pergunta"] article', {
      hasText: "Seu Antônio atendeu aqui em casa",
    })
    await expect(respostaDoAntonio).toBeVisible({ timeout: 30_000 })

    await page.getByRole("button", { name: "Reabrir pergunta" }).click()
    await expect(page.getByText("Resolvida"), "reabrir tira a etiqueta de resolvida").toHaveCount(
      0,
      { timeout: 30_000 },
    )
    await capturar(page, testInfo.project.name, "pergunta-reaberta")

    // O que a tela mostra depois do recarregamento é o banco, não o estado local.
    await page.reload()
    await expect(
      page.getByRole("button", { name: "Reabrir pergunta" }),
      "a pergunta reaberta continua aberta depois do recarregamento",
    ).toHaveCount(0, { timeout: 30_000 })
    await expect(
      respostaDoAntonio.getByRole("button", { name: "Ajudou a resolver" }),
      "o autor vê o botão de marcar em cada resposta",
    ).toBeVisible({ timeout: 30_000 })

    await respostaDoAntonio.getByRole("button", { name: "Ajudou a resolver" }).click()
    await expect(
      respostaDoAntonio.getByText("Resolveu a pergunta"),
      "a resposta marcada é a resolução atual",
    ).toBeVisible({ timeout: 30_000 })

    await page.reload()
    await expect(
      page.getByText("Resolvida"),
      "a marcação precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page
        .locator('[data-tela="pergunta"] article', { hasText: "Seu Antônio atendeu aqui em casa" })
        .getByText("Resolveu a pergunta"),
    ).toBeVisible({ timeout: 30_000 })
    await capturar(page, testInfo.project.name, "pergunta-resolvida")
  })

  test("seguir respostas grava, aparece em Salvos e devolve o seed ao desseguir", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    // RUN-158: salvar e seguir são a MESMA ação (um registro em
    // `recommendation_saves`). O seed não tem seguimentos: as três larguras
    // usam a mesma persona, então o teste devolve o estado no fim.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/comunidade")
    await page
      .locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO })
      .click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_SEMEADO })).toBeVisible({
      timeout: 30_000,
    })

    const seguindo = page.getByRole("button", { name: "Seguindo respostas" })
    if ((await seguindo.count()) > 0) {
      await seguindo.click()
      await expect(page.getByRole("button", { name: "Seguir respostas" })).toBeVisible({
        timeout: 30_000,
      })
    }

    await page.getByRole("button", { name: "Seguir respostas" }).click()
    await expect(
      page.getByRole("button", { name: "Seguindo respostas" }),
      "o rótulo muda quando o servidor grava",
    ).toBeVisible({ timeout: 30_000 })
    await capturar(page, testInfo.project.name, "pergunta-seguindo")

    // Gravação que sobrevive: o marcador é lido de volta do banco.
    await page.reload()
    await expect(
      page.getByRole("button", { name: "Seguindo respostas" }),
      "o seguimento precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })

    // A tela Salvos lê a pergunta seguida pela sessão.
    await page.goto("/app/salvos")
    const linha = page.locator('[data-salvos="perguntas"] [data-linha="lista"]', {
      hasText: TEXTO_SEMEADO,
    })
    await expect(linha, "a pergunta seguida precisa aparecer em Salvos").toBeVisible({
      timeout: 30_000,
    })

    // A linha leva à pergunta; desseguir devolve a persona ao estado do seed.
    await linha.click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_SEMEADO })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole("button", { name: "Seguindo respostas" }).click()
    await expect(page.getByRole("button", { name: "Seguir respostas" })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("desseguir pela tela Salvos apaga a linha e ela não volta ao recarregar", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    // O seed não tem seguimentos: seguir e desseguir aqui devolvem o banco ao
    // estado semeado, sem criar pergunta nova.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/comunidade")
    await page
      .locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO })
      .click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_SEMEADO })).toBeVisible({
      timeout: 30_000,
    })

    const seguindo = page.getByRole("button", { name: "Seguindo respostas" })
    if ((await seguindo.count()) > 0) {
      await seguindo.click()
      await expect(page.getByRole("button", { name: "Seguir respostas" })).toBeVisible({
        timeout: 30_000,
      })
    }
    await page.getByRole("button", { name: "Seguir respostas" }).click()
    await expect(page.getByRole("button", { name: "Seguindo respostas" })).toBeVisible({
      timeout: 30_000,
    })

    // A remoção é feita na tela Salvos, não no detalhe da pergunta.
    await page.goto("/app/salvos")
    const linha = page.locator('[data-salvos="perguntas"] [data-linha="lista"]', {
      hasText: TEXTO_SEMEADO,
    })
    await expect(linha, "a pergunta seguida precisa aparecer em Salvos").toBeVisible({
      timeout: 30_000,
    })

    const remocao = page.waitForResponse(
      (resposta) =>
        resposta.request().method() === "DELETE" &&
        /\/api\/app\/perguntas\/[^/]+\/salvo(?:\?|$)/.test(resposta.url()),
      { timeout: 30_000 },
    )
    await page.getByRole("button", { name: `Remover dos salvos: ${TEXTO_SEMEADO}` }).click()
    await expect(linha, "a linha sai da tela na hora").toHaveCount(0, { timeout: 30_000 })
    expect((await remocao).ok(), "o servidor precisa aceitar o desseguir antes de recarregar").toBe(
      true,
    )

    // A seção só mostra o vazio dela depois de a lista ser lida: com o seed sem
    // outros seguimentos, esse vazio prova que a linha saiu do banco — o
    // `toHaveCount(0)` antes da leitura terminaria passando com o esqueleto.
    await page.reload()
    const secao = page.locator('[data-salvos="perguntas"]')
    await expect(secao, "a seção de perguntas precisa terminar de carregar").toContainText(
      "Nenhuma pergunta seguida ainda",
      { timeout: 30_000 },
    )
    await expect(
      secao.locator('[data-linha="lista"]', { hasText: TEXTO_SEMEADO }),
      "desseguir em Salvos precisa apagar a linha no banco",
    ).toHaveCount(0)
  })

  test("seguir que falha desfaz o estado otimista e diz o motivo", async ({ page, context }) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/comunidade")
    await page
      .locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO })
      .click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_SEMEADO })).toBeVisible({
      timeout: 30_000,
    })

    // O seed não tem seguimento: a tela parte de "Seguir respostas". A rota cai
    // depois do clique, e o rótulo otimista precisa voltar sozinho.
    await page.route("**/api/app/perguntas/*/salvo", (rota) => rota.abort())
    await page.getByRole("button", { name: "Seguir respostas" }).click()
    await expect(page.locator('[data-tela="pergunta"] [role="alert"]')).toContainText(
      "Não foi possível seguir esta pergunta",
      { timeout: 30_000 },
    )
    await expect(
      page.getByRole("button", { name: "Seguir respostas" }),
      "a falha devolve o rótulo anterior",
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Seguindo respostas" })).toHaveCount(0)
  })

  test("quem não perguntou não resolve nem reabre, e o Útil de resposta saiu", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/comunidade")
    await page
      .locator('[data-tela="comunidade"] [data-linha="pergunta"]', {
        hasText: TEXTO_DA_OUTRA_PESSOA,
      })
      .click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_DA_OUTRA_PESSOA })).toBeVisible({
      timeout: 30_000,
    })
    // A resposta de outra pessoa está na tela — é sobre ela que os botões viveriam.
    await expect(page.getByText("A Dona Célia faz faxina na minha casa há um ano.")).toBeVisible({
      timeout: 30_000,
    })

    await expect(
      page.getByRole("button", { name: "Ajudou a resolver" }),
      "só quem perguntou resolve a pergunta",
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Reabrir pergunta" }),
      "só quem perguntou reabre a pergunta",
    ).toHaveCount(0)

    // O "Útil" de resposta era um Set local que não persistia: saiu do
    // lançamento. O Útil real é o de comentário de grupo, em outra tela.
    await expect(
      page.locator('[data-tela="pergunta"]').getByRole("button", { name: /Útil/ }),
      "a resposta de pergunta não tem mais o Útil fake",
    ).toHaveCount(0)
  })

  test("denunciar pergunta grava, sobrevive ao recarregar e a duplicata é recusada", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    // RUN-159: a denúncia reaproveita o mecanismo `reports` (alvos
    // recommendation_request/reply já no enum). Denúncia não tem DELETE para o
    // membro (é trilha de auditoria), então as três larguras da mesma persona
    // convergem: a primeira grava, as seguintes leem 409 — por isso a primeira
    // resposta aceita as duas frases e a segunda prova a duplicata.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    async function denunciarPerguntaSemeada(): Promise<void> {
      await page.goto("/app/comunidade")
      await page
        .locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_SEMEADO })
        .click()
      await expect(page.getByRole("heading", { level: 1, name: TEXTO_SEMEADO })).toBeVisible({
        timeout: 30_000,
      })
      await page.getByRole("button", { name: "Opções da pergunta", exact: true }).click()
      await page.getByRole("button", { name: "Denunciar pergunta" }).click()
      await page.getByRole("radio", { name: "Spam" }).check()
      await page.getByLabel("Explicação (opcional)").fill("Pergunta repetida no mesmo dia.")
      await page.getByRole("button", { name: "Enviar denúncia" }).click()
    }

    await denunciarPerguntaSemeada()
    // A repetição entre larguras cai no índice de duplicata (409) e mostra a
    // frase no diálogo; a primeira grava (201) e mostra o aviso da tela.
    await expect(
      page.locator('[data-tela="pergunta"] [role="status"], [role="alert"]').first(),
      "a denúncia é GRAVADA antes do aviso",
    ).toContainText(/Denúncia enviada|Você já denunciou esta pergunta/, { timeout: 30_000 })

    // A gravação vive no banco: recarregar e denunciar de novo encontra a linha
    // aberta no índice de duplicata, e a tela mostra a frase do servidor.
    await page.reload()
    await page.getByRole("button", { name: "Opções da pergunta", exact: true }).click()
    await page.getByRole("button", { name: "Denunciar pergunta" }).click()
    await page.getByRole("radio", { name: "Outro" }).check()
    await page.getByRole("button", { name: "Enviar denúncia" }).click()
    await expect(page.getByRole("alert")).toContainText("Você já denunciou esta pergunta.", {
      timeout: 30_000,
    })

    // A pergunta da própria persona não oferece denúncia...
    await page.goto("/app/comunidade")
    await page.getByRole("radio", { name: "Filtrar por Minhas" }).click()
    await page
      .locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: TEXTO_DA_PESSOA })
      .click()
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_DA_PESSOA })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.getByRole("button", { name: "Opções da pergunta", exact: true }),
      "a tela esconde a denúncia do próprio conteúdo",
    ).toHaveCount(0)

    // ...e o servidor recusa de novo, com o token da própria sessão.
    const token = await tokenDaSessao(context)
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const recusa = await api.post(
      "/api/app/perguntas/80000000-0000-4000-8000-000000000f00/denuncia",
      {
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        data: { motivo: "spam", explicacao: "" },
      },
    )
    expect(recusa.status(), "denunciar o próprio conteúdo é recusado no servidor").toBe(403)
    expect(await recusa.json()).toEqual({ erro: "proprio-conteudo" })
    await api.dispose()
  })

  test("denunciar resposta de outra pessoa grava e a duplicata é recusada", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    async function denunciarResposta(): Promise<void> {
      await page.goto("/app/comunidade")
      await page
        .locator('[data-tela="comunidade"] [data-linha="pergunta"]', {
          hasText: TEXTO_DA_OUTRA_PESSOA,
        })
        .click()
      await expect(
        page.getByRole("heading", { level: 1, name: TEXTO_DA_OUTRA_PESSOA }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText("A Dona Célia faz faxina na minha casa há um ano.")).toBeVisible({
        timeout: 30_000,
      })
      await page.getByRole("button", { name: "Opções da resposta", exact: true }).click()
      await page.getByRole("button", { name: "Denunciar resposta" }).click()
      await page.getByRole("radio", { name: "Conteúdo inadequado" }).check()
      await page.getByRole("button", { name: "Enviar denúncia" }).click()
    }

    await denunciarResposta()
    await capturar(page, testInfo.project.name, "denuncia-de-resposta")
    await expect(
      page.locator('[data-tela="pergunta"] [role="status"], [role="alert"]').first(),
    ).toContainText(/Denúncia enviada|Você já denunciou esta resposta/, { timeout: 30_000 })

    await page.reload()
    await page.getByRole("button", { name: "Opções da resposta", exact: true }).click()
    await page.getByRole("button", { name: "Denunciar resposta" }).click()
    await page.getByRole("radio", { name: "Spam" }).check()
    await page.getByRole("button", { name: "Enviar denúncia" }).click()
    await expect(page.getByRole("alert")).toContainText("Você já denunciou esta resposta.", {
      timeout: 30_000,
    })
  })

  test("o autor edita a própria pergunta e a própria resposta, e a marca sobrevive ao recarregar", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(240_000)
    // RUN-185: o conteúdo é DESTE teste, criado pela sessão semeada. O seed que
    // os outros specs leem não é editado, e o que a tela mostra depois é o que
    // o banco gravou — inclusive a marca "editada", que vem de `edited_at`.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/comunidade")
    const projeto = testInfo.project.name
    const { api, cabecalhos } = await apiDaSessao(page, context)
    const titulo = `Encanador para o vazamento da pia (${projeto})`
    const resposta = `O Seu Raimundo resolveu o mesmo vazamento aqui (${projeto}).`
    const id = await criarPerguntaDoTeste(api, cabecalhos, titulo, resposta)

    await page.goto(`/app/pergunta/${id}`)
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible({
      timeout: 30_000,
    })

    const tituloNovo = `Encanador para o vazamento da pia, resolvido (${projeto})`
    await page.getByRole("button", { name: "Ações da minha pergunta", exact: true }).click()
    await page.getByRole("button", { name: "Editar pergunta", exact: true }).click()
    await page.getByLabel("Título da pergunta").fill(tituloNovo)
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(page.getByRole("heading", { level: 1, name: tituloNovo })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("Manaus · editada", { exact: true })).toBeVisible()

    await page.reload()
    await expect(
      page.getByRole("heading", { level: 1, name: tituloNovo }),
      "o título editado precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Manaus · editada", { exact: true })).toBeVisible()

    const respostaNova = `${resposta} Atende no mesmo dia.`
    const artigoDaResposta = page.locator('[data-tela="pergunta"] article', { hasText: resposta })
    await artigoDaResposta
      .getByRole("button", { name: "Ações da minha resposta", exact: true })
      .click()
    await page.getByRole("button", { name: "Editar resposta", exact: true }).click()
    await page.getByRole("dialog").getByLabel("Sua resposta").fill(respostaNova)
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(
      page.getByText(respostaNova),
      "a resposta editada aparece na conversa",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Membro da comunidade · editada", { exact: true })).toBeVisible()
    await capturar(page, projeto, "pergunta-e-resposta-editadas")

    await page.reload()
    await expect(
      page.getByText(respostaNova),
      "a resposta editada precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Membro da comunidade · editada", { exact: true })).toBeVisible()

    // O conteúdo do teste sai com ele: o seed segue como estava.
    await api.delete(`/api/app/perguntas/${id}`, { headers: cabecalhos })
    await api.dispose()
  })

  test("o autor exclui a própria resposta e ela some depois de recarregar", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(240_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/comunidade")
    const { api, cabecalhos } = await apiDaSessao(page, context)
    const resposta = `Resposta que sai da conversa (${testInfo.project.name}).`
    const id = await criarPerguntaDoTeste(
      api,
      cabecalhos,
      `Pintor para a sala (${testInfo.project.name})`,
      resposta,
    )

    await page.goto(`/app/pergunta/${id}`)
    const artigoDaResposta = page.locator('[data-tela="pergunta"] article', { hasText: resposta })
    await expect(artigoDaResposta).toBeVisible({ timeout: 30_000 })

    await artigoDaResposta
      .getByRole("button", { name: "Ações da minha resposta", exact: true })
      .click()
    await page.getByRole("button", { name: "Excluir resposta", exact: true }).click()
    await page.getByRole("button", { name: "Excluir resposta", exact: true }).click()
    await expect(artigoDaResposta, "a resposta excluída sai da conversa").toHaveCount(0, {
      timeout: 30_000,
    })
    await capturar(page, testInfo.project.name, "resposta-excluida")

    // O que continua lá depois do recarregamento é o banco, não o estado local.
    await page.reload()
    await expect(
      page.getByRole("heading", { name: "A comunidade ainda não respondeu" }),
      "a exclusão precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(resposta)).toHaveCount(0)

    await api.delete(`/api/app/perguntas/${id}`, { headers: cabecalhos })
    await api.dispose()
  })

  test("o autor exclui a própria pergunta: ela sai da lista e o GET responde 404", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(240_000)
    // RUN-185: a exclusão que o contrato pede, com a confirmação da tela. O
    // conteúdo é DESTE teste; o seed que os outros specs leem não é tocado.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/comunidade")
    const projeto = testInfo.project.name
    const { api, cabecalhos } = await apiDaSessao(page, context)
    const titulo = `Pergunta que sai da lista (${projeto})`
    const id = await criarPerguntaDoTeste(api, cabecalhos, titulo)

    // Antes de excluir, a pergunta é do servidor: ela está em Minhas.
    await page.getByRole("radio", { name: "Filtrar por Minhas" }).click()
    const linha = page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', {
      hasText: titulo,
    })
    await expect(linha).toBeVisible({ timeout: 30_000 })
    await linha.click()
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible({
      timeout: 30_000,
    })

    await page.getByRole("button", { name: "Ações da minha pergunta", exact: true }).click()
    await page.getByRole("button", { name: "Excluir pergunta", exact: true }).click()
    // A confirmação é um passo separado: o mesmo rótulo, no diálogo aberto.
    await page.getByRole("button", { name: "Excluir pergunta", exact: true }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Comunidade" }),
      "a pergunta excluída devolve a pessoa à Comunidade, não a uma tela morta",
    ).toBeVisible({ timeout: 30_000 })
    await capturar(page, projeto, "pergunta-excluida")

    // O que continua fora da lista depois do recarregamento é o banco.
    await page.reload()
    await page.getByRole("radio", { name: "Filtrar por Minhas" }).click()
    await expect(
      page.locator('[data-tela="comunidade"] [data-linha="pergunta"]', { hasText: titulo }),
      "a pergunta excluída não volta para a lista",
    ).toHaveCount(0, { timeout: 30_000 })

    const detalhe = await api.get(`/api/app/perguntas/${id}`, { headers: cabecalhos })
    expect(detalhe.status(), "a pergunta excluída não existe mais para a API").toBe(404)
    await api.dispose()
  })

  test("o autor marca a pergunta como resolvida sem resposta e o estado sobrevive ao recarregar", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(240_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/comunidade")
    const { api, cabecalhos } = await apiDaSessao(page, context)
    const id = await criarPerguntaDoTeste(
      api,
      cabecalhos,
      `Mudança de armário para o mês que vem (${testInfo.project.name})`,
    )

    await page.goto(`/app/pergunta/${id}`)
    await expect(page.getByText("Sem resposta", { exact: true })).toBeVisible({ timeout: 30_000 })

    await page.getByRole("button", { name: "Ações da minha pergunta", exact: true }).click()
    await page.getByRole("button", { name: "Marcar como resolvida", exact: true }).click()
    await expect(
      page.getByRole("button", { name: "Reabrir pergunta", exact: true }),
      "resolvida sem resposta: o caminho de volta aparece",
    ).toBeVisible({ timeout: 30_000 })

    await page.reload()
    await expect(
      page.getByRole("button", { name: "Reabrir pergunta", exact: true }),
      "a resolução sem resposta precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Sem resposta", { exact: true })).toHaveCount(0)

    await api.delete(`/api/app/perguntas/${id}`, { headers: cabecalhos })
    await api.dispose()
  })

  test("quem não escreveu não vê as ações da autoria e a escrita direta na API é 404", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    // A pergunta e a resposta semeadas são de OUTRAS pessoas: editá-las pela tela
    // não é oferecido, e o servidor responde o mesmo 404 de linha inexistente —
    // nem a escrita direta confirma que o conteúdo existe.
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto(`/app/pergunta/${ID_DA_OUTRA_PESSOA}`)
    await expect(page.getByRole("heading", { level: 1, name: TEXTO_DA_OUTRA_PESSOA })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(TEXTO_DA_RESPOSTA_ALHEIA)).toBeVisible({ timeout: 30_000 })

    await expect(
      page.getByRole("button", { name: "Ações da minha pergunta", exact: true }),
      "a pergunta é de outra pessoa",
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Ações da minha resposta", exact: true }),
      "a resposta é de outra pessoa",
    ).toHaveCount(0)

    await page.getByRole("button", { name: "Opções da pergunta", exact: true }).click()
    await expect(page.getByRole("button", { name: "Editar pergunta", exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Excluir pergunta", exact: true })).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Marcar como resolvida", exact: true }),
    ).toHaveCount(0)
    await page.keyboard.press("Escape")

    const { api, cabecalhos } = await apiDaSessao(page, context)
    const editar = await api.patch(`/api/app/perguntas/${ID_DA_OUTRA_PESSOA}`, {
      headers: cabecalhos,
      data: { titulo: "Título de quem não escreveu a pergunta", assunto: "" },
    })
    expect(editar.status(), "editar a pergunta alheia é o 404 da linha inexistente").toBe(404)
    const excluir = await api.delete(`/api/app/perguntas/${ID_DA_OUTRA_PESSOA}`, {
      headers: cabecalhos,
    })
    expect(excluir.status(), "excluir a pergunta alheia é o 404 da linha inexistente").toBe(404)

    const caminhoDaResposta = `/api/app/perguntas/${ID_DA_OUTRA_PESSOA}/respostas/${RESPOSTA_DA_OUTRA_PESSOA}`
    const editarResposta = await api.patch(caminhoDaResposta, {
      headers: cabecalhos,
      data: { texto: "Texto de quem não escreveu a resposta." },
    })
    expect(editarResposta.status(), "editar a resposta alheia é 404").toBe(404)
    const excluirResposta = await api.delete(caminhoDaResposta, { headers: cabecalhos })
    expect(excluirResposta.status(), "excluir a resposta alheia é 404").toBe(404)
    await api.dispose()

    // A recusa não apagou nem mudou nada: a resposta alheia continua na conversa.
    await page.reload()
    await expect(page.getByText(TEXTO_DA_RESPOSTA_ALHEIA)).toBeVisible({ timeout: 30_000 })
  })
})
