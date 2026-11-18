import { expect, test } from "@playwright/test"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

test("/notifications chega à caixa do app em 375, 768 e 1440 px, sem sessão", async ({ page }) => {
  const resposta = await fetch(`${BASE_URL}/notifications`, { redirect: "manual" })
  expect(resposta.status).toBe(307)
  const location = resposta.headers.get("location")
  expect(location).toBeTruthy()
  expect(new URL(location ?? "", BASE_URL).pathname).toBe("/app/avisos")

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/notifications")
    await expect(page).toHaveURL(/\/app\/avisos$/)
    await expect(page.locator('[data-estado="sessao-vencida"]')).toBeVisible()
  }
})
