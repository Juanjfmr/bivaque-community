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
const TRANSPORTADORA_ID = "a0000000-0000-4000-8000-000000000003"

/** Persona semeada de outra cidade (Rio): não enxerga o guia de Manaus. */
const MEMBRO_DE_OUTRA_CIDADE = "membro-rio@bivaque.example.invalid"

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
  const verbete = page.locator('[data-tela="verbete"]')
  await expect(verbete).toBeVisible({ timeout: 30_000 })
  await expect(verbete).toContainText(nome)
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
      page.getByRole("heading", { level: 1, name: "Guia", exact: true }),
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
    // O verbete é tela própria: o id está no endereço e o Voltar do sistema
    // devolve a lista, em vez de fechar uma folha de estado local.
    await expect(page).toHaveURL(/\/app\/guia\/a0000000-0000-4000-8000-000000000001$/)
    await expect(page.getByText(/turno integral/i)).toBeVisible()
    await capturar(page, testInfo.project.name, "verbete")
    await page.locator('[data-acao="voltar"]').click()
    await expect(page).toHaveURL(/\/app\/guia$/)
    await expect(lista.locator('[data-linha="lista"]', { hasText: ESCOLA_SEMEADA })).toBeVisible({
      timeout: 30_000,
    })
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

    // Gravação que sobrevive: o endereço do verbete sobrevive à recarga e o
    // marcador é lido de volta do banco.
    await page.reload()
    await expect(
      page.locator('[data-tela="verbete"]'),
      "o verbete precisa continuar aberto depois da recarga",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/\/app\/guia\/a0000000-0000-4000-8000-000000000002$/)
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

    // Voltar de uma entrada recarregada (sem pai no histórico, link direto) cai
    // no pai declarado do catálogo: a lista do Guia. Era a ressalva do F08.
    await page.locator('[data-acao="voltar"]').click()
    await expect(page).toHaveURL(/\/app\/guia$/)
    await expect(page.locator('[data-tela="guia"]')).toBeVisible({ timeout: 30_000 })

    // A tela Salvos lê o guia salvo pela sessão, não só os anúncios da demo.
    await page.goto("/app/salvos")
    await expect(
      page.locator('[data-salvos="guia"]').getByText(HOSPITAL_SEMEADO),
      "a referência salva precisa aparecer em Salvos",
    ).toBeVisible({ timeout: 30_000 })

    // Devolve a persona ao estado inicial.
    await page.goto("/app/guia")
    await abrirVerbete(page, HOSPITAL_SEMEADO)
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

  test("sugestão no verbete com ficha publicada grava, lista e sobrevive à recarga", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/guia")
    await abrirVerbete(page, TRANSPORTADORA_SEMEADA)
    await expect(
      page.getByRole("heading", { name: "Minhas sugestões" }),
      "o acompanhamento do que a pessoa enviou existe no verbete",
    ).toBeVisible({ timeout: 30_000 })

    const descricao = "O telefone do balcão mudou."
    await page.getByLabel("O que precisa mudar?").fill(descricao)
    await page.getByRole("button", { name: "Enviar sugestão" }).click()
    await expect(
      page.getByText("Sugestão enviada. Ela entra na fila da curadoria."),
      "o envio precisa terminar com a confirmação, não com o formulário limpo em silêncio",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel("O que precisa mudar?")).toHaveValue("")

    // O acompanhamento recarrega depois do 201: o que a lista mostra é o que o
    // banco gravou, com o estado que a curadoria deu a ela. A persona é a mesma
    // entre execuções, então a linha nova pode ter irmãs de execuções antigas.
    const minhas = page.locator('[data-correcoes="minhas"]')
    const minhaSugestao = minhas.locator('[data-correcao="minha"]', { hasText: descricao }).first()
    await expect(minhaSugestao).toBeVisible({ timeout: 30_000 })
    await expect(minhaSugestao.getByText("Recebida")).toBeVisible()

    await page.reload()
    await expect(
      page
        .locator('[data-correcoes="minhas"] [data-correcao="minha"]', { hasText: descricao })
        .first(),
      "o acompanhamento precisa sobreviver à recarga",
    ).toBeVisible({ timeout: 30_000 })

    // O 201 por trás da confirmação, sem passar pela interface.
    const token = await tokenDaSessao(context)
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const resposta = await api.post(`/api/app/guia/${TRANSPORTADORA_ID}/sugestao`, {
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      data: { descricao: "O horário de atendimento mudou." },
    })
    expect(resposta.status(), "sugerir com artigo publicado grava a sugestão").toBe(201)
    await api.dispose()
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
    await expect(page.locator('[data-tela="guia"] h1')).toContainText("Guia", {
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
    // Ler o guia é nacional (policy com `has_current_locality`); escrever é da
    // cidade. A recusa é da RLS, e a mensagem do Postgres não volta.
    expect(marcar.status(), "salvar referência de outra cidade é recusado").toBe(403)
    expect(JSON.stringify(await marcar.json())).not.toMatch(/row-level security/)
    const sugestao = await api.post(`/api/app/guia/${HOSPITAL_ID}/sugestao`, {
      headers: cabecalhos,
      data: { descricao: "Mudou o telefone." },
    })
    // O seed local não tem artigo publicado: a sugestão não tem onde pousar.
    expect(sugestao.status()).toBe(400)
    expect(await sugestao.json()).toMatchObject({ erro: "sem-artigo" })

    const semSessao = await api.get("/api/app/guia")
    expect(semSessao.status(), "a rota exige sessão").toBe(401)
    await api.dispose()
  })
})
