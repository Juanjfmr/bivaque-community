import { expect, test } from "@playwright/test"

// DS-011: o destino da web foi trocado pelo app; a rota antiga não renderiza a
// navegação do shell e mantém o redirect 307 como contrato.
const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

test.describe("DS-011 — a rota antiga de avisos é redirecionada", () => {
  for (const width of [375, 1440]) {
    test(`/notifications responde 307 para /app/avisos em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const response = await fetch(`${APP_URL}/notifications`, { redirect: "manual" })
      expect(response.status).toBe(307)
      expect(new URL(response.headers.get("location") ?? "", APP_URL).pathname).toBe("/app/avisos")
    })
  }
})
