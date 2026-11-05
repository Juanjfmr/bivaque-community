import { mkdirSync } from "node:fs"
import { join } from "node:path"
import {
  request as apiRequest,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test"
import {
  chaveAnonimaDoSupabase,
  MEMBRO_SEMEADO,
  semearSessaoDeMembro,
  urlDoSupabase,
} from "./entrada-real-ajuda"

// F08 — o Guia do app lendo e gravando no banco de verdade (RUN-009 /
// ADR-20261105). Prova o caminho principal (lista, busca, categoria, verbete),
// a gravação que sobrevive ao recarregar, a negação de acesso e a falha
// principal.
//
// Contra o Next que serve `/app` e o Supabase local com seed. Pré-requisitos:
//   * banco local migrado e semeado (supabase/seed.sql);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f08-guia-real.spec.ts
//
// @stateful: grava e desgrava o marcador com a persona do seed, então roda no
// lote serial (`--workers=1`). As três larguras usam a mesma persona; o teste
// deixa o marcador desmarcado ao final.

const DIRETORIO_DAS_CAPTURAS = join(process.cwd(), ".visual", "run-009")

const ESCOLA_SEMEADA = "Escola Modelo do Centro"
const HOSPITAL_SEMEADO = "Hospital de Referência da Cidade"
const TRANSPORTADORA_SEMEADA = "Transportadora Ajuricaba"
const HOSPITAL_ID = "a0000000-0000-4000-8000-000000000002"

/** Persona semeada de outra cidade (Rio): não enxerga o guia de Manaus. */
const MEMBRO_DE_OUTRA_CIDADE = "membro-rio@bivaque.example.invalid"

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

/** O token da sessão semeada, para falar com a rota sem passar pela interface. */
async function tokenDaSessao(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((item) => /^sb-.*-auth-token$/.test(item.name))
  if (cookie === undefined) throw new Error("a sessão semeada não está nos cookies")
  const sessao = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { access_token?: string }
  if (typeof sessao.access_token !== "string") throw new Error("cookie de sessão sem token")
  return sessao.access_token
}

async function abrirVerbete(page: Page, nome: string): Promise<void> {
  await page.locator('[data-tela="guia"] [data-linha="lista"]', { hasText: nome }).click()
  const folha = page.getByRole("dialog")
  await expect(folha).toBeVisible({ timeout: 30_000 })
  await expect(folha).toContainText(nome)
}

test.describe("F08 — guia real no app", { tag: "@stateful" }, () => {
  test("a cidade vê o guia real, busca, filtra e lê o verbete", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/guia")
    await expect(
      page.getByRole("heading", { level: 1, name: `Guia de Manaus` }),
      "o guia real não está servido em /app/guia: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    const lista = page.locator('[data-tela="guia"]')
    await expect(lista.locator('[data-linha="lista"]', { hasText: ESCOLA_SEMEADA })).toBeVisible({
      timeout: 30_000,
    })
    await expect(lista.locator('[data-linha="lista"]', { hasText: HOSPITAL_SEMEADO })).toBeVisible()
    // Pendente na curadoria não aparece para membro.
    await expect(lista.getByText("Escola de Acolhimento Militar")).toHaveCount(0)

    // Busca: o filtro é do servidor, mas o resultado é o que a pessoa vê.
    await page.getByLabel("Buscar no guia").fill("hospital")
    await expect(lista.locator('[data-linha="lista"]', { hasText: HOSPITAL_SEMEADO })).toBeVisible({
      timeout: 30_000,
    })
    await expect(lista.locator('[data-linha="lista"]', { hasText: ESCOLA_SEMEADA })).toHaveCount(0)

    await page.getByLabel("Buscar no guia").fill("")
    await page.getByRole("radio", { name: "Filtrar por Transportadora" }).click()
    await expect(
      lista.locator('[data-linha="lista"]', { hasText: TRANSPORTADORA_SEMEADA }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(lista.locator('[data-linha="lista"]', { hasText: HOSPITAL_SEMEADO })).toHaveCount(
      0,
    )

    await page.getByRole("radio", { name: "Filtrar por Todas" }).click()
    await expect(lista.locator('[data-linha="lista"]', { hasText: ESCOLA_SEMEADA })).toBeVisible({
      timeout: 30_000,
    })
    await capturar(page, testInfo.project.name, "guia")

    await abrirVerbete(page, ESCOLA_SEMEADA)
    await expect(page.getByRole("dialog")).toContainText("Turno integral")
    await capturar(page, testInfo.project.name, "verbete")
    await page.getByRole("button", { name: "Fechar" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("o marcador grava e sobrevive ao recarregamento", async ({ page, context }) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/guia")
    await expect(
      page.locator('[data-tela="guia"] [data-linha="lista"]', { hasText: HOSPITAL_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })

    // As três larguras usam a mesma persona: o teste parte de "não salvo".
    await abrirVerbete(page, HOSPITAL_SEMEADO)
    const salvo = page.getByRole("button", { name: "Salvo no seu guia" })
    if ((await salvo.count()) > 0) {
      await salvo.click()
      await expect(page.getByRole("button", { name: "Salvar no seu guia" })).toBeVisible({
        timeout: 30_000,
      })
    }

    await page.getByRole("button", { name: "Salvar no seu guia" }).click()
    await expect(page.getByRole("button", { name: "Salvo no seu guia" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("Guardado em Salvos.")).toBeVisible()

    // Gravação que sobrevive: lida de volta do banco depois da recarga.
    await page.reload()
    await abrirVerbete(page, HOSPITAL_SEMEADO)
    await expect(
      page.getByRole("button", { name: "Salvo no seu guia" }),
      "o marcador precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })

    const lidas = await page.request.get(
      `${urlDoSupabase()}/rest/v1/guide_entry_saves?select=entry_id&entry_id=eq.${HOSPITAL_ID}`,
      {
        headers: {
          apikey: chaveAnonimaDoSupabase(),
          authorization: `Bearer ${await tokenDaSessao(context)}`,
        },
      },
    )
    expect(lidas.status(), "o salvamento precisa ser legível pela própria pessoa").toBe(200)
    expect((await lidas.json()) as { entry_id: string }[]).toHaveLength(1)

    // Devolve a persona ao estado inicial.
    await page.getByRole("button", { name: "Salvo no seu guia" }).click()
    await expect(page.getByRole("button", { name: "Salvar no seu guia" })).toBeVisible({
      timeout: 30_000,
    })
  })

  test("sugestão sem artigo publicado é declarada, não oferecida", async ({ page, context }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/guia")
    await abrirVerbete(page, ESCOLA_SEMEADA)
    // O seed local não tem artigo publicado: a tela diz isso em vez de mostrar
    // um formulário que o servidor recusaria.
    await expect(
      page.getByText("Esta referência ainda não tem ficha publicada para atualizar."),
    ).toBeVisible()
    await expect(page.getByLabel("O que precisa mudar?")).toHaveCount(0)
  })

  test("servidor fora mostra erro com Tentar de novo, nunca diretório vazio", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.route("**/api/app/guia", (rota) => rota.abort())
    await page.goto("/app/guia")
    const erro = page.locator('[data-estado="erro"]')
    await expect(erro).toBeVisible({ timeout: 30_000 })
    await expect(erro).toContainText("Não foi possível carregar")
    await expect(
      page.getByText("O guia ainda está sendo montado"),
      "banco fora não pode virar guia vazio",
    ).toHaveCount(0)

    await page.unroute("**/api/app/guia")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(
      page.locator('[data-tela="guia"] [data-linha="lista"]', { hasText: ESCOLA_SEMEADA }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("membro de outra cidade não vê nem salva o guia de Manaus", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_DE_OUTRA_CIDADE)

    await page.goto("/app/guia")
    await expect(page.locator('[data-tela="guia"] h1')).toContainText("Guia de", {
      timeout: 30_000,
    })
    await expect(
      page.locator('[data-tela="guia"] [data-linha="lista"]', { hasText: ESCOLA_SEMEADA }),
      "o corte por cidade é da sessão, não do cliente",
    ).toHaveCount(0)
    await expect(page.getByText("O guia ainda está sendo montado")).toBeVisible({ timeout: 30_000 })
    await capturar(page, testInfo.project.name, "guia-outra-cidade")

    // Negação no servidor, sem passar pela interface e sem cookie.
    const token = await tokenDaSessao(context)
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const cabecalhos = { authorization: `Bearer ${token}`, "content-type": "application/json" }
    const marcar = await api.put(`/api/app/guia/${HOSPITAL_ID}/salvo`, { headers: cabecalhos })
    expect(marcar.status(), "salvar referência de outra cidade é recusado").toBe(404)
    const sugestao = await api.post(`/api/app/guia/${HOSPITAL_ID}/sugestao`, {
      headers: cabecalhos,
      data: { descricao: "Mudou o telefone." },
    })
    expect(sugestao.status(), "sugerir sobre referência de outra cidade é recusado").toBe(404)

    const semSessao = await api.get("/api/app/guia")
    expect(semSessao.status(), "a rota exige sessão").toBe(401)
    await api.dispose()
  })
})
