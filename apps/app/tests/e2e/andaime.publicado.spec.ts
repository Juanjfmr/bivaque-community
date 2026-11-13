// O build publicado não tem andaime de prova (CORRETA-RODAPE-CASCA).
//
// Roda no projeto `publicado`, contra o `vite preview` do build — o artefato que
// vai ao ar, não o servidor de desenvolvimento. O parecer cego de 12/12 viu o
// rodapé de depuração da casca ("Liberar cargas pendentes") e os controles da
// tela de prova ("Abrir item-N") no build, porque o global do modo de prova
// religava o andaime. Aqui o global é ligado de propósito: o build tem de
// ignorá-lo.
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const janela = window as unknown as { __BIVAQUE_MODO_DE_PROVA__?: boolean }
    janela.__BIVAQUE_MODO_DE_PROVA__ = true
  })
})

test("com o global ligado, o build abre a tela real sem rodapé de depuração", async ({ page }) => {
  await page.goto("/app/salvos")
  await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
  await expect(page.locator('[data-tela="salvos"]')).toBeVisible()
  await expect(page.locator('[data-prova="controles-do-app"]')).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Liberar cargas pendentes" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^Abrir item-/ })).toHaveCount(0)
  await expect(page.getByText("Tela de prova", { exact: false })).toHaveCount(0)
})

test("a bancada do Mercado fica fora do build de uso normal", async ({ page }) => {
  await page.goto("/app/galeria/mercado")
  await expect(page.getByRole("heading", { name: "Página indisponível" })).toBeVisible()
  await expect(page.locator('[data-tela="mercado-lab"]')).toHaveCount(0)
})
