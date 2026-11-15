import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

const CONVERSA = "41000000-0000-4000-8000-000000000051"
const CONVERSA_ALHEIA = "41000000-0000-4000-8000-000000000023"
const CAPTURAS = join(process.cwd(), ".visual", "run-011")

/** A outra ponta da CONVERSA: o prestador semeado responde pelo app também. */
const OUTRA_PESSOA = "prestador-seed@bivaque.example.invalid"
const OUTRA_PESSOA_ID = "20000000-0000-4000-8000-00000000000a"
const ORIGEM = "http://127.0.0.1:3000"

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

test.describe("F09 — conversas reais", { tag: "@stateful" }, () => {
  test("caixa, conversa e resposta persistida; outra conversa é negada", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto("/messages")
    await expect(page).toHaveURL(/\/app\/conversas$/)
    const linha = page.locator(`[data-thread="${CONVERSA}"]`)
    await expect(linha).toBeVisible({ timeout: 30_000 })
    await capturar(page, testInfo.project.name, "caixa")
    await linha.getByRole("button").first().click()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText("Confirmado, 9h")
    const texto = `Resposta F09 ${testInfo.project.name} ${Date.now()}`
    await page.getByLabel("Mensagem", { exact: true }).fill(texto)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText(texto)
    await page.reload()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText(texto, {
      timeout: 30_000,
    })
    await capturar(page, testInfo.project.name, "conversa")
    const leitura = await page.request.get(`/api/app/conversas/${CONVERSA_ALHEIA}`)
    expect(leitura.status()).toBe(404)
    const escrita = await page.request.post(`/api/app/conversas/${CONVERSA_ALHEIA}/mensagens`, {
      headers: { origin: new URL(page.url()).origin, "x-bivaque-app": "bivaque-spa" },
      data: { texto: "Não deve ser gravada" },
    })
    expect(escrita.status()).toBe(404)
  })

  test("falha de envio conserva texto; falha de leitura oferece nova tentativa", async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    await page.goto(`/app/conversa/${CONVERSA}`)
    await expect(page.getByLabel("Mensagem", { exact: true })).toBeVisible({ timeout: 30_000 })
    await page.route("**/api/app/conversas/*/mensagens", (rota) => rota.abort())
    const texto = `Texto preservado ${testInfo.project.name} ${Date.now()}`
    await page.getByLabel("Mensagem", { exact: true }).fill(texto)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("Seu texto foi mantido")
    await expect(page.getByLabel("Mensagem", { exact: true })).toHaveValue(texto)
    await expect(page.locator('[data-mensagens="historico"]')).not.toContainText(texto)
    await page.unroute("**/api/app/conversas/*/mensagens")
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.locator('[data-mensagens="historico"]')).toContainText(texto)
    await page.route("**/api/app/conversas", (rota) => rota.abort())
    await page.goto("/app/conversas")
    await expect(page.locator('[data-estado="erro"]')).toBeVisible()
    await expect(page.getByText("Nenhuma conversa ainda")).toHaveCount(0)
    await page.unroute("**/api/app/conversas")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.locator(`[data-thread="${CONVERSA}"]`)).toBeVisible()
  })

  /**
   * F09-A — bloquear pelo app. Duas sessões de verdade: a da tela bloqueia, a
   * outra tenta escrever na mesma conversa. O efeito provado é o do banco
   * (`send_conversation_message` veta o par bloqueado nos dois sentidos); a
   * caixa e o histórico continuam legíveis, e ninguém é avisado do bloqueio.
   */
  test("bloquear fecha a escrita nos dois sentidos; desbloquear em Você reabre", async ({
    page,
    context,
    browser,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    const outra = await browser.newContext()
    try {
      await semearSessaoDeMembro(outra, OUTRA_PESSOA)
      await page.goto(`/app/conversa/${CONVERSA}`)
      await expect(page.locator('[data-mensagens="historico"]')).toContainText("Confirmado, 9h", {
        timeout: 30_000,
      })

      await page.getByRole("button", { name: "Opções da conversa" }).click()
      await page.getByRole("menuitem", { name: /^Bloquear / }).click()
      await page.getByRole("button", { name: "Bloquear", exact: true }).click()

      const bloqueada = page.locator('[data-conversa-bloqueada="sim"]')
      await expect(bloqueada).toContainText("fechada nos dois sentidos")
      await expect(bloqueada).toContainText("o histórico continua visível")
      await expect(bloqueada).toContainText("a pessoa não é avisada")
      await expect(page.locator('[data-compositor-conversa="sim"]')).toHaveCount(0)
      // A conversa não some: o histórico fica, e é isso que a frase promete.
      await expect(page.locator('[data-mensagens="historico"]')).toContainText("Confirmado, 9h")
      await capturar(page, testInfo.project.name, "bloqueada")

      // O estado vem do servidor, não da memória da tela.
      await page.reload()
      await expect(page.locator('[data-conversa-bloqueada="sim"]')).toBeVisible({
        timeout: 30_000,
      })

      const recusada = await outra.request.post(`/api/app/conversas/${CONVERSA}/mensagens`, {
        headers: { origin: ORIGEM, "x-bivaque-app": "bivaque-spa" },
        data: { texto: `Bloqueada ${Date.now()}` },
      })
      expect(recusada.status()).toBe(403)

      // O bloqueio do seed (seed.sql:1758) pertence a esta mesma pessoa: a lista
      // certa é a NOSSA linha sumir (mais recente = topo, created_at desc em
      // bloqueados/route.ts:29), nunca a tela ficar vazia.
      await page.goto("/app/bloqueados")
      const linhas = page.getByRole("button", { name: /Desbloquear/ })
      await expect(linhas.first()).toBeVisible({ timeout: 30_000 })
      const antes = await linhas.count()
      expect(antes).toBeGreaterThanOrEqual(2)
      await linhas.first().click()
      await expect(linhas).toHaveCount(antes - 1)

      const liberada = await outra.request.post(`/api/app/conversas/${CONVERSA}/mensagens`, {
        headers: { origin: ORIGEM, "x-bivaque-app": "bivaque-spa" },
        data: { texto: `Reaberta ${Date.now()}` },
      })
      expect(liberada.status()).toBe(201)
      await capturar(page, testInfo.project.name, "desbloqueada")
    } finally {
      // Se o teste falhar no meio, a próxima largura não herda o bloqueio.
      await page.request
        .delete(`/api/app/voce/bloqueados/${OUTRA_PESSOA_ID}`, {
          headers: { origin: ORIGEM, "x-bivaque-app": "bivaque-spa" },
        })
        .catch(() => undefined)
      await outra.close()
    }
  })
})
