import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { type BrowserContext, expect, type Page, test } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

// F05 — a agenda e o encontro do app lendo e gravando no banco de verdade
// (RUN-007 / ADR-20261105). O que este arquivo prova é a jornada inteira:
// entrada, ação, gravação, retorno, acompanhamento e a falha principal.
//
// Contra o Next que serve `/app` (baseURL 127.0.0.1:3000) e o Supabase local com
// seed. Pré-requisitos, iguais aos da F01:
//   * `supabase db reset --local` (o seed, com os 10 eventos de Manaus);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `apps/web/.env.local` com as chaves.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f05-eventos-real.spec.ts
//
// @stateful: cria evento e grava presença e pergunta com as personas do seed,
// então roda no lote serial (`--workers=1`). As três larguras rodam em série no
// mesmo usuário; por isso o evento de cada projeto leva o nome do projeto.

const DIRETORIO_DAS_CAPTURAS = join(process.cwd(), ".visual", "f05-eventos")

/** Persona semeada de outra cidade (Rio): não pode ver a agenda de Manaus. */
const MEMBRO_DE_OUTRA_CIDADE = "membro-rio@bivaque.example.invalid"

/** Evento semeado cujo organizador NÃO é a persona do teste. */
const EVENTO_DE_OUTRO_ORGANIZADOR = "70000000-0000-4000-8000-0000000000a1"

/** Título semeado de um encontro futuro de Manaus (seed: i = 5). */
const ENCONTRO_FUTURO_SEMEADO = "Piquenique das famílias"

/** Título semeado de um encontro passado (status `completed`): não aparece. */
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

    const agenda = page.locator('[data-tela="agenda"]')
    const linhaDoFuturo = agenda.locator('[data-linha="lista"]', {
      hasText: ENCONTRO_FUTURO_SEMEADO,
    })
    await expect(linhaDoFuturo).toBeVisible({ timeout: 30_000 })
    await expect(
      agenda.locator('[data-linha="lista"]', { hasText: ENCONTRO_PASSADO_SEMEADO }),
      "encontro passado não entra na agenda",
    ).toHaveCount(0)
    await capturar(page, projeto, "agenda")

    // Cor computada no escuro: o tema do sistema chega até a tela.
    await page.emulateMedia({ colorScheme: "dark" })
    const noEscuro = await corDoTitulo(page)
    expect(noEscuro, "no escuro o título é claro").toHaveLength(3)
    for (const canal of noEscuro) expect(canal).toBeGreaterThan(128)
    await page.emulateMedia({ colorScheme: "light" })
    const noClaro = await corDoTitulo(page)
    for (const canal of noClaro) expect(canal).toBeLessThan(128)

    await linhaDoFuturo.click()
    await expect(
      page.getByRole("heading", { level: 1, name: ENCONTRO_FUTURO_SEMEADO }),
    ).toBeVisible({ timeout: 30_000 })

    // Presença: o que a tela mostra depois é o que ficou gravado.
    const vou = page.getByRole("button", { name: "Vou", exact: true })
    await vou.click()
    const confirmada = page.getByRole("button", { name: "Presença confirmada" })
    await expect(confirmada).toHaveAttribute("aria-pressed", "true")
    await page.reload()
    await expect(
      page.getByRole("button", { name: "Presença confirmada" }),
      "a presença precisa sobreviver ao recarregamento",
    ).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 })

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

    // Pergunta: vai para a conversa do evento, e a tela diz que enviou.
    await page.getByLabel("Sua pergunta").fill("Vai ter estacionamento no local?")
    await page.getByRole("button", { name: "Enviar pergunta" }).click()
    await expect(page.getByText("Sua pergunta foi enviada.")).toBeVisible({ timeout: 30_000 })
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

    // O que ficou gravado é o que volta do banco.
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

  test("membro de outra cidade não vê a agenda de Manaus", async ({ page, context }) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_DE_OUTRA_CIDADE)

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
    await expect(page.getByText("Nenhum encontro agendado")).toBeVisible({ timeout: 30_000 })
  })
})
