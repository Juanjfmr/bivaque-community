// RECON-052 — contrato de UI da exclusão de conta (ADR-20260914-exclusao-de-conta).
//
// RUN-184: a tela de conta saiu da web inteira (`(shell)/configuracoes/conta`, hoje
// 307 para /app/voce) e o aviso aprovado vive em /app/apagar-conta. O spec migrou com
// ele: aqui se prova o endereço antigo caindo no app, o texto que a tabela jurídica
// autoriza dizer e a confirmação digitada.
//
// Este spec continua DELIBERADAMENTE não destrutivo: confirmar o pedido bane a conta e
// apaga a credencial de quem estiver logado — a conta compartilhada do seed, que outras
// suítes usam. O POST que bania a conta é respondido pelo próprio spec (a rota tem dono
// e prova em tests/unit/app-api/voce, e o pedido de verdade é idempotente do lado do
// banco), então nada é apagado por aqui.
//
// O fluxo destrutivo inteiro (sessão revogada, login bloqueado, perfil fora do Data API,
// purga recusada antes do vencimento e executada depois, denúncia anonimizada
// sobrevivendo, família intacta) é provado em runtime por .visual/prova-exclusao.mjs,
// com conta descartável: aquela prova precisa de SQL (o vencimento é fixture) e de uma
// conta que pode ser destruída, coisas que um spec de navegador não tem.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("apagar a conta no app", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context)
  })

  test("o endereço antigo de conta cai no Você do app", async ({ page }) => {
    await page.goto("/configuracoes/conta")
    await expect(page).toHaveURL(/\/app\/voce$/)
  })

  test("o aviso aprovado e o pedido registrado, sem apagar nada", async ({ page }) => {
    await page.goto("/app/apagar-conta")
    const tela = page.locator('[data-tela="apagar-conta"]')
    await expect(tela.getByRole("heading", { level: 1, name: "Apagar a conta" })).toBeVisible()
    await expect(tela.getByText("A exclusão é permanente e não pode ser desfeita.")).toBeVisible()

    // O que a tabela jurídica aprovada autoriza dizer — e nada além disso.
    await expect(tela.getByText("Ao confirmar, agora:")).toBeVisible()
    await expect(tela.getByText(/sua sessão é encerrada/)).toBeVisible()
    // "15 dias" aparece duas vezes de propósito (o prazo da purga e o prazo de
    // resposta ao titular): o cabeçalho do bloco é o que identifica o primeiro.
    await expect(tela.getByText("Em até 15 dias, contados do pedido:")).toBeVisible()
    await expect(tela.getByText(/dados anonimizados/)).toBeVisible()
    await expect(tela.getByText(/6 meses/)).toBeVisible()
    await expect(tela.getByText(/MCI, art\. 15/)).toBeVisible()
    await expect(tela.getByRole("button", { name: "Abrir a Ajuda" })).toBeVisible()

    // Confirmação explícita: sem a palavra digitada, não há como pedir.
    const linha = tela.getByRole("button", { name: "Apagar minha conta" })
    await expect(linha).toBeDisabled()

    // O POST de verdade bania a conta do seed: a resposta do servidor é simulada aqui.
    await page.route("**/api/app/voce/apagar-conta", (rota) =>
      rota.fulfill({
        json: {
          pedido: { solicitadoEm: "2026-11-21T12:00:00.000Z", prazoEm: "2026-12-06T12:00:00.000Z" },
          pendente: true,
        },
      }),
    )

    await tela.getByLabel("Escreva APAGAR para confirmar").fill("APAGAR")
    await expect(linha).toBeEnabled()
    await linha.click()

    const estado = tela.locator('[role="status"]')
    await expect(estado).toContainText("Pedido registrado")
    // O prazo é o que o banco devolveu, por extenso — nunca um número inventado aqui.
    await expect(estado).toContainText("6 de dezembro de 2026")
    // "Pedido registrado" fica na própria tela e a ação sai de novo (ADR do lote).
    await expect(page).toHaveURL(/\/app\/apagar-conta$/)
    await expect(linha).toBeDisabled()
  })
})
