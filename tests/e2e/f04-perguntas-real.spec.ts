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
})
