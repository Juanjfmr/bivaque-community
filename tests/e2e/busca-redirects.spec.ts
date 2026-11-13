import { expect, test } from "@playwright/test"

const BASE_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"

test("/explorar/busca leva ao app com o termo em 375, 768 e 1440 px, sem sessão", async ({
  page,
}) => {
  const caminho = "/explorar/busca?q=escola"
  const resposta = await fetch(`${BASE_URL}${caminho}`, { redirect: "manual" })
  expect(resposta.status).toBe(307)
  const location = resposta.headers.get("location")
  expect(location).toBeTruthy()
  const destino = new URL(location ?? "", BASE_URL)
  expect(destino.pathname).toBe("/app/busca")
  expect(destino.searchParams.get("q")).toBe("escola")

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(caminho)
    await expect(page).toHaveURL(/\/app\/busca\?q=escola$/)
    const erro = page.locator('[data-estado="erro"]')
    await expect(erro).toBeVisible()
    await expect(erro.getByText("Não foi possível carregar")).toBeVisible()
    await expect(erro.getByText("Confira a conexão e tente de novo.")).toBeVisible()
  }
})
