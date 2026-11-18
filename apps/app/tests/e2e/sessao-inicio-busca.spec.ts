import { expect, test } from "@playwright/test"

for (const tela of ["inicio", "busca?q=escola"]) {
  test(`sessão vencida em ${tela} leva à entrada`, async ({ page }) => {
    await page.route("**/api/app/**", (rota) =>
      rota.fulfill({ status: 401, json: { error: "unauthorized" } }),
    )
    await page.goto(`/app/${tela}`)
    await expect(page.locator('[data-estado="sessao-vencida"]')).toBeVisible()
    await page.getByRole("button", { name: "Entrar de novo" }).click()
    await expect(page).toHaveURL(/\/app\/entrar/)
  })
}

for (const tela of ["inicio", "busca?q=escola"]) {
  test(`acesso negado em ${tela}`, async ({ page }) => {
    await page.route("**/api/app/**", (rota) => rota.fulfill({ status: 403 }))
    await page.goto(`/app/${tela}`)
    await expect(page.locator('[data-estado="negado"]')).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0)
  })

  test(`falha de rede em ${tela} oferece nova tentativa`, async ({ page }) => {
    await page.route("**/api/app/**", (rota) => rota.abort())
    await page.goto(`/app/${tela}`)
    await expect(page.locator('[data-estado="erro"]')).toBeVisible()
    await expect(page.locator('[data-estado="sessao-vencida"]')).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible()
  })
}
