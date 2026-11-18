import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { type APIRequestContext, expect, type Page, request, test } from "@playwright/test"
import { idDoUsuarioPorEmail, semearSessaoDeMembro, urlDoSupabase } from "./entrada-real-ajuda"
import { readEnvLocal } from "./helpers/session"

// O seed dá um aviso de pedido encerrado a esta persona (dona da vila).
const MEMBRO_COM_AVISO = "dono-vila@bivaque.example.invalid"
const AVISO = "50000000-0000-4000-8000-0000000000ca"
const PEDIDO = "40000000-0000-4000-8000-0000000000c9"
// Conversa da dona da vila com outra pessoa: o alvo do aviso de mensagem.
const CONVERSA = "41000000-0000-4000-8000-0000000000c1"
const CAPTURAS = join(process.cwd(), ".visual", "run-022")

/**
 * A chave de fixture do banco LOCAL, como os outros specs que criam a própria
 * fixture (F04). O valor nunca é impresso; só a ausência dele vira mensagem.
 */
async function servicoLocal(): Promise<APIRequestContext> {
  const url = new URL(urlDoSupabase())
  if (!new Set(["127.0.0.1", "localhost"]).has(url.hostname))
    throw new Error("F09 só usa banco local")
  const chave =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY")
  if (!chave) throw new Error("Credencial de fixture local ausente")
  return request.newContext({
    baseURL: url.origin,
    extraHTTPHeaders: { apikey: chave, authorization: `Bearer ${chave}` },
  })
}

async function capturar(page: Page, projeto: string, tela: string) {
  mkdirSync(CAPTURAS, { recursive: true })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: join(CAPTURAS, `${projeto}-${tela}-claro.png`),
    fullPage: true,
    animations: "disabled",
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
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
  /**
   * F09-A — o destino do aviso de mensagem direta, provado em runtime. O
   * mapeamento `direct_message → messages` e o destino `/app/conversa/{id}` já
   * são unit-provados; aqui a linha existe no banco com o tipo real e o toque
   * leva à conversa certa. A fixture é criada e apagada pelo próprio teste
   * (service role local), porque o seed não tem conversa de pergunta de evento.
   */
  test("aviso de mensagem direta abre a conversa do alvo", async ({ page, context }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_COM_AVISO)

    const servico = await servicoLocal()
    const destinatario = await idDoUsuarioPorEmail(MEMBRO_COM_AVISO)
    expect(destinatario, "a persona do seed precisa existir no Auth local").not.toBeNull()
    let aviso: string | null = null
    try {
      const criado = await servico.post("/rest/v1/notifications", {
        headers: { prefer: "return=representation" },
        data: {
          recipient_user_id: destinatario,
          type: "direct_message",
          action: "question",
          target_type: "conversation",
          target_id: CONVERSA,
        },
      })
      const corpo = await criado.text()
      expect(criado.ok(), `notificação de fixture: ${criado.status()} ${corpo}`).toBe(true)
      const [linha] = JSON.parse(corpo) as { id: string }[]
      aviso = linha?.id ?? null
      expect(aviso, "o PostgREST precisa devolver a linha criada").not.toBeNull()

      await page.goto("/app/avisos")
      const item = page.locator(`[data-aviso-item="${aviso}"]`)
      await expect(item).toBeVisible({ timeout: 30_000 })
      await expect(item).toContainText("mensagem direta")
      await capturar(page, testInfo.project.name, "avisos-mensagem")

      await item.click()
      await expect(page).toHaveURL(new RegExp(`/app/conversa/${CONVERSA}$`), {
        timeout: 30_000,
      })
      // É a conversa do aviso, lida pela sessão dona dela.
      await expect(page.locator('[data-mensagens="historico"]')).toContainText("Ainda dá tempo", {
        timeout: 30_000,
      })
    } finally {
      if (aviso !== null) {
        await servico.delete(`/rest/v1/notifications?id=eq.${aviso}`).catch(() => undefined)
      }
      await servico.dispose()
    }
  })

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
    await page.getByRole("button", { name: "Gravar preferências de avisos" }).click()
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
    await page.getByRole("button", { name: "Gravar preferências de avisos" }).click()
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
