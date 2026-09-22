// RECON-052 — contrato de UI da exclusão de conta (ADR-20260914-exclusao-de-conta).
//
// Este spec é DELIBERADAMENTE não destrutivo: ele nunca confirma o pedido,
// porque confirmar bane a conta e apaga a credencial de quem estiver logado —
// a conta compartilhada do seed, que outras suítes usam.
//
// O fluxo inteiro (sessão revogada, login bloqueado, perfil fora do Data API,
// purga recusada antes do vencimento e executada depois, denúncia anonimizada
// sobrevivendo, família intacta) é provado em runtime por
// .visual/prova-exclusao.mjs, com conta descartável: aquela prova precisa de SQL
// (o vencimento é fixture) e de uma conta que pode ser destruída, coisas que um
// spec de navegador não tem.
//
// O que sobra para cá é o que o CI consegue trancar em toda execução: a linha
// destrutiva existe, o aviso declara o que a tabela jurídica aprovou, e o
// botão de confirmar só habilita com a confirmação explícita marcada.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("configurações → conta: exclusão", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context)
  })

  test("a linha destrutiva e o aviso aprovado, sem apagar nada", async ({ page }) => {
    await page.goto("/configuracoes/conta")

    const linha = page.getByRole("button", { name: "Excluir conta" })
    await expect(linha).toBeVisible()
    await expect(page.getByText("A exclusão é permanente e não pode ser desfeita.")).toBeVisible()

    await linha.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // O que a tabela jurídica aprovada autoriza dizer — e nada além disso.
    // "15 dias" aparece duas vezes de propósito (o prazo da purga e o prazo de
    // resposta ao titular): o cabeçalho do bloco é o que identifica o primeiro.
    await expect(dialog.getByText("Em até 15 dias, contados do pedido:")).toBeVisible()
    await expect(dialog.getByText(/dados anonimizados/)).toBeVisible()
    await expect(dialog.getByText(/6 meses/)).toBeVisible()
    await expect(dialog.getByRole("link", { name: "Ajuda" })).toBeVisible()

    // Confirmação explícita: sem marcar, não há como pedir.
    const confirmar = dialog.getByRole("button", { name: "Solicitar exclusão" })
    await expect(confirmar).toBeDisabled()

    await dialog.getByText("Entendi que a exclusão é permanente e não pode ser desfeita.").click()
    await expect(confirmar).toBeEnabled()

    // Sai sem pedir: nada foi apagado e a tela continua oferecendo a exclusão.
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText("Exclusão solicitada")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Excluir conta" })).toBeVisible()
  })
})
