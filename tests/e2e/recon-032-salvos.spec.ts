// RECON-032 — ciclo de Salvos (prancha 54, painel direito; spec C09).
// Estado compartilhado: o spec deixa o pedido do seed SALVO ao final, que é a
// fixture da captura /salvos. Idempotente por construção: começa limpando.
//
// Localizadores: o seed tem UM pedido de indicação e nenhum outro botão
// "Salvar" visível em /recommendations (o de edição só existe para o autor).
// O spec afirma essa unicidade (toHaveCount(1)) em vez de assumi-la — se o
// seed ganhar outro pedido, ele falha alto em vez de clicar no card errado.

import { expect, test } from "@playwright/test"
import { seedAs } from "./helpers/recon032"
import { REQUEST_ID, REQUEST_TITLE, VISUAL_EMAIL } from "./helpers/recon032-fixtures"

test.describe("salvos: origem, destino e remoção", () => {
  test("anonimo nao ve a tela de salvos", async ({ page }) => {
    await page.goto("/salvos")
    await page.waitForURL(/\/login/)
  })

  test("salvar na origem aparece em Salvos; remover reflete na origem", async ({ browser }) => {
    const context = await browser.newContext()
    await seedAs(context, VISUAL_EMAIL)
    const page = await context.newPage()

    // ── estado inicial honesto: limpa qualquer resto de execução anterior ──
    await page.goto("/salvos")
    await expect(page.getByRole("heading", { name: "Salvos" })).toBeVisible()
    const leftovers = page.getByRole("button", { name: /Remover dos salvos/ })
    if ((await leftovers.count()) > 0) {
      await leftovers.first().click()
    }

    // ── salvar na origem ─────────────────────────────────────────────────────
    await page.goto("/recommendations")
    await expect(page.getByText(REQUEST_TITLE, { exact: true })).toBeVisible({
      timeout: 15_000,
    })
    // O estado do toggle vem do servidor; se sobrou um salvamento de execucao
    // anterior, ele abre como "Salvo" e precisa voltar a "Salvar" antes do
    // ciclo deste spec.
    const saveToggle = page.getByRole("button", { name: /^Salv/ })
    await expect(saveToggle).toHaveCount(1, { timeout: 10_000 })
    if ((await saveToggle.textContent())?.trim().startsWith("Salvo")) {
      await saveToggle.click()
      await expect(saveToggle).toHaveText("Salvar", { timeout: 10_000 })
    }
    await saveToggle.click()
    await expect(saveToggle).toHaveText("Salvo", { timeout: 10_000 })

    // ── o que foi guardado está no destino, com tipo e conteúdo reais ───────
    await page.goto("/salvos")
    await expect(page.getByRole("link", { name: REQUEST_TITLE })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText("Salvo em", { exact: false })).toBeVisible({ timeout: 10_000 })
    // chip do tipo do pedido (categoria real do seed: "outros") e a aba do
    // tipo salvavel — a prancha chama cada tipo pelo nome
    await expect(page.getByText("Outros", { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole("tab", { name: "Indicações" })).toBeVisible()

    // abrir leva ao destino real do pedido
    await expect(page.getByRole("link", { name: REQUEST_TITLE })).toHaveAttribute(
      "href",
      new RegExp(`/recommendations\\?focus=${REQUEST_ID}`),
    )

    // ── busca da prancha ─────────────────────────────────────────────────────
    const search = page.getByLabel("Buscar nos salvos")
    await search.fill("encanador")
    await expect(page.getByRole("link", { name: REQUEST_TITLE })).toBeVisible()
    await search.fill("zzz-inexistente")
    await expect(page.getByText("Nenhum item salvo corresponde à busca.")).toBeVisible()
    await search.fill("")

    // ── remover no destino reflete na origem (sincronismo nos dois sentidos) ─
    const removeButtons = page.getByRole("button", { name: /Remover dos salvos/ })
    await expect(removeButtons).toHaveCount(1)
    await removeButtons.first().click()
    await expect(page.getByText("Nada salvo ainda")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(REQUEST_TITLE, { exact: true })).toHaveCount(0)

    await page.goto("/recommendations")
    await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeVisible({
      timeout: 10_000,
    })

    // ── restaura a fixture para a captura visual ─────────────────────────────
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(page.getByRole("button", { name: "Salvo", exact: true })).toBeVisible({
      timeout: 10_000,
    })

    await context.close()
  })
})
