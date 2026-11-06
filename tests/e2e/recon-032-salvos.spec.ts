// LAN-TROCA fase 1: Salvos permanece na web; seu link abre a pergunta no app.
// O toggle do detalhe antigo saiu. A fixture usa a sessão sintética sob RLS.
import { expect, test } from "@playwright/test"
import { mintSession, restDelete, restInsert, seedAs } from "./helpers/recon032"
import { REQUEST_ID, REQUEST_TITLE, VISUAL_EMAIL } from "./helpers/recon032-fixtures"

test.describe("salvos preservados na web", { tag: "@stateful" }, () => {
  test("anônimo não vê a tela de salvos", async ({ page }) => {
    await page.goto("/salvos")
    await page.waitForURL(/\/app\/entrar/)
  })

  test("indicação salva abre o app e a remoção persiste na web", async ({ browser }) => {
    const sessao = await mintSession(VISUAL_EMAIL)
    const filtro = { user_id: `eq.${sessao.id}`, request_id: `eq.${REQUEST_ID}` }
    expect(await restDelete("recommendation_saves", sessao.accessToken, filtro)).toBe(true)
    await restInsert("recommendation_saves", sessao.accessToken, {
      user_id: sessao.id,
      request_id: REQUEST_ID,
    })
    const context = await browser.newContext()
    await seedAs(context, VISUAL_EMAIL)
    const page = await context.newPage()
    try {
      await page.goto("/salvos")
      const link = page.getByRole("link", { name: REQUEST_TITLE })
      await expect(link).toBeVisible()
      await expect(page.getByText("Salvo em", { exact: false })).toBeVisible()
      await expect(page.getByText("Outros", { exact: true })).toBeVisible()
      await expect(page.getByRole("tab", { name: "Indicações" })).toBeVisible()
      await expect(link).toHaveAttribute("href", new RegExp(`/indicacoes/${REQUEST_ID}$`))
      const busca = page.getByLabel("Buscar nos salvos")
      await busca.fill("encanador")
      await expect(link).toBeVisible()
      await busca.fill("zzz-inexistente")
      await expect(page.getByText("Nenhum item salvo corresponde à busca.")).toBeVisible()
      await busca.fill("")
      await link.click()
      await expect(page).toHaveURL(new RegExp(`/app/pergunta/${REQUEST_ID}$`))
      await expect(page.getByRole("heading", { level: 1, name: REQUEST_TITLE })).toBeVisible()
      await page.goto("/salvos")
      const removido = page.waitForResponse(
        (r) => r.url().includes("recommendation_saves") && r.request().method() === "DELETE",
      )
      const remover = page.getByRole("button", { name: /Remover dos salvos/ })
      await expect(remover).toHaveCount(1)
      await remover.click()
      expect((await removido).ok()).toBe(true)
      await expect(page.getByText("Nada salvo ainda")).toBeVisible()
      await expect(page.getByText(REQUEST_TITLE, { exact: true })).toHaveCount(0)
      await page.reload()
      await expect(link).toHaveCount(0)
    } finally {
      expect(await restDelete("recommendation_saves", sessao.accessToken, filtro)).toBe(true)
      // Mantém a fixture salva que a captura RECON-032 já usava após este ciclo.
      await restInsert("recommendation_saves", sessao.accessToken, {
        user_id: sessao.id,
        request_id: REQUEST_ID,
      })
      await context.close()
    }
  })
})
