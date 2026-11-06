import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

// F10 — a área "Você" lendo e gravando no banco de verdade (RUN-016 /
// ADR-20261105). Contra o Next que serve `/app` e o Supabase local com seed.
// Pré-requisitos:
//   * banco local migrado e semeado (`supabase/seed.sql`);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f10-voce-real.spec.ts
//
// @stateful: grava o perfil da persona do seed e desfaz no fim; por isso roda
// no lote serial (`--workers=1`), uma largura por vez.

const CAPTURAS = join(process.cwd(), ".visual", "run-016")
const NOME_SEMEADO = "Ana Verificada"
const NOME_EDITADO = "Ana E2E"
const PESSOA_BLOQUEADA = "30000000-0000-4000-8000-00000000001a"
const BLOQUEIO_INEXISTENTE = "30000000-0000-4000-8000-0000000000ff"

async function capturar(page: Page, projeto: string, etapa: string): Promise<void> {
  mkdirSync(CAPTURAS, { recursive: true })
  await page.screenshot({
    path: join(CAPTURAS, `${projeto}-${etapa}.png`),
    fullPage: true,
  })
}

test.describe("F10 — Você real no app", { tag: "@stateful" }, () => {
  test("o perfil vem da conta, a edição sobrevive ao recarregar e as listas são as do banco", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.goto("/app/voce")
    await expect(
      page.getByRole("heading", { level: 1, name: "Você" }),
      "a tela real não está em /app/voce: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    // A fonte do dado é a conta: o nome e a cidade do banco, não a demonstração.
    await expect(page.getByText("Ana Verificada")).toBeVisible()
    await expect(page.getByText("perfil de demonstração")).toHaveCount(0)
    await expect(page.locator('[data-tela="voce"]')).toContainText("Manaus")

    // Edição: o formulário abre com o que está gravado.
    const bioGravada = "Apresentação anterior do teste."
    const editar = page.getByRole("button", { name: "Editar" })
    await editar.click()
    await expect(page.getByLabel("Nome")).toHaveValue(NOME_SEMEADO)
    await page.getByLabel("Nome").fill(NOME_EDITADO)
    await page.getByLabel("Apresentação").fill(bioGravada)
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText(NOME_EDITADO)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(bioGravada)).toBeVisible()
    await capturar(page, testInfo.project.name, "voce-editada")

    // Gravação que sobrevive ao recarregamento.
    await page.reload()
    await expect(
      page.getByText(bioGravada),
      "a apresentação precisa sobreviver ao recarregamento",
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(NOME_EDITADO), "o nome precisa sobreviver").toBeVisible()

    // Publicações e perguntas da conta.
    await page.goto("/app/minhas")
    await expect(page.getByRole("heading", { level: 1, name: "Minhas indicações" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.getByText("Alguém conhece um bom encanador?"),
      "a pergunta semeada da persona precisa aparecer",
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByText("Chegamos em Manaus no mês passado", { exact: false }),
      "a publicação semeada da persona precisa aparecer",
    ).toBeVisible()
    await capturar(page, testInfo.project.name, "minhas")

    // Bloqueados: a lista real, com o nome que a RLS deixa ler.
    await page.goto("/app/bloqueados")
    await expect(page.getByRole("heading", { level: 1, name: "Pessoas bloqueadas" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      page.locator('[data-tela="bloqueados"] [data-linha="lista"]'),
      "o bloqueio semeado precisa aparecer",
    ).toHaveCount(1)
    await expect(page.getByText("Desbloquear")).toBeVisible()
    await capturar(page, testInfo.project.name, "bloqueados")

    // Desfaz o que o teste gravou, para a próxima largura começar do seed.
    await page.goto("/app/voce")
    await expect(page.getByText(bioGravada)).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: "Editar" }).click()
    await page.getByLabel("Nome").fill(NOME_SEMEADO)
    await page.getByLabel("Apresentação").fill("")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText(bioGravada)).toHaveCount(0, { timeout: 30_000 })
    await expect(page.getByText(NOME_SEMEADO)).toBeVisible()
  })

  test("servidor fora mostra erro com Tentar de novo, nunca lista vazia", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.route("**/api/app/voce", (rota) => rota.abort())
    await page.goto("/app/voce")
    const erro = page.locator('[data-estado="erro"]')
    await expect(erro).toBeVisible({ timeout: 30_000 })
    await expect(erro).toContainText("Não foi possível carregar")
    await expect(
      page.getByText("Ninguém bloqueado"),
      "banco fora não pode virar perfil vazio",
    ).toHaveCount(0)

    await page.unroute("**/api/app/voce")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.getByText("Ana Verificada")).toBeVisible({ timeout: 30_000 })
  })

  test("escrita fora da porta do app e alvo fora do alcance são recusados", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/voce")
    await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible({
      timeout: 30_000,
    })

    // Sem o cabeçalho do app, a escrita por cookie é recusada como CSRF.
    const semCabecalho = await page.request.delete(`/api/app/voce/bloqueados/${PESSOA_BLOQUEADA}`, {
      headers: { origin: new URL(page.url()).origin },
    })
    expect(semCabecalho.status(), "escrita sem x-bivaque-app").toBe(403)

    // Com a porta correta, o id que não está na própria lista é 404 — nunca 403,
    // que confirmaria o bloqueio alheio.
    const foraDoAlcance = await page.request.delete(
      `/api/app/voce/bloqueados/${BLOQUEIO_INEXISTENTE}`,
      { headers: { origin: new URL(page.url()).origin, "x-bivaque-app": "bivaque-spa" } },
    )
    expect(foraDoAlcance.status(), "id fora do alcance").toBe(404)

    // O bloqueio real continua na lista: a recusa não apagou nada.
    await page.goto("/app/bloqueados")
    await expect(
      page.locator('[data-tela="bloqueados"] [data-linha="lista"]'),
      "a recusa não pode mexer no estado",
    ).toHaveCount(1)
  })

  test("a família vem do banco: o convite entra na lista e a revogação some", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/app/voce")
    await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible({
      timeout: 30_000,
    })

    const familia = page.locator('[data-secao="sim"]', { hasText: "Família" })
    const linhas = familia.locator('[data-linha="lista"]')
    await expect(familia.getByText(/Convites pendentes \(\d+ de 5\)/)).toBeVisible({
      timeout: 30_000,
    })
    const antes = await linhas.count()

    // Envio real: o módulo de servidor da tela antiga cria o convite e o outbox.
    await familia.getByLabel("E-mail do familiar").fill("familia.e2e@example.invalid")
    await familia.getByRole("button", { name: "Enviar convite" }).click()
    await expect(familia.getByRole("status")).toContainText("Convite enviado para", {
      timeout: 30_000,
    })
    await expect(linhas).toHaveCount(antes + 1)
    await capturar(page, testInfo.project.name, "voce-familia")

    // Gravação que sobrevive ao recarregar: a lista volta do banco.
    await page.reload()
    await expect(linhas).toHaveCount(antes + 1, { timeout: 30_000 })

    // Revoga o que este teste criou e devolve o seed (roda em três larguras).
    await familia
      .getByRole("button", { name: /Revogar/ })
      .last()
      .click()
    await expect(familia.getByRole("status")).toContainText("Convite revogado", {
      timeout: 30_000,
    })
    await expect(linhas).toHaveCount(antes)
  })
})
