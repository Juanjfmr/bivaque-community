// RECON-032 — denunciar e acompanhar (prancha 56, painel esquerdo + direito;
// spec C10). Idempotente: se sobrar uma denuncia aberta da execucao anterior
// contra o mesmo alvo, o spec fecha-a pelo caminho real de operador antes de
// reabrir — o indice parcial reports_one_open_per_reporter_target_idx nao e
// para contornar, e para o fluxo de recomeco ficar verde.

import { expect, test } from "@playwright/test"
import { mintSession, resolveReportAsOperator, restSelect, seedAs } from "./helpers/recon032"
import {
  MEMBRO_1_EMAIL,
  OPERADOR_EMAIL,
  REPORT_TARGET_POST_ID,
  VISUAL_EMAIL,
} from "./helpers/recon032-fixtures"

test.describe("denuncia do membro: dialog, recibo e acompanhamento", () => {
  test("anonimo nao abre o dialog de denuncia", async ({ page }) => {
    await page.goto(`/denuncias/nova?tipo=post&id=${REPORT_TARGET_POST_ID}`)
    await page.waitForURL(/\/login/)
  })

  test("tipo fora do vocabulario nao desenha formulario", async ({ browser }) => {
    const context = await browser.newContext()
    await seedAs(context, VISUAL_EMAIL)
    const page = await context.newPage()
    await page.goto("/denuncias/nova?tipo=profile&id=80000000-0000-4000-8000-000000000001")
    await expect(page.getByText("Conteúdo não encontrado")).toBeVisible()
    await expect(page.getByRole("radio")).toHaveCount(0)
    await context.close()
  })

  test("alvo que o membro nao ve nao vira denuncia na fila", async ({ browser }) => {
    const context = await browser.newContext()
    await seedAs(context, VISUAL_EMAIL)
    const page = await context.newPage()
    await page.goto("/denuncias/nova?tipo=post&id=00000000-0000-0000-0000-000000000099")
    await expect(page.getByText("Conteúdo não encontrado")).toBeVisible()
    await context.close()
  })

  test("denuncia, recibo apos persistencia, acompanhamento e retorno", async ({ browser }) => {
    const visual = await mintSession(VISUAL_EMAIL)
    const operador = await mintSession(OPERADOR_EMAIL)

    // deixa o alvo livre para nova denuncia, fechando o que sobrou de antes
    const leftovers = await restSelect<{ id: string }>("reports", visual.accessToken, {
      target_id: `eq.${REPORT_TARGET_POST_ID}`,
      status: "eq.open",
    })
    for (const row of leftovers) {
      await resolveReportAsOperator(row.id, operador)
    }

    const context = await browser.newContext()
    await seedAs(context, VISUAL_EMAIL)
    const page = await context.newPage()

    const explanation = `linguagem ofensiva nos comentarios ${Date.now().toString(36)}`

    // ── o dialog da prancha 56 ───────────────────────────────────────────────
    await page.goto(`/denuncias/nova?tipo=post&id=${REPORT_TARGET_POST_ID}`)
    await expect(page.getByRole("heading", { name: "Denunciar publicação" })).toBeVisible()
    await expect(page.getByText("Por que você está denunciando esta publicação?")).toBeVisible()
    for (const reason of ["Spam", "Conteúdo inadequado", "Informação enganosa", "Outro"]) {
      await expect(page.getByRole("radio", { name: reason })).toBeVisible()
    }
    await expect(page.getByText(`0/300`)).toBeVisible()
    const send = page.getByRole("button", { name: "Enviar denúncia" })
    await expect(send).toBeDisabled()

    await page.getByLabel("Explique (opcional)").fill(explanation)
    await expect(page.getByText(`${explanation.length}/300`)).toBeVisible()
    await page
      .locator('label[data-slot="radio-content"]')
      .filter({ hasText: "Conteúdo inadequado" })
      .click()
    await expect(send).toBeEnabled()

    // ── recibo so depois de persistir ────────────────────────────────────────
    // Escopo no titulo do alerta embutido: o toast de sucesso repete a mesma
    // frase, e so o alerta prova que o formulario virou estado de recibo.
    const receipt = page.locator('[data-slot="alert-title"]', { hasText: "Denúncia enviada." })
    await expect(receipt).toHaveCount(0)
    await send.click()
    await expect(receipt).toBeVisible({ timeout: 10_000 })

    const created = await restSelect<{ id: string; reason: string; status: string }>(
      "reports",
      visual.accessToken,
      { target_id: `eq.${REPORT_TARGET_POST_ID}`, order: "created_at.desc", limit: "1" },
    )
    expect(created).toHaveLength(1)
    const report = created[0]
    if (!report) throw new Error("denuncia criada nao visivel ao denunciante")
    expect(report.status).toBe("open")
    expect(report.reason).toBe(`Conteúdo inadequado: ${explanation}`)

    // ── acompanhamento: situacao, motivo e a propria explicacao ─────────────
    await page.getByRole("link", { name: "Acompanhar esta denúncia" }).click()
    await expect(page).toHaveURL(new RegExp(`/denuncias/${report.id}$`))
    await expect(page.getByText("Em análise")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Motivo da denúncia" })).toBeVisible()
    await expect(page.getByText("Conteúdo inadequado", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Sua explicação" })).toBeVisible()
    await expect(page.getByText(explanation)).toBeVisible()

    // ── a lista mostra o cartao com expansao ─────────────────────────────────
    await page.goto("/denuncias")
    await expect(page.getByRole("heading", { name: "Confiança e privacidade" })).toBeVisible()
    const card = page.locator("li").filter({ hasText: "Denúncia enviada em" }).first()
    await expect(card.getByText("Em análise")).toBeVisible()
    await card.getByRole("button", { name: "Expandir detalhes da denúncia" }).click()
    await expect(card.getByText("Motivo da denúncia")).toBeVisible()
    await expect(card.getByText(explanation)).toBeVisible()

    // ── decisao do operador: situacao acompanha, resultado interno nao vaza ─
    await resolveReportAsOperator(report.id, operador)
    await page.reload()
    await expect(card.getByText("Resolvida")).toBeVisible()
    await expect(page.getByText(/ciclo E2E RECON-032/)).toHaveCount(0)
    await expect(page.getByText(/hide|dismiss|ocultar/i)).toHaveCount(0)

    // membro-1 nao pode ver a denuncia alheia por URL. A pagina streama, entao
    // a prova e o conteudo: o segmento responde com o not-found da casa e
    // nada da denuncia aparece.
    const otherContext = await browser.newContext()
    await seedAs(otherContext, MEMBRO_1_EMAIL)
    const otherPage = await otherContext.newPage()
    await otherPage.goto(`/denuncias/${report.id}`)
    await expect(otherPage.getByText("Página não encontrada")).toBeVisible({ timeout: 10_000 })
    await expect(otherPage.getByText(explanation)).toHaveCount(0)
    await expect(otherPage.getByText("Motivo da denúncia")).toHaveCount(0)
    await otherContext.close()
    await context.close()
  })
})
