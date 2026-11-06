import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import { semearSessaoDeMembro } from "./entrada-real-ajuda"

// O seed dá um aviso de pedido encerrado a esta persona (dona da vila).
const MEMBRO_COM_AVISO = "dono-vila@bivaque.example.invalid"
const AVISO = "50000000-0000-4000-8000-0000000000ca"
const PEDIDO = "40000000-0000-4000-8000-0000000000c9"
const CAPTURAS = join(process.cwd(), ".visual", "run-022")

async function capturar(page: Page, projeto: string, tela: string) {
  mkdirSync(CAPTURAS, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: join(CAPTURAS, `${projeto}-${tela}-${tema}.png`),
      fullPage: true,
      animations: "disabled",
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
}

/**
 * F09 (RUN-022) — avisos e preferências contra o banco.
 *
 * O aviso é o do seed (pedido encerrado): a persona é a destinatária e o
 * destino no app é o acompanhamento do pedido. O ciclo provado é ver → tocar
 * (marca lido) → recarregar → continuar lido, e a preferência gravando de
 * verdade. `read_at` não volta a nulo por rota (lido é monotônico), então o
 * teste não depende de o aviso estar não lido em todas as larguras; a
 * preferência é devolvida ao estado inicial ao terminar.
 */
test.describe("F09 — avisos reais", { tag: "@stateful" }, () => {
  test("aviso semeado abre o pedido, marca como lido e continua lido", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_COM_AVISO)

    await page.goto("/app/avisos")
    const linha = page.locator(`[data-aviso-item="${AVISO}"]`)
    await expect(linha).toBeVisible({ timeout: 30_000 })
    await expect(linha).toContainText("O pedido em que você estava foi encerrado")
    await capturar(page, testInfo.project.name, "avisos")

    await linha.click()
    await expect(page).toHaveURL(new RegExp(`/app/pedido/${PEDIDO}$`), { timeout: 30_000 })

    await page.goBack()
    await expect(page.locator(`[data-aviso-item="${AVISO}"]`)).toHaveAttribute(
      "data-nao-lida",
      "nao",
      { timeout: 30_000 },
    )
    await page.reload()
    await expect(page.locator(`[data-aviso-item="${AVISO}"]`)).toHaveAttribute(
      "data-nao-lida",
      "nao",
      { timeout: 30_000 },
    )

    // Já lido: marcar de novo é idempotente e não alcança linha nenhuma.
    const repetido = await page.request.post("/api/app/avisos/lidos", {
      headers: { origin: new URL(page.url()).origin, "x-bivaque-app": "bivaque-spa" },
      data: { id: AVISO },
    })
    expect(repetido.status()).toBe(200)
    expect(await repetido.json()).toEqual({ atualizados: 0 })
  })

  test("preferência por canal grava, persiste e volta ao estado inicial", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_COM_AVISO)

    await page.goto("/app/voce")
    const respostas = page.getByRole("checkbox", { name: "Avisos de respostas" })
    await expect(respostas).toBeVisible({ timeout: 30_000 })
    const antes = (await respostas.getAttribute("aria-checked")) === "true"
    await capturar(page, testInfo.project.name, "voce-preferencias")

    await respostas.click()
    await page.getByRole("button", { name: "Salvar preferências" }).click()
    await expect(page.getByRole("status")).toContainText("Preferências de aviso salvas.", {
      timeout: 30_000,
    })

    await page.reload()
    await expect(page.getByRole("checkbox", { name: "Avisos de respostas" })).toHaveAttribute(
      "aria-checked",
      antes ? "false" : "true",
      { timeout: 30_000 },
    )

    // Devolve o estado ao terminar.
    await page.getByRole("checkbox", { name: "Avisos de respostas" }).click()
    await page.getByRole("button", { name: "Salvar preferências" }).click()
    await expect(page.getByRole("status")).toContainText("Preferências de aviso salvas.", {
      timeout: 30_000,
    })
  })

  test("sem sessão é 401; corpo inválido e escrita sem o cabeçalho do app são recusados", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000)

    expect((await request.get("/api/app/avisos")).status()).toBe(401)
    expect((await request.get("/api/app/avisos/preferencias")).status()).toBe(401)

    await semearSessaoDeMembro(page.context(), MEMBRO_COM_AVISO)
    const origem = "http://127.0.0.1:3000"

    const invalido = await page.request.post("/api/app/avisos/lidos", {
      headers: { origin: origem, "x-bivaque-app": "bivaque-spa" },
      data: {},
    })
    expect(invalido.status()).toBe(400)

    const semCabecalho = await page.request.post("/api/app/avisos/lidos", {
      headers: { origin: origem },
      data: { todos: true },
    })
    expect(semCabecalho.status()).toBe(403)
  })
})
